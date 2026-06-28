jest.mock('../db/documentStore', () => ({
  getDocument: jest.fn(),
  getDocumentsBySyncStatuses: jest.fn(async () => []),
  markDocumentConflict: jest.fn(),
  markDocumentSynced: jest.fn(),
  saveRemoteDocument: jest.fn(),
}));

jest.mock('../db/localIds', () => ({
  getLocalDeviceId: jest.fn(async () => 'device_local_1'),
}));

jest.mock('./syncOutbox', () => ({
  getFailedOutboxCountsByCollection: jest.fn(async () => ({})),
  getPendingOutboxCountsByCollection: jest.fn(async () => ({})),
  getPendingOutboxEvents: jest.fn(async () => []),
  incrementOutboxAttempt: jest.fn(),
  markOutboxEventConflict: jest.fn(),
  markOutboxEventFailed: jest.fn(),
  markOutboxEventSynced: jest.fn(),
}));

jest.mock('./syncStateRepository', () => ({
  getLastSyncCursor: jest.fn(async () => null),
  storeLastSyncCursor: jest.fn(),
}));

import {
  getDocument,
  markDocumentConflict,
  markDocumentSynced,
  saveRemoteDocument,
} from '../db/documentStore';
import {
  getPendingOutboxEvents,
  incrementOutboxAttempt,
  markOutboxEventConflict,
  markOutboxEventFailed,
  markOutboxEventSynced,
} from './syncOutbox';
import {
  getLastSyncCursor,
  storeLastSyncCursor,
} from './syncStateRepository';
import {
  pullRemoteChanges,
  pushPendingChanges,
  runSync,
} from './syncService';

describe('syncService safe failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPendingOutboxEvents.mockResolvedValue([]);
    getDocument.mockResolvedValue(null);
    getLastSyncCursor.mockResolvedValue(null);
  });

  test('pushPendingChanges fails safely when groupId is missing', async () => {
    await expect(pushPendingChanges()).resolves.toEqual({
      accepted: [],
      error: 'groupId_required',
      ok: false,
      rejected: [],
      skipped: [],
    });
  });

  test('pullRemoteChanges fails safely when groupId is missing', async () => {
    await expect(pullRemoteChanges()).resolves.toEqual({
      applied: [],
      conflicts: [],
      error: 'groupId_required',
      ok: false,
    });
  });

  test('runSync returns failed push and pull without throwing when groupId is missing', async () => {
    const result = await runSync();

    expect(result.ok).toBe(false);
    expect(result.push.error).toBe('groupId_required');
    expect(result.pull.error).toBe('groupId_required');
  });

  test('pushPendingChanges marks accepted events and documents as synced', async () => {
    getPendingOutboxEvents.mockResolvedValue([
      {
        collection: 'recipes',
        createdAt: '2026-01-01T00:00:00.000Z',
        documentId: 'recipe_local_1',
        id: 'outbox_1',
        operation: 'create',
        payload: {},
      },
    ]);
    getDocument.mockResolvedValue({
      collection: 'recipes',
      data: {
        name: 'Pastel',
      },
      groupId: 'group_1',
      id: 'recipe_local_1',
      localVersion: 1,
      remoteId: null,
      serverVersion: null,
      syncStatus: 'pending',
    });
    const client = {
      pushChanges: jest.fn(async () => ({
        accepted: [
          {
            collection: 'recipes',
            eventId: 'outbox_1',
            localId: 'recipe_local_1',
            remoteId: 'remote_1',
            serverVersion: 1,
            syncedAt: '2026-01-01T00:00:01.000Z',
          },
        ],
        cursor: '1',
        rejected: [],
      })),
    };

    const result = await pushPendingChanges({
      client,
      groupId: 'group_1',
    });

    expect(result.ok).toBe(true);
    expect(client.pushChanges).toHaveBeenCalledWith({
      deviceId: 'device_local_1',
      events: [
        expect.objectContaining({
          collection: 'recipes',
          documentId: 'recipe_local_1',
          eventId: 'outbox_1',
          operation: 'create',
        }),
      ],
      groupId: 'group_1',
    });
    expect(markDocumentSynced).toHaveBeenCalledWith('recipes', 'recipe_local_1', {
      remoteId: 'remote_1',
      serverVersion: 1,
      syncedAt: '2026-01-01T00:00:01.000Z',
    });
    expect(markOutboxEventSynced).toHaveBeenCalledWith('outbox_1');
    expect(storeLastSyncCursor).not.toHaveBeenCalled();
  });

  test('pushPendingChanges can target one exact outbox event and exposes debug payload', async () => {
    getPendingOutboxEvents.mockResolvedValue([
      {
        collection: 'recipes',
        createdAt: '2026-01-01T00:00:00.000Z',
        documentId: 'old_recipe',
        id: 'old_outbox',
        operation: 'create',
        payload: {},
      },
      {
        collection: 'recipes',
        createdAt: '2026-01-01T00:00:01.000Z',
        documentId: 'dev_recipe',
        id: 'dev_outbox',
        operation: 'create',
        payload: {},
      },
    ]);
    getDocument.mockImplementation(async (collection, id) => ({
      collection,
      data: {
        name: id,
      },
      groupId: 'group_1',
      id,
      localVersion: 1,
      remoteId: null,
      serverVersion: null,
      syncStatus: 'pending',
    }));
    const client = {
      pushChanges: jest.fn(async () => ({
        accepted: [
          {
            collection: 'recipes',
            eventId: 'dev_outbox',
            localId: 'dev_recipe',
            remoteId: 'remote_dev',
            serverVersion: 1,
          },
        ],
        rejected: [],
      })),
    };

    const result = await pushPendingChanges({
      client,
      eventIds: ['dev_outbox'],
      groupId: 'group_1',
      includeDebug: true,
    });

    expect(result.accepted).toHaveLength(1);
    expect(result.debug.pushRequestPayload.events).toEqual([
      expect.objectContaining({
        documentId: 'dev_recipe',
        eventId: 'dev_outbox',
      }),
    ]);
    expect(client.pushChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        events: [
          expect.objectContaining({
            documentId: 'dev_recipe',
            eventId: 'dev_outbox',
          }),
        ],
      }),
    );
    expect(markOutboxEventSynced).toHaveBeenCalledWith('dev_outbox');
    expect(markOutboxEventSynced).not.toHaveBeenCalledWith('old_outbox');
  });

  test('pushPendingChanges handles rejected conflict events', async () => {
    getPendingOutboxEvents.mockResolvedValue([
      {
        collection: 'recipes',
        createdAt: '2026-01-01T00:00:00.000Z',
        documentId: 'recipe_local_1',
        id: 'outbox_1',
        operation: 'update',
        payload: {},
      },
    ]);
    getDocument.mockResolvedValue({
      collection: 'recipes',
      data: {
        name: 'Pastel local',
      },
      groupId: 'group_1',
      id: 'recipe_local_1',
      localVersion: 2,
      remoteId: 'remote_1',
      serverVersion: 1,
      syncStatus: 'pending',
    });
    const client = {
      pushChanges: jest.fn(async () => ({
        accepted: [],
        cursor: '2',
        rejected: [
          {
            conflictDocument: {
              document: {
                name: 'Pastel remoto',
              },
              remoteId: 'remote_1',
              serverVersion: 2,
            },
            currentServerVersion: 2,
            attemptedBaseServerVersion: 1,
            eventId: 'outbox_1',
            reason: 'conflict',
          },
        ],
      })),
    };

    const result = await pushPendingChanges({
      client,
      groupId: 'group_1',
    });

    expect(result.ok).toBe(false);
    expect(markDocumentConflict).toHaveBeenCalledWith('recipes', 'recipe_local_1', {
      serverVersion: 2,
    });
    expect(markOutboxEventConflict).toHaveBeenCalledWith(
      'outbox_1',
      expect.objectContaining({
        attemptedBaseServerVersion: 1,
        currentServerVersion: 2,
        eventId: 'outbox_1',
        reason: 'conflict',
      }),
    );
    expect(markOutboxEventFailed).not.toHaveBeenCalled();
    expect(markOutboxEventSynced).not.toHaveBeenCalled();
  });

  test('pushPendingChanges leaves outbox pending on network failure', async () => {
    getPendingOutboxEvents.mockResolvedValue([
      {
        collection: 'recipes',
        createdAt: '2026-01-01T00:00:00.000Z',
        documentId: 'recipe_local_1',
        id: 'outbox_1',
        operation: 'create',
        payload: {},
      },
    ]);
    getDocument.mockResolvedValue({
      collection: 'recipes',
      data: {
        name: 'Pastel',
      },
      groupId: 'group_1',
      id: 'recipe_local_1',
      localVersion: 1,
      remoteId: null,
      serverVersion: null,
      syncStatus: 'pending',
    });
    const error = new Error('network down');
    const client = {
      pushChanges: jest.fn(async () => {
        throw error;
      }),
    };

    const result = await pushPendingChanges({
      client,
      groupId: 'group_1',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('network down');
    expect(incrementOutboxAttempt).toHaveBeenCalledWith('outbox_1', error);
    expect(markOutboxEventSynced).not.toHaveBeenCalled();
    expect(markOutboxEventFailed).not.toHaveBeenCalled();
  });

  test('pullRemoteChanges applies remote changes without creating outbox and stores cursor', async () => {
    getLastSyncCursor.mockResolvedValue('3');
    getDocument.mockResolvedValue(null);
    const client = {
      pullChanges: jest.fn(async () => ({
        changes: [
          {
            collection: 'recipes',
            deletedAt: null,
            document: {
              groupId: 'group_1',
              localId: 'recipe_local_1',
              name: 'Pastel remoto',
            },
            remoteId: 'remote_1',
            serverVersion: 4,
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        cursor: '4',
        groupId: 'group_1',
      })),
    };

    const result = await pullRemoteChanges({
      client,
      groupId: 'group_1',
    });

    expect(result.ok).toBe(true);
    expect(client.pullChanges).toHaveBeenCalledWith({
      cursor: '3',
      groupId: 'group_1',
    });
    expect(saveRemoteDocument).toHaveBeenCalledWith('recipes', 'recipe_local_1', {
      data: {
        name: 'Pastel remoto',
      },
      deletedAt: null,
      deviceId: null,
      groupId: 'group_1',
      remoteId: 'remote_1',
      serverVersion: 4,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(storeLastSyncCursor).toHaveBeenCalledWith('group_1', '4');
  });

  test('pullRemoteChanges skips changes from another group', async () => {
    const client = {
      pullChanges: jest.fn(async () => ({
        changes: [
          {
            collection: 'recipes',
            document: {
              groupId: 'group_2',
              localId: 'recipe_local_2',
            },
            remoteId: 'remote_2',
            serverVersion: 2,
          },
        ],
        cursor: '2',
        groupId: 'group_1',
      })),
    };

    const result = await pullRemoteChanges({
      client,
      groupId: 'group_1',
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toEqual([
      {
        collection: 'recipes',
        reason: 'change_groupId_mismatch',
        remoteId: 'remote_2',
      },
    ]);
    expect(saveRemoteDocument).not.toHaveBeenCalled();
  });

  test('pullRemoteChanges marks conflict and does not overwrite pending local changes', async () => {
    getDocument.mockResolvedValue({
      collection: 'recipes',
      data: {
        name: 'Pastel local pendiente',
      },
      groupId: 'group_1',
      id: 'recipe_local_1',
      remoteId: 'remote_1',
      serverVersion: 1,
      syncStatus: 'pending',
    });
    const client = {
      pullChanges: jest.fn(async () => ({
        changes: [
          {
            collection: 'recipes',
            document: {
              groupId: 'group_1',
              localId: 'recipe_local_1',
              name: 'Pastel remoto',
            },
            remoteId: 'remote_1',
            serverVersion: 2,
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        cursor: '2',
        groupId: 'group_1',
      })),
    };

    const result = await pullRemoteChanges({
      client,
      groupId: 'group_1',
    });

    expect(result.ok).toBe(false);
    expect(result.conflicts).toEqual([
      expect.objectContaining({
        collection: 'recipes',
        localId: 'recipe_local_1',
        reason: 'local_pending_or_conflict',
      }),
    ]);
    expect(markDocumentConflict).toHaveBeenCalledWith('recipes', 'recipe_local_1', {
      serverVersion: 2,
    });
    expect(saveRemoteDocument).not.toHaveBeenCalled();
    expect(storeLastSyncCursor).toHaveBeenCalledWith('group_1', '2');
  });

  test('runSync performs push then pull in order', async () => {
    const calls = [];
    getPendingOutboxEvents.mockResolvedValue([
      {
        collection: 'recipes',
        createdAt: '2026-01-01T00:00:00.000Z',
        documentId: 'recipe_local_1',
        id: 'outbox_1',
        operation: 'create',
        payload: {},
      },
    ]);
    getDocument.mockResolvedValue({
      collection: 'recipes',
      data: {
        name: 'Pastel',
      },
      groupId: 'group_1',
      id: 'recipe_local_1',
      localVersion: 1,
      remoteId: null,
      serverVersion: null,
      syncStatus: 'pending',
    });
    const client = {
      pullChanges: jest.fn(async () => {
        calls.push('pull');
        return {
          changes: [],
          cursor: '1',
          groupId: 'group_1',
        };
      }),
      pushChanges: jest.fn(async () => {
        calls.push('push');
        return {
          accepted: [],
          cursor: '0',
          rejected: [],
        };
      }),
    };

    const result = await runSync({
      client,
      groupId: 'group_1',
    });

    expect(result.ok).toBe(true);
    expect(calls).toEqual(['push', 'pull']);
  });
});
