const request = require('supertest');

jest.mock('../../models/syncDocumentModel', () => {
  const store = [];
  const model = {
    __store: store,
    find: jest.fn((query) => ({
      sort: jest.fn(async () =>
        store
          .filter(
            (document) =>
              document.groupId === query.groupId &&
              document.serverVersion > query.serverVersion.$gt,
          )
          .sort((left, right) => left.serverVersion - right.serverVersion),
      ),
    })),
    findOne: jest.fn((query) => {
      const directResult =
        store.find(
          (document) =>
            document.collection === query.collection &&
            document.groupId === query.groupId &&
            document.remoteId === query.remoteId,
        ) || null;
      const queryResult = {
        sort: jest.fn(async () =>
          store
            .filter((document) => document.groupId === query.groupId)
            .sort((left, right) => right.serverVersion - left.serverVersion)[0] ||
          null,
        ),
        then: (resolve) => Promise.resolve(directResult).then(resolve),
      };

      return queryResult;
    }),
    findOneAndUpdate: jest.fn(async (query, update) => {
      const index = store.findIndex(
        (document) =>
          document.collection === query.collection &&
          document.groupId === query.groupId &&
          document.remoteId === query.remoteId,
      );
      const document = {
        createdAt: index >= 0 ? store[index].createdAt : '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:01.000Z',
        ...update,
      };

      if (index >= 0) {
        store[index] = document;
      } else {
        store.push(document);
      }

      return document;
    }),
  };

  return model;
});

jest.mock('../../models/syncEventModel', () => {
  const store = [];

  return {
    __store: store,
    create: jest.fn(async (event) => {
      store.push(event);
      return event;
    }),
    findOne: jest.fn(async ({ eventId }) =>
      store.find((event) => event.eventId === eventId) || null,
    ),
  };
});

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
      store.push(workspace);
      return workspace;
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

      if (index >= 0) {
        store[index] = update;
      } else {
        store.push(update);
      }

      return update;
    }),
  };
});

const SyncDocument = require('../../models/syncDocumentModel');
const SyncEvent = require('../../models/syncEventModel');
const User = require('../../models/userModel');
const Workspace = require('../../models/workspaceModel');
const WorkspaceMembership = require('../../models/workspaceMembershipModel');
const { signJwt } = require('../../services/authTokenService');
const app = require('../../app');

const eventPayload = (eventId = 'event_1') => ({
  collection: 'recipes',
  document: {
    localId: 'recipe_local_1',
    name: 'Pastel',
  },
  documentId: 'recipe_local_1',
  eventId,
  operation: 'create',
});

const jwtAuth = (userId) => ({
  authorization: `Bearer ${signJwt({
    email: `${userId}@example.test`,
    sub: userId,
    tokenUse: 'access',
  })}`,
});

describe('sync routes contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SyncDocument.__store.length = 0;
    SyncEvent.__store.length = 0;
    User.__store.length = 0;
    Workspace.__store.length = 0;
    WorkspaceMembership.__store.length = 0;
    Workspace.__store.push({
      groupId: 'group_a',
      name: 'Workspace A',
      ownerUserId: 'user_owner',
      workspaceId: 'group_a',
    });
    WorkspaceMembership.__store.push({
      groupId: 'group_a',
      role: 'owner',
      status: 'active',
      userId: 'user_owner',
      workspaceId: 'group_a',
    });
    User.__store.push({
      authProvider: 'password',
      email: 'owner@example.test',
      userId: 'user_owner',
    });
  });

  test('POST /sync/push response shape matches client contract', async () => {
    const response = await request(app)
      .post('/sync/push')
      .set('authorization', 'Bearer token_owner')
      .set('x-dev-user-id', 'user_owner')
      .send({
        deviceId: 'device_1',
        events: [eventPayload()],
        groupId: 'group_a',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      accepted: [
        expect.objectContaining({
          collection: 'recipes',
          eventId: 'event_1',
          localId: 'recipe_local_1',
          remoteId: expect.any(String),
          serverVersion: 1,
          syncedAt: expect.any(String),
        }),
      ],
      cursor: '1',
      rejected: [],
    });
  });

  test('GET /sync/pull response shape matches client contract', async () => {
    await request(app)
      .post('/sync/push')
      .set('authorization', 'Bearer token_owner')
      .set('x-dev-user-id', 'user_owner')
      .send({
        deviceId: 'device_1',
        events: [eventPayload()],
        groupId: 'group_a',
      });

    const response = await request(app)
      .get('/sync/pull?groupId=group_a')
      .set('authorization', 'Bearer token_owner')
      .set('x-dev-user-id', 'user_owner');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      changes: [
        expect.objectContaining({
          collection: 'recipes',
          deletedAt: null,
          document: expect.objectContaining({
            groupId: 'group_a',
            localId: 'recipe_local_1',
            name: 'Pastel',
          }),
          operation: 'upsert',
          remoteId: expect.any(String),
          serverVersion: 1,
          updatedAt: expect.any(String),
        }),
      ],
      cursor: '1',
      groupId: 'group_a',
    });
  });

  test('validates push request payload', async () => {
    const response = await request(app)
      .post('/sync/push')
      .set('authorization', 'Bearer token_owner')
      .set('x-dev-user-id', 'user_owner')
      .send({
        deviceId: 'device_1',
        groupId: 'group_a',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'events_array_required',
      status: 'failed',
    });
  });

  test('rejects unauthenticated push and pull', async () => {
    const pushResponse = await request(app)
      .post('/sync/push')
      .send({
        deviceId: 'device_1',
        events: [],
        groupId: 'group_a',
      });
    const pullResponse = await request(app).get('/sync/pull?groupId=group_a');

    expect(pushResponse.status).toBe(401);
    expect(pushResponse.body.message).toBe('auth_required');
    expect(pullResponse.status).toBe(401);
    expect(pullResponse.body.message).toBe('auth_required');
  });

  test('accepts valid JWT with workspace membership', async () => {
    const response = await request(app)
      .post('/sync/push')
      .set(jwtAuth('user_owner'))
      .send({
        deviceId: 'device_1',
        events: [eventPayload('event_jwt_1')],
        groupId: 'group_a',
      });

    expect(response.status).toBe(200);
    expect(response.body.accepted[0]).toEqual(
      expect.objectContaining({
        eventId: 'event_jwt_1',
      }),
    );
  });

  test('rejects invalid JWT without dev headers', async () => {
    const response = await request(app)
      .post('/sync/push')
      .set('authorization', 'Bearer invalid-token')
      .send({
        deviceId: 'device_1',
        events: [],
        groupId: 'group_a',
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('invalid_token');
  });

  test('rejects authenticated non-member push', async () => {
    const response = await request(app)
      .post('/sync/push')
      .set('authorization', 'Bearer token_other')
      .set('x-dev-user-id', 'user_other')
      .send({
        deviceId: 'device_1',
        events: [eventPayload()],
        groupId: 'group_a',
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('workspace_membership_required');
  });
});
