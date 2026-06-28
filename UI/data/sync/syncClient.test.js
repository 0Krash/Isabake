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
    const client = createSyncClient({ baseUrl: '' });

    await expect(
      client.pushChanges({
        deviceId: 'device_1',
        events: [],
        groupId: 'group_1',
      }),
    ).rejects.toThrow('Sync API URL no configurada');
  });

  test('builds correct backend push request', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          accepted: [],
          cursor: '0',
          rejected: [],
        }),
    });
    const client = createSyncClient({ baseUrl: 'http://sync.example.test/' });
    const payload = {
      deviceId: 'device_1',
      events: [{ eventId: 'event_1' }],
      groupId: 'group_1',
    };

    await client.pushChanges(payload);

    expect(global.fetch).toHaveBeenCalledWith('http://sync.example.test/sync/push', {
      body: JSON.stringify(payload),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });

  test('builds correct backend pull request', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          changes: [],
          cursor: '5',
          groupId: 'group_1',
        }),
    });
    const client = createSyncClient({ baseUrl: 'http://sync.example.test/' });

    await client.pullChanges({
      cursor: '4',
      groupId: 'group_1',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://sync.example.test/sync/pull?groupId=group_1&cursor=4',
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'GET',
      },
    );
  });

  test('sends auth headers when authSession is provided', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          accepted: [],
          cursor: '0',
          rejected: [],
        }),
    });
    const client = createSyncClient({
      authSession: {
        authToken: 'token_user_1',
        email: 'user@example.test',
        userId: 'user_1',
      },
      baseUrl: 'http://sync.example.test',
    });

    await client.pushChanges({
      deviceId: 'device_1',
      events: [],
      groupId: 'group_1',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://sync.example.test/sync/push',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token_user_1',
          'x-dev-user-email': 'user@example.test',
          'x-dev-user-id': 'user_1',
        }),
      }),
    );
  });

  test('fails safely when auth is required and missing', async () => {
    const client = createSyncClient({
      baseUrl: 'http://sync.example.test',
      requireAuth: true,
    });

    await expect(
      client.pullChanges({
        groupId: 'group_1',
      }),
    ).rejects.toThrow('Sesion auth requerida para sync remoto');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('consumes backend push response shape', async () => {
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
    const client = createSyncClient({ baseUrl: 'http://localhost:3000' });

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
    const client = createSyncClient({ baseUrl: 'http://localhost:3000' });

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
