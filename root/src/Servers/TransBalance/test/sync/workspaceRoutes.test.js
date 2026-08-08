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
    findOneAndUpdate: jest.fn(async (query, update) => {
      const index = store.findIndex(
        (workspace) =>
          workspace.groupId === query.groupId && !workspace.deletedAt,
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
    deleteOne: jest.fn(async (query) => {
      const index = store.findIndex(
        (workspace) => workspace.groupId === query.groupId,
      );

      if (index < 0) {
        return { deletedCount: 0 };
      }

      store.splice(index, 1);
      return { deletedCount: 1 };
    }),
    updateMany: jest.fn(async (query, update) => {
      let modifiedCount = 0;
      store.forEach((workspace, index) => {
        if (
          (!query.groupId || workspace.groupId === query.groupId) &&
          !workspace.deletedAt
        ) {
          store[index] = {
            ...workspace,
            ...update,
            updatedAt: '2026-01-01T00:00:02.000Z',
          };
          modifiedCount += 1;
        }
      });
      return { modifiedCount };
    }),
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
    updateMany: jest.fn(async (query, update) => {
      let modifiedCount = 0;
      store.forEach((membership, index) => {
        if (!query.groupId || membership.groupId === query.groupId) {
          store[index] = {
            ...membership,
            ...update,
            updatedAt: '2026-01-01T00:00:02.000Z',
          };
          modifiedCount += 1;
        }
      });
      return { modifiedCount };
    }),
    deleteMany: jest.fn(async (query) => {
      const initialLength = store.length;

      for (let index = store.length - 1; index >= 0; index -= 1) {
        if (!query.groupId || store[index].groupId === query.groupId) {
          store.splice(index, 1);
        }
      }

      return { deletedCount: initialLength - store.length };
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
          (!query.inviteTokenHash ||
            invitation.inviteTokenHash === query.inviteTokenHash) &&
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
    updateMany: jest.fn(async (query, update) => {
      let modifiedCount = 0;
      store.forEach((invitation, index) => {
        if (!query.groupId || invitation.groupId === query.groupId) {
          store[index] = {
            ...invitation,
            ...update,
            updatedAt: '2026-01-01T00:00:02.000Z',
          };
          modifiedCount += 1;
        }
      });
      return { modifiedCount };
    }),
    deleteMany: jest.fn(async (query) => {
      const initialLength = store.length;

      for (let index = store.length - 1; index >= 0; index -= 1) {
        if (!query.groupId || store[index].groupId === query.groupId) {
          store.splice(index, 1);
        }
      }

      return { deletedCount: initialLength - store.length };
    }),
  };
});

jest.mock('../../models/syncDocumentModel', () => {
  const store = [];

  return {
    __store: store,
    deleteMany: jest.fn(async (query) => {
      const initialLength = store.length;

      for (let index = store.length - 1; index >= 0; index -= 1) {
        if (!query.groupId || store[index].groupId === query.groupId) {
          store.splice(index, 1);
        }
      }

      return { deletedCount: initialLength - store.length };
    }),
  };
});

jest.mock('../../models/syncEventModel', () => {
  const store = [];

  return {
    __store: store,
    deleteMany: jest.fn(async (query) => {
      const initialLength = store.length;

      for (let index = store.length - 1; index >= 0; index -= 1) {
        if (!query.groupId || store[index].groupId === query.groupId) {
          store.splice(index, 1);
        }
      }

      return { deletedCount: initialLength - store.length };
    }),
  };
});

jest.mock('../../services/invitationEmailService', () => ({
  InvitationEmailService: jest.fn().mockImplementation(() => ({
    sendWorkspaceInvitationEmail: jest.fn(async () => ({
      provider: 'mock',
      sent: true,
    })),
  })),
}));

const User = require('../../models/userModel');
const Workspace = require('../../models/workspaceModel');
const WorkspaceInvitation = require('../../models/workspaceInvitationModel');
const WorkspaceMembership = require('../../models/workspaceMembershipModel');
const SyncDocument = require('../../models/syncDocumentModel');
const SyncEvent = require('../../models/syncEventModel');
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
  const originalExposeDevInviteLinks = process.env.EXPOSE_DEV_INVITE_LINKS;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EXPOSE_DEV_INVITE_LINKS;
    User.__store.length = 0;
    Workspace.__store.length = 0;
    WorkspaceInvitation.__store.length = 0;
    WorkspaceMembership.__store.length = 0;
    SyncDocument.__store.length = 0;
    SyncEvent.__store.length = 0;
  });

  afterEach(() => {
    if (originalExposeDevInviteLinks === undefined) {
      delete process.env.EXPOSE_DEV_INVITE_LINKS;
    } else {
      process.env.EXPOSE_DEV_INVITE_LINKS = originalExposeDevInviteLinks;
    }
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

  test('owner can rename workspace', async () => {
    seedWorkspace({ groupId: 'group_a', ownerUserId: 'owner' });

    const response = await request(app)
      .patch('/workspaces/group_a')
      .set(auth('owner'))
      .send({ name: 'Panaderia Norte' });

    expect(response.status).toBe(200);
    expect(response.body.workspace).toEqual(
      expect.objectContaining({
        groupId: 'group_a',
        name: 'Panaderia Norte',
      }),
    );
    expect(Workspace.__store[0].name).toBe('Panaderia Norte');
  });

  test('owner can hard delete workspace and related data', async () => {
    seedWorkspace({ groupId: 'group_a', ownerUserId: 'owner' });
    WorkspaceInvitation.__store.push({
      email: 'invitee@example.test',
      groupId: 'group_a',
      invitationId: 'invitation_1',
      role: 'member',
      status: 'invited',
      workspaceId: 'group_a',
    });
    SyncDocument.__store.push({
      groupId: 'group_a',
      remoteId: 'recipe_1',
    });
    SyncEvent.__store.push({
      eventId: 'event_1',
      groupId: 'group_a',
    });

    const response = await request(app)
      .delete('/workspaces/group_a')
      .set(auth('owner'));

    expect(response.status).toBe(200);
    expect(response.body.workspace).toEqual(
      expect.objectContaining({
        deletedAt: expect.any(String),
        groupId: 'group_a',
      }),
    );
    expect(Workspace.__store).toEqual([]);
    expect(WorkspaceMembership.__store).toEqual([]);
    expect(WorkspaceInvitation.__store).toEqual([]);
    expect(SyncDocument.__store).toEqual([]);
    expect(SyncEvent.__store).toEqual([]);

    const listResponse = await request(app).get('/workspaces').set(auth('owner'));
    expect(listResponse.body.workspaces).toEqual([]);
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

  test('active member can list workspace team members', async () => {
    seedWorkspace();
    await request(app)
      .post('/workspaces/group_a/members')
      .set(auth('owner'))
      .send({
        role: 'member',
        userId: 'member',
      });

    const response = await request(app)
      .get('/workspaces/group_a/members')
      .set(auth('member'));

    expect(response.status).toBe(200);
    expect(response.body.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'owner', userId: 'owner' }),
        expect.objectContaining({
          isCurrentUser: true,
          role: 'member',
          userId: 'member',
        }),
      ]),
    );
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

  test('owner/admin can list pending workspace invitations', async () => {
    seedWorkspace();
    WorkspaceMembership.__store.push({
      groupId: 'group_a',
      role: 'admin',
      status: 'active',
      userId: 'admin',
      workspaceId: 'group_a',
    });

    const ownerInviteResponse = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({ email: 'pending@example.test', role: 'member' });
    const adminInviteResponse = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({ email: 'admin-pending@example.test', role: 'viewer' });
    const ownerListResponse = await request(app)
      .get('/workspaces/group_a/invitations')
      .set(auth('owner'));
    const adminListResponse = await request(app)
      .get('/workspaces/group_a/invitations')
      .set(auth('admin'));

    expect(ownerInviteResponse.status).toBe(201);
    expect(adminInviteResponse.status).toBe(201);
    expect(ownerListResponse.status).toBe(200);
    expect(adminListResponse.status).toBe(200);
    expect(ownerListResponse.body.invitations).toEqual([
      expect.objectContaining({
        email: 'pending@example.test',
        invitationId: ownerInviteResponse.body.invitation.invitationId,
        status: 'invited',
      }),
      expect.objectContaining({
        email: 'admin-pending@example.test',
        invitationId: adminInviteResponse.body.invitation.invitationId,
        status: 'invited',
      }),
    ]);
    expect(adminListResponse.body.invitations).toEqual(
      ownerListResponse.body.invitations,
    );
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
    expect(WorkspaceInvitation.__store[0].inviteTokenHash).toBeTruthy();
    expect(WorkspaceInvitation.__store[0].inviteTokenHash).not.toContain(
      'invite_token',
    );
  });

  test('invitation creation does not expose devInviteLink by default', async () => {
    seedWorkspace();

    const response = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({ email: 'invitee@example.test' });

    expect(response.status).toBe(201);
    expect(response.body.invitation.devInviteLink).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('inviteTokenHash');
  });

  test('token preview works without auth and exposes safe invitation data', async () => {
    process.env.EXPOSE_DEV_INVITE_LINKS = 'true';
    seedWorkspace();
    const createResponse = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({ email: 'invitee@example.test', role: 'viewer' });
    const token = createResponse.body.invitation.devInviteLink.split('/').pop();

    const previewResponse = await request(app)
      .get(`/workspaces/invitations/by-token/${token}`);

    expect(previewResponse.status).toBe(200);
    expect(previewResponse.body.invitation).toEqual(
      expect.objectContaining({
        email: 'invitee@example.test',
        role: 'viewer',
        status: 'invited',
        workspace: expect.objectContaining({ name: 'group_a' }),
      }),
    );
    expect(JSON.stringify(previewResponse.body)).not.toContain('inviteTokenHash');
    expect(JSON.stringify(previewResponse.body)).not.toContain('passwordHash');
    expect(JSON.stringify(previewResponse.body)).not.toContain(
      'refreshTokenHash',
    );
  });

  test('accept by token requires auth and matching email', async () => {
    process.env.EXPOSE_DEV_INVITE_LINKS = 'true';
    seedWorkspace();
    const createResponse = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({ email: 'invitee@example.test', role: 'member' });
    const token = createResponse.body.invitation.devInviteLink.split('/').pop();

    const missingAuthResponse = await request(app)
      .post(`/workspaces/invitations/by-token/${token}/accept`);
    const wrongEmailResponse = await request(app)
      .post(`/workspaces/invitations/by-token/${token}/accept`)
      .set(auth('other'));
    const acceptResponse = await request(app)
      .post(`/workspaces/invitations/by-token/${token}/accept`)
      .set(auth('invitee'));

    expect(missingAuthResponse.status).toBe(401);
    expect(wrongEmailResponse.status).toBe(403);
    expect(wrongEmailResponse.body.message).toBe('invitation_email_mismatch');
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
    expect(JSON.stringify(acceptResponse.body)).not.toContain('inviteTokenHash');
  });

  test('decline by token works and revoked token preview fails safely', async () => {
    process.env.EXPOSE_DEV_INVITE_LINKS = 'true';
    seedWorkspace();
    const declineResponse = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({ email: 'invitee@example.test' });
    const revokedResponse = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({ email: 'revoked@example.test' });
    const declineToken =
      declineResponse.body.invitation.devInviteLink.split('/').pop();
    const revokedToken =
      revokedResponse.body.invitation.devInviteLink.split('/').pop();
    const revokedInvitationId = revokedResponse.body.invitation.invitationId;

    await request(app)
      .delete(`/workspaces/group_a/invitations/${revokedInvitationId}`)
      .set(auth('owner'));
    const tokenDeclineResponse = await request(app)
      .post(`/workspaces/invitations/by-token/${declineToken}/decline`)
      .set(auth('invitee'));
    const revokedPreviewResponse = await request(app)
      .get(`/workspaces/invitations/by-token/${revokedToken}`);

    expect(tokenDeclineResponse.status).toBe(200);
    expect(tokenDeclineResponse.body.invitation.status).toBe('declined');
    expect(revokedPreviewResponse.status).toBe(409);
    expect(revokedPreviewResponse.body.message).toBe('invitation_not_active');
  });

  test('owner can regenerate invitation link and old token becomes invalid', async () => {
    process.env.EXPOSE_DEV_INVITE_LINKS = 'true';
    seedWorkspace();
    const createResponse = await request(app)
      .post('/workspaces/group_a/invitations')
      .set(auth('owner'))
      .send({ email: 'invitee@example.test' });
    const invitationId = createResponse.body.invitation.invitationId;
    const firstToken = createResponse.body.invitation.devInviteLink
      .split('/')
      .pop();

    const deniedResponse = await request(app)
      .post(`/workspaces/group_a/invitations/${invitationId}/regenerate-link`)
      .set(auth('other'));
    const regenerateResponse = await request(app)
      .post(`/workspaces/group_a/invitations/${invitationId}/regenerate-link`)
      .set(auth('owner'));
    const secondToken = regenerateResponse.body.invitation.devInviteLink
      .split('/')
      .pop();
    const oldPreviewResponse = await request(app)
      .get(`/workspaces/invitations/by-token/${firstToken}`);
    const newPreviewResponse = await request(app)
      .get(`/workspaces/invitations/by-token/${secondToken}`);

    expect(deniedResponse.status).toBe(403);
    expect(regenerateResponse.status).toBe(200);
    expect(secondToken).not.toBe(firstToken);
    expect(JSON.stringify(regenerateResponse.body)).not.toContain(
      'inviteTokenHash',
    );
    expect(oldPreviewResponse.status).toBe(404);
    expect(newPreviewResponse.status).toBe(200);
    expect(newPreviewResponse.body.invitation.email).toBe(
      'invitee@example.test',
    );
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
    expect(JSON.stringify(response.body)).not.toContain('inviteTokenHash');
  });
});
