class MemoryWorkspaceRepository {
  constructor() {
    this.users = [];
    this.workspaces = [];
    this.memberships = [];
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

  async findActiveMembershipsByUserId(userId) {
    return this.memberships.filter(
      (membership) =>
        membership.userId === userId && membership.status === 'active',
    );
  }
}

module.exports = MemoryWorkspaceRepository;
