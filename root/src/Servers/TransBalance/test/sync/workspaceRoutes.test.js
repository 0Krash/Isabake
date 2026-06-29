const request = require('supertest');

jest.mock('../../models/userModel', () => {
  const store = [];

  return {
    __store: store,
    findOne: jest.fn(async ({ email, userId }) =>
      store.find(
        (user) =>
          (!userId || user.userId === userId) &&
          (!email || user.email === email) &&
          !user.deletedAt,
      ) || null,
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

jest.mock('../../models/workspaceInvitationModel', () => {
  const store = [];

  return {
    __store: store,
    create: jest.fn(async (invitation) => {
      const nextInvitation = {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:01.000Z',
        ...invitation,
      };
      store.push(nextInvitation);
      return nextInvitation;
    }),
    find: jest.fn((query) => ({
      sort: jest.fn(async () =>
        store.filter(
          (invitation) =>
            (!query.groupId || invitation.groupId === query.groupId) &&
            (!query.email || invitation.email === query.email) &&
            (!query.status || invitation.status === query.status),
        ),
      ),
    })),
    findOne: jest.fn(async (query) =>
      store.find(
        (invitation) =>
          (!query.invitationId ||
            invitation.invitationId === query.invitationId) &&
          (!query.groupId || invitation.groupId === query.groupId) &&
          (!query.email || invitation.email === query.email) &&
          (!query.status || invitation.status === query.status),
      ) || null,
    ),
    findOneAndUpdate: jest.fn(async (query, update) => {
      const index = store.findIndex(
        (invitation) => invitation.invitationId === query.invitationId,
      );

      if (index < 0) {
        return null;
      }

      store[index] = {
        ...store[index],
        ...update,
        updatedAt: '2026-01-01T00:00:02.000Z',
      };

      return store[index];
    }),
  };
});

const User = require('../../models/userModel');
const Workspace = require('../../models/workspaceModel');
const WorkspaceInvitation = require('../../models/workspaceInvitationModel');
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
    WorkspaceInvitation.__store.length = 0;
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

  test('owner/admin can update member and member/viewer cannot', async () => {
    seedWorkspace();
    WorkspaceMembership.__store.push(
      {
        groupId: 'group_a',
        role: 'admin',
        status: 'active',
        userId: 'admin',
        workspaceId: 'group_a',
      },
      {
        groupId: 'group_a',
        role: 'member',
        status: 'active',
        userId: 'member',
        workspaceId: 'group_a',
      },
      {
        groupId: 'group_a',
        role: 'viewer',
        status: 'active',
        userId: 'viewer',
        workspaceId: 'group_a',
      },
    );

    const ownerResponse = await request(app)
      .patch('/workspaces/group_a/members/member')
      .set(auth('owner'))
      .send({ role: 'viewer' });
    const adminResponse = await request(app)
      .patch('/workspaces/group_a/members/viewer')
      .set(auth('admin'))
      .send({ role: 'member' });
    const memberResponse = await request(app)
      .patch('/workspaces/group_a/members/viewer')
      .set(auth('member'))
      .send({ role: 'admin' });
    const viewerResponse = await request(app)
      .patch('/workspaces/group_a/members/member')
      .set(auth('viewer'))
      .send({ role: 'admin' });

    expect(ownerResponse.status).toBe(200);
    expect(ownerResponse.body.membership.role).toBe('viewer');
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.membership.role).toBe('member');
    expect(memberResponse.status).toBe(403);
    expect(viewerResponse.status).toBe(403);
  });

  test('owner/admin can remove members but cannot remove last owner', async () => {
    seedWorkspace();
    WorkspaceMembership.__store.push({
      groupId: 'group_a',
      role: 'admin',
      status: 'active',
      userId: 'admin',
      workspaceId: 'group_a',
    });

    const removedResponse = await request(app)
      .delete('/workspaces/group_a/members/admin')
      .set(auth('owner'));
    const lastOwnerResponse = await request(app)
      .delete('/workspaces/group_a/members/owner')
      .set(auth('owner'));

    expect(removedResponse.status).toBe(200);
    expect(removedResponse.body.membership.status).toBe('removed');
    expect(lastOwnerResponse.status).toBe(409);
    expect(lastOwnerResponse.body.message).toBe('last_owner_required');
  });

  test('user can leave workspace unless they are the only owner', async () => {
    seedWorkspace();
    WorkspaceMembership.__store.push({
      groupId: 'group_a',
      role: 'member',
      status: 'active',
      userId: 'member',
      workspaceId: 'group_a',
    });

    const memberLeaveResponse = await request(app)
      .post('/workspaces/group_a/leave')
      .set(auth('member'));
    const ownerLeaveResponse = await request(app)
      .post('/workspaces/group_a/leave')
      .set(auth('owner'));

    expect(memberLeaveResponse.status).toBe(200);
    expect(memberLeaveResponse.body.membership.status).toBe('removed');
    expect(ownerLeaveResponse.status).toBe(409);
    expect(ownerLeaveResponse.body.message).toBe('last_owner_required');
  });

  test('non-member cannot access member management', async () => {
    seedWorkspace();

    const response = await request(app)
      .patch('/workspaces/group_a/members/owner')
      .set(auth('outsider'))
      .send({ role: 'viewer' });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('workspace_membership_required');
  });

  test('owner/admin can invite by email and member cannot', async () => {
    seedWorkspace();

    const ownerResponse = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({
        email: ' Invitee@Example.TEST ',
        role: 'admin',
      });
    const adminResponse = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({
        email: 'other@example.test',
        role: 'viewer',
      });
    const deniedResponse = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('other'))
      .send({
        email: 'third@example.test',
      });

    expect(ownerResponse.status).toBe(201);
    expect(ownerResponse.body.invitation).toEqual(
      expect.objectContaining({
        email: 'invitee@example.test',
        role: 'admin',
        status: 'invited',
      }),
    );
    expect(adminResponse.status).toBe(201);
    expect(deniedResponse.status).toBe(403);
  });

  test('duplicate active invitation is reused safely', async () => {
    seedWorkspace();

    const first = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({ email: 'invitee@example.test' });
    const second = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({ email: 'INVITEE@example.test' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.invitation.invitationId).toBe(
      first.body.invitation.invitationId,
    );
    expect(WorkspaceInvitation.__store).toHaveLength(1);
  });

  test('user can list and accept own invitation, activating membership', async () => {
    seedWorkspace();
    await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({ email: 'invitee@example.test', role: 'member' });

    const mineResponse = await request(app)
      .get('/workspaces/invitations/mine')
      .set(auth('invitee'));
    const invitationId = mineResponse.body.invitations[0].invitationId;
    const acceptResponse = await request(app)
      .post(`/workspaces/invitations/${invitationId}/accept`)
      .set(auth('invitee'));

    expect(mineResponse.status).toBe(200);
    expect(mineResponse.body.invitations).toHaveLength(1);
    expect(acceptResponse.status).toBe(200);
    expect(acceptResponse.body.invitation.status).toBe('accepted');
    expect(WorkspaceMembership.__store).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          groupId: 'group_a',
          role: 'member',
          status: 'active',
          userId: 'invitee',
        }),
      ]),
    );
  });

  test('user can decline invitation without active membership', async () => {
    seedWorkspace();
    const invitationResponse = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({ email: 'invitee@example.test' });
    const invitationId = invitationResponse.body.invitation.invitationId;

    const declineResponse = await request(app)
      .post(`/workspaces/invitations/${invitationId}/decline`)
      .set(auth('invitee'));

    expect(declineResponse.status).toBe(200);
    expect(declineResponse.body.invitation.status).toBe('declined');
    expect(
      WorkspaceMembership.__store.some(
        (membership) =>
          membership.userId === 'invitee' && membership.status === 'active',
      ),
    ).toBe(false);
  });

  test('revoked invitation cannot be accepted', async () => {
    seedWorkspace();
    const invitationResponse = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({ email: 'invitee@example.test' });
    const invitationId = invitationResponse.body.invitation.invitationId;

    const revokeResponse = await request(app)
      .delete(`/workspaces/group_a/invitations/${invitationId}`)
      .set(auth('owner'));
    const acceptResponse = await request(app)
      .post(`/workspaces/invitations/${invitationId}/accept`)
      .set(auth('invitee'));

    expect(revokeResponse.status).toBe(200);
    expect(revokeResponse.body.invitation.status).toBe('revoked');
    expect(acceptResponse.status).toBe(409);
    expect(acceptResponse.body.message).toBe('invitation_not_active');
  });

  test('invitation responses do not expose secrets', async () => {
    seedWorkspace();

    const response = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({ email: 'invitee@example.test' });

    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('refreshTokenHash');
    expect(JSON.stringify(response.body)).not.toContain('accessToken');
  });
});
