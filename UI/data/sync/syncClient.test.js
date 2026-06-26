import { createSyncClient } from './syncClient';

describe('syncClient', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      EXPO_PUBLIC_API_URL: '',
      EXPO_PUBLIC_SYNC_API_URL: '',
    };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test('fails before network access when no backend URL is configured', async () => {
    const client = createSyncClient();

    await expect(
      client.pushChanges({
        deviceId: 'device_1',
        events: [],
        groupId: 'group_1',
      }),
    ).rejects.toThrow('Sync API URL no configurada');
  });

  test('consumes backend push response shape', async () => {
    process.env.EXPO_PUBLIC_SYNC_API_URL = 'http://localhost:3000';
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          accepted: [
            {
              collection: 'recipes',
              eventId: 'event_1',
              localId: 'recipe_local_1',
              remoteId: 'remote_1',
              serverVersion: 1,
              syncedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          cursor: '1',
          rejected: [],
        }),
    });
    const client = createSyncClient();

    await expect(
      client.pushChanges({
        deviceId: 'device_1',
        events: [],
        groupId: 'group_1',
      }),
    ).resolves.toEqual({
      accepted: [
        {
          collection: 'recipes',
          eventId: 'event_1',
          localId: 'recipe_local_1',
          remoteId: 'remote_1',
          serverVersion: 1,
          syncedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      cursor: '1',
      rejected: [],
    });
  });

  test('consumes backend pull response shape', async () => {
    process.env.EXPO_PUBLIC_SYNC_API_URL = 'http://localhost:3000';
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          changes: [
            {
              collection: 'recipes',
              deletedAt: null,
              document: {
                localId: 'recipe_local_1',
                name: 'Pastel',
              },
              operation: 'upsert',
              remoteId: 'remote_1',
              serverVersion: 1,
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          cursor: '1',
          groupId: 'group_1',
        }),
    });
    const client = createSyncClient();

    await expect(
      client.pullChanges({
        groupId: 'group_1',
      }),
    ).resolves.toEqual({
      changes: [
        {
          collection: 'recipes',
          deletedAt: null,
          document: {
            localId: 'recipe_local_1',
            name: 'Pastel',
          },
          operation: 'upsert',
          remoteId: 'remote_1',
          serverVersion: 1,
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      cursor: '1',
      groupId: 'group_1',
    });
  });
});
