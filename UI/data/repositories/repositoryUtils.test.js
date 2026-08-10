import { documentToEntity } from './repositoryUtils';

describe('repositoryUtils', () => {
  test('maps document timestamps to entities', () => {
    const entity = documentToEntity({
      createdAt: '2026-08-09T12:00:00.000Z',
      data: {
        clientId: 'client_1',
        name: 'Cliente uno',
      },
      deletedAt: null,
      deviceId: 'device_1',
      groupId: 'group_1',
      id: 'client_1',
      localVersion: 1,
      remoteId: null,
      serverVersion: null,
      syncStatus: 'synced',
      updatedAt: '2026-08-09T12:10:00.000Z',
    });

    expect(entity).toMatchObject({
      clientId: 'client_1',
      createdAt: '2026-08-09T12:00:00.000Z',
      name: 'Cliente uno',
      updatedAt: '2026-08-09T12:10:00.000Z',
    });
  });
});
