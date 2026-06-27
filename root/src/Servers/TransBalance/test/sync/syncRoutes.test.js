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

const SyncDocument = require('../../models/syncDocumentModel');
const SyncEvent = require('../../models/syncEventModel');
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

describe('sync routes contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SyncDocument.__store.length = 0;
    SyncEvent.__store.length = 0;
  });

  test('POST /sync/push response shape matches client contract', async () => {
    const response = await request(app)
      .post('/sync/push')
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
      .send({
        deviceId: 'device_1',
        events: [eventPayload()],
        groupId: 'group_a',
      });

    const response = await request(app).get('/sync/pull?groupId=group_a');

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
});
