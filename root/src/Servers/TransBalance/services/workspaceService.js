const { createHash, randomBytes, randomUUID } = require('crypto');

const createHttpError = require('../utils/httpError');
const { InvitationEmailService } = require('./invitationEmailService');
const { MongooseWorkspaceRepository } = require('./workspaceRepository');

const ACTIVE_STATUS = 'active';
const VALID_ROLES = new Set(['owner', 'admin', 'member', 'viewer']);
const VALID_STATUSES = new Set(['active', 'invited', 'removed']);
const VALID_INVITATION_ROLES = new Set(['admin', 'member', 'viewer']);
const ACTIVE_INVITATION_STATUS = 'invited';
const PUSH_ROLES = new Set(['owner', 'admin', 'member']);
const PULL_ROLES = new Set(['owner', 'admin', 'member', 'viewer']);
const ADMIN_ROLES = new Set(['owner', 'admin']);

const nowIso = () => new Date().toISOString();

const normalizeRole = (role = 'member') =>
  VALID_ROLES.has(role) ? role : 'member';

const normalizeStatus = (status = ACTIVE_STATUS) =>
  VALID_STATUSES.has(status) ? status : ACTIVE_STATUS;

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

const normalizeInvitationRole = (role = 'member') =>
  VALID_INVITATION_ROLES.has(role) ? role : 'member';

const createGroupId = () => `workspace_${randomUUID()}`;
const createInvitationId = () => `invitation_${randomUUID()}`;
const createInviteToken = () => randomBytes(32).toString('base64url');
const hashInviteToken = (token) =>
  createHash('sha256').update(String(token || '')).digest('hex');

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const isDevInviteLinkAllowed = () =>
  String(process.env.EXPOSE_DEV_INVITE_LINKS || '').toLowerCase() === 'true';

const getInvitationBaseUrl = () =>
  String(
    process.env.INVITATION_BASE_URL ||
      process.env.PUBLIC_APP_URL ||
      'isabake://invite',
  ).replace(/\/+$/, '');

const createInviteLink = (token) => `${getInvitationBaseUrl()}/${token}`;

const sanitizeInvitation = (invitation = {}, extra = {}) => {
  const safe = {
    acceptedAt: invitation.acceptedAt || null,
    declinedAt: invitation.declinedAt || null,
    email: invitation.email || null,
    expiresAt: invitation.expiresAt || null,
    groupId: invitation.groupId || null,
    invitationId: invitation.invitationId || null,
    inviteAcceptedFromTokenAt: invitation.inviteAcceptedFromTokenAt || null,
    inviteLinkCreatedAt: invitation.inviteLinkCreatedAt || null,
    inviteTokenExpiresAt: invitation.inviteTokenExpiresAt || null,
    invitedByUserId: invitation.invitedByUserId || null,
    invitedUserId: invitation.invitedUserId || null,
    role: invitation.role || 'member',
    status: invitation.status || ACTIVE_INVITATION_STATUS,
    workspaceId: invitation.workspaceId || null,
  };

  if (extra.devInviteLink && isDevInviteLinkAllowed()) {
    safe.devInviteLink = extra.devInviteLink;
  }

  return safe;
};

const sanitizeInvitationPreview = ({ invitation, inviter, workspace }) => ({
  email: invitation.email || null,
  expiresAt: invitation.expiresAt || null,
  inviteTokenExpiresAt: invitation.inviteTokenExpiresAt || null,
  invitedBy: inviter
    ? {
        displayName: inviter.displayName || null,
        email: inviter.email || null,
      }
    : null,
  role: invitation.role || 'member',
  status: invitation.status || ACTIVE_INVITATION_STATUS,
  workspace: workspace
    ? {
        groupId: workspace.groupId || null,
        name: workspace.name || 'Workspace compartido',
      }
    : null,
});

class WorkspaceService {
  constructor(repository = new MongooseWorkspaceRepository(), options = {}) {
    this.repository = repository;
    this.emailService =
      options.emailService || new InvitationEmailService();
  }

  async upsertDevUser({ displayName, email, userId }) {
    if (!userId) {
      throw createHttpError(400, 'userId_required');
    }

    return this.repository.upsertUser({
      authProvider: 'dev-header',
      displayName: displayName || email || userId,
      email: email || `${userId}@dev.local`,
      userId,
    });
  }

  async createWorkspace({ name, ownerUserId, groupId, workspaceId }) {
    if (!ownerUserId) {
      throw createHttpError(401, 'auth_required');
    }

    const id = groupId || workspaceId || createGroupId();
    const existingWorkspace = await this.repository.findWorkspaceByGroupId(id);

    if (existingWorkspace) {
      const membership = await this.repository.findMembership({
        groupId: existingWorkspace.groupId,
        userId: ownerUserId,
      });

      if (membership?.status === ACTIVE_STATUS) {
        return existingWorkspace;
      }

      throw createHttpError(409, 'workspace_already_exists');
    }

    const workspace = await this.repository.createWorkspace({
      groupId: id,
      name: name || 'Workspace compartido',
      ownerUserId,
      workspaceId: workspaceId || id,
    });

    await this.repository.upsertMembership({
      groupId: workspace.groupId,
      role: 'owner',
      status: ACTIVE_STATUS,
      userId: ownerUserId,
      workspaceId: workspace.workspaceId,
    });

    return workspace;
  }

  async listWorkspacesForUser(userId) {
    const memberships = await this.repository.findActiveMembershipsByUserId(
      userId,
    );
    const workspaces = [];

    for (const membership of memberships) {
      const workspace = await this.repository.findWorkspaceByGroupId(
        membership.groupId,
      );

      if (workspace) {
        workspaces.push({
          ...workspace,
          membership: {
            role: membership.role,
            status: membership.status,
          },
        });
      }
    }

    return workspaces;
  }

  async getWorkspaceForUser({ groupId, userId }) {
    await this.requireWorkspaceMember(groupId, userId);
    return this.repository.findWorkspaceByGroupId(groupId);
  }

  async getMembers({ groupId, requesterUserId }) {
    const requesterRole = await this.getUserWorkspaceRole(
      groupId,
      requesterUserId,
    );

    if (!ADMIN_ROLES.has(requesterRole)) {
      throw createHttpError(403, 'workspace_admin_required');
    }

    return this.repository.findMembershipsByGroupId(groupId);
  }

  async addMember({
    groupId,
    requesterUserId,
    role = 'member',
    status = ACTIVE_STATUS,
    userId,
    email,
    displayName,
  }) {
    const requesterRole = await this.getUserWorkspaceRole(
      groupId,
      requesterUserId,
    );

    if (!ADMIN_ROLES.has(requesterRole)) {
      throw createHttpError(403, 'workspace_admin_required');
    }

    const workspace = await this.repository.findWorkspaceByGroupId(groupId);

    if (!workspace) {
      throw createHttpError(404, 'workspace_not_found');
    }

    const memberUserId = userId || email;

    if (!memberUserId) {
      throw createHttpError(400, 'member_user_required');
    }

    await this.upsertDevUser({
      displayName,
      email: email || `${memberUserId}@dev.local`,
      userId: memberUserId,
    });

    return this.repository.upsertMembership({
      groupId,
      role: normalizeRole(role),
      status: normalizeStatus(status),
      userId: memberUserId,
      workspaceId: workspace.workspaceId,
    });
  }

  async countActiveOwners(groupId) {
    const memberships = await this.repository.findMembershipsByGroupId(groupId);

    return memberships.filter(
      (membership) =>
        membership.role === 'owner' && membership.status === ACTIVE_STATUS,
    ).length;
  }

  async assertNotLastOwnerChange({ groupId, nextRole, nextStatus, target }) {
    if (target.role !== 'owner' || target.status !== ACTIVE_STATUS) {
      return;
    }

    const keepsOwner =
      normalizeRole(nextRole || target.role) === 'owner' &&
      normalizeStatus(nextStatus || target.status) === ACTIVE_STATUS;

    if (keepsOwner) {
      return;
    }

    const activeOwnerCount = await this.countActiveOwners(groupId);

    if (activeOwnerCount <= 1) {
      throw createHttpError(409, 'last_owner_required');
    }
  }

  async updateMember({
    groupId,
    requesterUserId,
    role,
    status,
    userId,
  }) {
    const requesterRole = await this.getUserWorkspaceRole(
      groupId,
      requesterUserId,
    );

    if (!ADMIN_ROLES.has(requesterRole)) {
      throw createHttpError(403, 'workspace_admin_required');
    }

    const target = await this.repository.findMembership({ groupId, userId });

    if (!target) {
      throw createHttpError(404, 'workspace_member_not_found');
    }

    await this.assertNotLastOwnerChange({
      groupId,
      nextRole: role,
      nextStatus: status,
      target,
    });

    return this.repository.updateMembership(
      { groupId, userId },
      {
        ...target,
        role: role ? normalizeRole(role) : target.role,
        status: status ? normalizeStatus(status) : target.status,
      },
    );
  }

  async removeMember({ groupId, requesterUserId, userId }) {
    return this.updateMember({
      groupId,
      requesterUserId,
      status: 'removed',
      userId,
    });
  }

  async leaveWorkspace({ groupId, userId }) {
    const target = await this.repository.findMembership({ groupId, userId });

    if (!target || target.status !== ACTIVE_STATUS) {
      throw createHttpError(403, 'workspace_membership_required');
    }

    await this.assertNotLastOwnerChange({
      groupId,
      nextStatus: 'removed',
      target,
    });

    return this.repository.updateMembership(
      { groupId, userId },
      {
        ...target,
        status: 'removed',
      },
    );
  }

  async createInvitation({
    email,
    expiresAt,
    groupId,
    requesterUserId,
    role = 'member',
  }) {
    const requesterRole = await this.getUserWorkspaceRole(
      groupId,
      requesterUserId,
    );

    if (!ADMIN_ROLES.has(requesterRole)) {
      throw createHttpError(403, 'workspace_admin_required');
    }

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      throw createHttpError(400, 'invitation_email_required');
    }

    const workspace = await this.repository.findWorkspaceByGroupId(groupId);

    if (!workspace) {
      throw createHttpError(404, 'workspace_not_found');
    }

    const token = createInviteToken();
    const inviteLink = createInviteLink(token);
    const inviteTokenExpiresAt =
      expiresAt || addDays(new Date(), 7).toISOString();
    const linkFields = {
      inviteLinkCreatedAt: nowIso(),
      inviteTokenExpiresAt,
      inviteTokenHash: hashInviteToken(token),
    };

    const existingInvitation =
      await this.repository.findActiveInvitationByEmail({
        email: normalizedEmail,
        groupId,
      });

    if (existingInvitation) {
      const rotatedInvitation = await this.repository.updateInvitation(
        existingInvitation.invitationId,
        {
          ...existingInvitation,
          ...linkFields,
        },
      );
      await this.emailService.sendWorkspaceInvitationEmail({
        inviteLink,
        role: rotatedInvitation.role,
        to: rotatedInvitation.email,
        workspaceName: workspace.name,
      });
      return sanitizeInvitation(rotatedInvitation, { devInviteLink: inviteLink });
    }

    const existingUser = await this.repository.findUserByEmail(normalizedEmail);

    const invitation = await this.repository.createInvitation({
      email: normalizedEmail,
      expiresAt: expiresAt || null,
      groupId,
      ...linkFields,
      invitationId: createInvitationId(),
      invitedByUserId: requesterUserId,
      invitedUserId: existingUser?.userId || null,
      role: normalizeInvitationRole(role),
      status: ACTIVE_INVITATION_STATUS,
      workspaceId: workspace.workspaceId,
    });

    await this.emailService.sendWorkspaceInvitationEmail({
      inviteLink,
      role: invitation.role,
      to: invitation.email,
      workspaceName: workspace.name,
    });

    return sanitizeInvitation(invitation, { devInviteLink: inviteLink });
  }

  async listWorkspaceInvitations({ groupId, requesterUserId }) {
    const requesterRole = await this.getUserWorkspaceRole(
      groupId,
      requesterUserId,
    );

    if (!ADMIN_ROLES.has(requesterRole)) {
      throw createHttpError(403, 'workspace_admin_required');
    }

    const invitations = await this.repository.findInvitationsByGroupId(groupId);
    return invitations.map((invitation) => sanitizeInvitation(invitation));
  }

  async listMyInvitations({ email, userId }) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail && !userId) {
      throw createHttpError(401, 'auth_required');
    }

    const invitations = normalizedEmail
      ? await this.repository.findInvitationsByEmail(normalizedEmail)
      : [];

    return invitations
      .filter(
        (invitation) =>
          invitation.status === ACTIVE_INVITATION_STATUS ||
          invitation.invitedUserId === userId,
      )
      .map((invitation) => sanitizeInvitation(invitation));
  }

  async assertInvitationCanBeAccepted(invitation) {
    if (!invitation) {
      throw createHttpError(404, 'invitation_not_found');
    }

    if (invitation.status !== ACTIVE_INVITATION_STATUS) {
      throw createHttpError(409, 'invitation_not_active');
    }

    if (invitation.expiresAt && new Date(invitation.expiresAt) <= new Date()) {
      await this.repository.updateInvitation(invitation.invitationId, {
        ...invitation,
        status: 'expired',
      });
      throw createHttpError(409, 'invitation_expired');
    }
  }

  async acceptInvitation({ email, invitationId, userId }) {
    const invitation = await this.repository.findInvitationById(invitationId);

    await this.assertInvitationCanBeAccepted(invitation);

    const normalizedEmail = normalizeEmail(email);

    if (normalizeEmail(invitation.email) !== normalizedEmail) {
      throw createHttpError(403, 'invitation_email_mismatch');
    }

    await this.repository.upsertMembership({
      groupId: invitation.groupId,
      role: normalizeInvitationRole(invitation.role),
      status: ACTIVE_STATUS,
      userId,
      workspaceId: invitation.workspaceId,
    });

    const updatedInvitation = await this.repository.updateInvitation(invitation.invitationId, {
      ...invitation,
      acceptedAt: nowIso(),
      invitedUserId: userId,
      status: 'accepted',
    });

    return sanitizeInvitation(updatedInvitation);
  }

  async declineInvitation({ email, invitationId, userId }) {
    const invitation = await this.repository.findInvitationById(invitationId);

    if (!invitation) {
      throw createHttpError(404, 'invitation_not_found');
    }

    const normalizedEmail = normalizeEmail(email);

    if (normalizeEmail(invitation.email) !== normalizedEmail) {
      throw createHttpError(403, 'invitation_email_mismatch');
    }

    if (invitation.status !== ACTIVE_INVITATION_STATUS) {
      throw createHttpError(409, 'invitation_not_active');
    }

    const updatedInvitation = await this.repository.updateInvitation(invitation.invitationId, {
      ...invitation,
      declinedAt: nowIso(),
      invitedUserId: userId,
      status: 'declined',
    });

    return sanitizeInvitation(updatedInvitation);
  }

  async revokeInvitation({ groupId, invitationId, requesterUserId }) {
    const requesterRole = await this.getUserWorkspaceRole(
      groupId,
      requesterUserId,
    );

    if (!ADMIN_ROLES.has(requesterRole)) {
      throw createHttpError(403, 'workspace_admin_required');
    }

    const invitation = await this.repository.findInvitationById(invitationId);

    if (!invitation || invitation.groupId !== groupId) {
      throw createHttpError(404, 'invitation_not_found');
    }

    if (invitation.status !== ACTIVE_INVITATION_STATUS) {
      return sanitizeInvitation(invitation);
    }

    const updatedInvitation = await this.repository.updateInvitation(invitation.invitationId, {
      ...invitation,
      status: 'revoked',
    });

    return sanitizeInvitation(updatedInvitation);
  }

  async findInvitationByToken(token) {
    if (!token) {
      throw createHttpError(400, 'invitation_token_required');
    }

    const invitation = await this.repository.findInvitationByTokenHash(
      hashInviteToken(token),
    );

    if (!invitation) {
      throw createHttpError(404, 'invitation_not_found');
    }

    return invitation;
  }

  async assertInvitationTokenIsActive(invitation) {
    await this.assertInvitationCanBeAccepted(invitation);

    if (
      invitation.inviteTokenExpiresAt &&
      new Date(invitation.inviteTokenExpiresAt) <= new Date()
    ) {
      await this.repository.updateInvitation(invitation.invitationId, {
        ...invitation,
        status: 'expired',
      });
      throw createHttpError(409, 'invitation_token_expired');
    }
  }

  async getInvitationPreviewByToken(token) {
    const invitation = await this.findInvitationByToken(token);
    await this.assertInvitationTokenIsActive(invitation);

    const workspace = await this.repository.findWorkspaceByGroupId(
      invitation.groupId,
    );
    const inviter = await this.repository.findUserByUserId(
      invitation.invitedByUserId,
    );

    return sanitizeInvitationPreview({ invitation, inviter, workspace });
  }

  async acceptInvitationByToken({ email, token, userId }) {
    const invitation = await this.findInvitationByToken(token);
    await this.assertInvitationTokenIsActive(invitation);

    const normalizedEmail = normalizeEmail(email);

    if (normalizeEmail(invitation.email) !== normalizedEmail) {
      throw createHttpError(403, 'invitation_email_mismatch');
    }

    await this.repository.upsertMembership({
      groupId: invitation.groupId,
      role: normalizeInvitationRole(invitation.role),
      status: ACTIVE_STATUS,
      userId,
      workspaceId: invitation.workspaceId,
    });

    const updatedInvitation = await this.repository.updateInvitation(
      invitation.invitationId,
      {
        ...invitation,
        acceptedAt: nowIso(),
        inviteAcceptedFromTokenAt: nowIso(),
        invitedUserId: userId,
        status: 'accepted',
      },
    );

    return sanitizeInvitation(updatedInvitation);
  }

  async declineInvitationByToken({ email, token, userId }) {
    const invitation = await this.findInvitationByToken(token);
    await this.assertInvitationTokenIsActive(invitation);

    const normalizedEmail = normalizeEmail(email);

    if (normalizeEmail(invitation.email) !== normalizedEmail) {
      throw createHttpError(403, 'invitation_email_mismatch');
    }

    const updatedInvitation = await this.repository.updateInvitation(
      invitation.invitationId,
      {
        ...invitation,
        declinedAt: nowIso(),
        invitedUserId: userId,
        status: 'declined',
      },
    );

    return sanitizeInvitation(updatedInvitation);
  }

  async getUserWorkspaceRole(groupId, userId) {
    if (!groupId) {
      throw createHttpError(400, 'groupId_required');
    }

    if (!userId) {
      throw createHttpError(401, 'auth_required');
    }

    const membership = await this.repository.findMembership({
      groupId,
      userId,
    });

    if (!membership || membership.status !== ACTIVE_STATUS) {
      throw createHttpError(403, 'workspace_membership_required');
    }

    return membership.role;
  }

  async requireWorkspaceMember(groupId, userId) {
    const role = await this.getUserWorkspaceRole(groupId, userId);

    return {
      groupId,
      role,
      syncedAt: nowIso(),
      userId,
    };
  }

  async assertCanSyncWorkspace({ action = 'pull', groupId, userId }) {
    const role = await this.getUserWorkspaceRole(groupId, userId);
    const allowedRoles = action === 'push' ? PUSH_ROLES : PULL_ROLES;

    if (!allowedRoles.has(role)) {
      throw createHttpError(403, 'workspace_role_cannot_sync');
    }

    return {
      action,
      groupId,
      role,
      userId,
    };
  }
}

module.exports = {
  ACTIVE_STATUS,
  ADMIN_ROLES,
  PULL_ROLES,
  PUSH_ROLES,
  VALID_ROLES,
  VALID_STATUSES,
  VALID_INVITATION_ROLES,
  WorkspaceService,
  hashInviteToken,
  sanitizeInvitation,
};
