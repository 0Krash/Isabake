const { randomUUID } = require('crypto');

const createHttpError = require('../utils/httpError');
const { MongooseWorkspaceRepository } = require('./workspaceRepository');

const ACTIVE_STATUS = 'active';
const VALID_ROLES = new Set(['owner', 'admin', 'member', 'viewer']);
const VALID_STATUSES = new Set(['active', 'invited', 'removed']);
const PUSH_ROLES = new Set(['owner', 'admin', 'member']);
const PULL_ROLES = new Set(['owner', 'admin', 'member', 'viewer']);
const ADMIN_ROLES = new Set(['owner', 'admin']);

const nowIso = () => new Date().toISOString();

const normalizeRole = (role = 'member') =>
  VALID_ROLES.has(role) ? role : 'member';

const normalizeStatus = (status = ACTIVE_STATUS) =>
  VALID_STATUSES.has(status) ? status : ACTIVE_STATUS;

const createGroupId = () => `workspace_${randomUUID()}`;

class WorkspaceService {
  constructor(repository = new MongooseWorkspaceRepository()) {
    this.repository = repository;
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
  WorkspaceService,
};
