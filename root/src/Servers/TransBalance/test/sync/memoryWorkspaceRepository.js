class MemoryWorkspaceRepository {
  constructor() {
    this.users = [];
    this.workspaces = [];
    this.memberships = [];
    this.invitations = [];
  }

  async upsertUser(user) {
    const index = this.users.findIndex((item) => item.userId === user.userId);
    const nextUser = {
      createdAt: index >= 0 ? this.users[index].createdAt : new Date().toISOString(),
      deletedAt: null,
      updatedAt: new Date().toISOString(),
      ...user,
    };

    if (index >= 0) {
      this.users[index] = nextUser;
    } else {
      this.users.push(nextUser);
    }

    return nextUser;
  }

  async findUserByUserId(userId) {
    return this.users.find((user) => user.userId === userId && !user.deletedAt) || null;
  }

  async findUserByEmail(email) {
    return this.users.find((user) => user.email === email && !user.deletedAt) || null;
  }

  async createWorkspace(workspace) {
    const nextWorkspace = {
      createdAt: new Date().toISOString(),
      deletedAt: null,
      updatedAt: new Date().toISOString(),
      ...workspace,
    };

    this.workspaces.push(nextWorkspace);
    return nextWorkspace;
  }

  async findWorkspaceByGroupId(groupId) {
    return (
      this.workspaces.find(
        (workspace) => workspace.groupId === groupId && !workspace.deletedAt,
      ) || null
    );
  }

  async findWorkspaceByWorkspaceId(workspaceId) {
    return (
      this.workspaces.find(
        (workspace) =>
          workspace.workspaceId === workspaceId && !workspace.deletedAt,
      ) || null
    );
  }

  async updateWorkspace(groupId, update) {
    const index = this.workspaces.findIndex(
      (workspace) => workspace.groupId === groupId && !workspace.deletedAt,
    );

    if (index < 0) {
      return null;
    }

    this.workspaces[index] = {
      ...this.workspaces[index],
      ...update,
      updatedAt: new Date().toISOString(),
    };

    return this.workspaces[index];
  }

  async softDeleteWorkspace(groupId, update) {
    return this.updateWorkspace(groupId, update);
  }

  async hardDeleteWorkspaceData(groupId) {
    const workspace =
      this.workspaces.find(
        (item) => item.groupId === groupId && !item.deletedAt,
      ) || null;

    if (!workspace) {
      return null;
    }

    this.workspaces = this.workspaces.filter(
      (item) => item.groupId !== groupId,
    );
    this.memberships = this.memberships.filter(
      (membership) => membership.groupId !== groupId,
    );
    this.invitations = this.invitations.filter(
      (invitation) => invitation.groupId !== groupId,
    );

    return workspace;
  }

  async upsertMembership(membership) {
    const index = this.memberships.findIndex(
      (item) => item.groupId === membership.groupId && item.userId === membership.userId,
    );
    const nextMembership = {
      createdAt:
        index >= 0 ? this.memberships[index].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...membership,
    };

    if (index >= 0) {
      this.memberships[index] = nextMembership;
    } else {
      this.memberships.push(nextMembership);
    }

    return nextMembership;
  }

  async findMembership({ groupId, userId }) {
    return (
      this.memberships.find(
        (membership) =>
          membership.groupId === groupId && membership.userId === userId,
      ) || null
    );
  }

  async findMembershipsByGroupId(groupId) {
    return this.memberships.filter(
      (membership) => membership.groupId === groupId,
    );
  }

  async updateMembership({ groupId, userId }, update) {
    const index = this.memberships.findIndex(
      (membership) =>
        membership.groupId === groupId && membership.userId === userId,
    );

    if (index < 0) {
      return null;
    }

    this.memberships[index] = {
      ...this.memberships[index],
      ...update,
      updatedAt: new Date().toISOString(),
    };

    return this.memberships[index];
  }

  async updateMembershipsByGroupId(groupId, update) {
    this.memberships = this.memberships.map((membership) =>
      membership.groupId === groupId
        ? {
            ...membership,
            ...update,
            updatedAt: new Date().toISOString(),
          }
        : membership,
    );

    return { modifiedCount: this.memberships.length };
  }

  async findActiveMembershipsByUserId(userId) {
    return this.memberships.filter(
      (membership) =>
        membership.userId === userId && membership.status === 'active',
    );
  }

  async createInvitation(invitation) {
    const nextInvitation = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...invitation,
    };

    this.invitations.push(nextInvitation);
    return nextInvitation;
  }

  async findInvitationById(invitationId) {
    return (
      this.invitations.find(
        (invitation) => invitation.invitationId === invitationId,
      ) || null
    );
  }

  async findInvitationByTokenHash(inviteTokenHash) {
    return (
      this.invitations.find(
        (invitation) => invitation.inviteTokenHash === inviteTokenHash,
      ) || null
    );
  }

  async findInvitationsByGroupId(groupId) {
    return this.invitations.filter(
      (invitation) => invitation.groupId === groupId,
    );
  }

  async findInvitationsByEmail(email) {
    return this.invitations.filter((invitation) => invitation.email === email);
  }

  async findActiveInvitationByEmail({ email, groupId }) {
    return (
      this.invitations.find(
        (invitation) =>
          invitation.email === email &&
          invitation.groupId === groupId &&
          invitation.status === 'invited',
      ) || null
    );
  }

  async updateInvitation(invitationId, update) {
    const index = this.invitations.findIndex(
      (invitation) => invitation.invitationId === invitationId,
    );

    if (index < 0) {
      return null;
    }

    this.invitations[index] = {
      ...this.invitations[index],
      ...update,
      updatedAt: new Date().toISOString(),
    };

    return this.invitations[index];
  }

  async updateInvitationsByGroupId(groupId, update) {
    this.invitations = this.invitations.map((invitation) =>
      invitation.groupId === groupId
        ? {
            ...invitation,
            ...update,
            updatedAt: new Date().toISOString(),
          }
        : invitation,
    );

    return { modifiedCount: this.invitations.length };
  }
}

module.exports = MemoryWorkspaceRepository;
