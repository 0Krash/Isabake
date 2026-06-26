import { createSyncClient } from './syncClient';

describe('syncClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      EXPO_PUBLIC_API_URL: '',
      EXPO_PUBLIC_SYNC_API_URL: '',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
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
});
