const request = require('supertest');

jest.mock('../../models/userModel', () => {
  const store = [];

  return {
    __store: store,
    findOne: jest.fn(async ({ userId }) =>
      store.find((user) => user.userId === userId && !user.deletedAt) || null,
    ),
    findOneAndUpdate: jest.fn(async (query, update) => {
      const index = store.findIndex((user) => user.userId === query.userId);
      const user = {
        createdAt: index >= 0 ? store[index].createdAt : '2026-01-01T00:00:00.000Z',
        deletedAt: null,
        updatedAt: '2026-01-01T00:00:01.000Z',
        ...update,
      };

      if (index >= 0) {
        store[index] = user;
      } else {
        store.push(user);
      }

      return user;
    }),
  };
});

jest.mock('../../models/workspaceModel', () => {
  const store = [];

  return {
    __store: store,
    create: jest.fn(async (workspace) => {
      const nextWorkspace = {
        createdAt: '2026-01-01T00:00:00.000Z',
        deletedAt: null,
        updatedAt: '2026-01-01T00:00:01.000Z',
        ...workspace,
      };
      store.push(nextWorkspace);
      return nextWorkspace;
    }),
    findOne: jest.fn(async (query) =>
      store.find(
        (workspace) =>
          (!query.groupId || workspace.groupId === query.groupId) &&
          (!query.workspaceId || workspace.workspaceId === query.workspaceId) &&
          !workspace.deletedAt,
      ) || null,
    ),
  };
});

jest.mock('../../models/workspaceMembershipModel', () => {
  const store = [];

  return {
    __store: store,
    find: jest.fn((query) => ({
      sort: jest.fn(async () =>
        store.filter(
          (membership) =>
            (!query.groupId || membership.groupId === query.groupId) &&
            (!query.userId || membership.userId === query.userId) &&
            (!query.status || membership.status === query.status),
        ),
      ),
    })),
    findOne: jest.fn(async ({ groupId, userId }) =>
      store.find(
        (membership) =>
          membership.groupId === groupId && membership.userId === userId,
      ) || null,
    ),
    findOneAndUpdate: jest.fn(async (query, update) => {
      const index = store.findIndex(
        (membership) =>
          membership.groupId === query.groupId &&
          membership.userId === query.userId,
      );
      const membership = {
        createdAt:
          index >= 0
            ? store[index].createdAt
            : '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:01.000Z',
        ...update,
      };

      if (index >= 0) {
        store[index] = membership;
      } else {
        store.push(membership);
      }

      return membership;
    }),
  };
});

const User = require('../../models/userModel');
const Workspace = require('../../models/workspaceModel');
const WorkspaceMembership = require('../../models/workspaceMembershipModel');
const app = require('../../app');

const auth = (userId) => ({
  authorization: `Bearer token_${userId}`,
  'x-dev-user-id': userId,
  'x-dev-user-email': `${userId}@example.test`,
});

const seedWorkspace = ({
  groupId = 'group_a',
  ownerUserId = 'owner',
  workspaceId = groupId,
} = {}) => {
  Workspace.__store.push({
    groupId,
    name: groupId,
    ownerUserId,
    workspaceId,
  });
  WorkspaceMembership.__store.push({
    groupId,
    role: 'owner',
    status: 'active',
    userId: ownerUserId,
    workspaceId,
  });
};

describe('workspace routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.__store.length = 0;
    Workspace.__store.length = 0;
    WorkspaceMembership.__store.length = 0;
  });

  test('owner can create workspace', async () => {
    const response = await request(app)
      .post('/workspaces')
      .set(auth('owner'))
      .send({
        groupId: 'group_a',
        name: 'Panaderia',
      });

    expect(response.status).toBe(201);
    expect(response.body.workspace).toEqual(
      expect.objectContaining({
        groupId: 'group_a',
        name: 'Panaderia',
        ownerUserId: 'owner',
        workspaceId: 'group_a',
      }),
    );
    expect(WorkspaceMembership.__store[0]).toEqual(
      expect.objectContaining({
        role: 'owner',
        status: 'active',
        userId: 'owner',
      }),
    );
  });

  test('GET /workspaces only returns active memberships for current user', async () => {
    seedWorkspace({ groupId: 'group_a', ownerUserId: 'owner_a' });
    seedWorkspace({ groupId: 'group_b', ownerUserId: 'owner_b' });
    WorkspaceMembership.__store.push({
      groupId: 'group_a',
      role: 'member',
      status: 'active',
      userId: 'user_1',
      workspaceId: 'group_a',
    });
    WorkspaceMembership.__store.push({
      groupId: 'group_b',
      role: 'member',
      status: 'removed',
      userId: 'user_1',
      workspaceId: 'group_b',
    });

    const response = await request(app)
      .get('/workspaces')
      .set(auth('user_1'));

    expect(response.status).toBe(200);
    expect(response.body.workspaces).toHaveLength(1);
    expect(response.body.workspaces[0].groupId).toBe('group_a');
  });

  test('owner/admin can add member and non-admin cannot', async () => {
    seedWorkspace();

    const adminResponse = await request(app)
      .post('/workspaces/group_a/members')
      .set(auth('owner'))
      .send({
        role: 'admin',
        userId: 'admin',
      });
    const memberResponse = await request(app)
      .post('/workspaces/group_a/members')
      .set(auth('admin'))
      .send({
        role: 'member',
        userId: 'member',
      });
    const deniedResponse = await request(app)
      .post('/workspaces/group_a/members')
      .set(auth('member'))
      .send({
        role: 'viewer',
        userId: 'viewer',
      });

    expect(adminResponse.status).toBe(201);
    expect(adminResponse.body.membership.role).toBe('admin');
    expect(memberResponse.status).toBe(201);
    expect(memberResponse.body.membership.role).toBe('member');
    expect(deniedResponse.status).toBe(403);
    expect(deniedResponse.body.message).toBe('workspace_admin_required');
  });

  test('removed member cannot get workspace', async () => {
    seedWorkspace();
    WorkspaceMembership.__store.push({
      groupId: 'group_a',
      role: 'member',
      status: 'removed',
      userId: 'removed',
      workspaceId: 'group_a',
    });

    const response = await request(app)
      .get('/workspaces/group_a')
      .set(auth('removed'));

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('workspace_membership_required');
  });
});
