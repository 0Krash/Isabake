jest.mock('../db/documentStore', () => ({
  getDocumentsBySyncStatuses: jest.fn(async () => [
    {
      collection: 'recipes',
      groupId: 'group_1',
      id: 'recipe_conflict',
      syncStatus: 'conflict',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]),
  getDocumentsMissingGroupId: jest.fn(async () => [
    {
      collection: 'inventory',
      id: 'inventory_missing_group',
      syncStatus: 'pending',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]),
  getDocumentsReadyToSync: jest.fn(async () => [
    {
      collection: 'recipes',
      groupId: 'group_1',
      id: 'recipe_ready',
      syncStatus: 'pending',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]),
  getLocalPrivateDocuments: jest.fn(async () => [
    {
      collection: '__local_meta',
      id: 'currentWorkspace',
      syncStatus: 'local',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]),
}));

jest.mock('../sync/syncOutbox', () => ({
  getConflictOutboxCountsByCollection: jest.fn(async () => ({
    recipes: 1,
  })),
  getConflictOutboxEvents: jest.fn(async () => [
    {
      attempts: 0,
      collection: 'recipes',
      documentId: 'recipe_conflict',
      id: 'outbox_conflict',
      lastError: '{"reason":"conflict"}',
      operation: 'update',
      status: 'conflict',
    },
  ]),
  getFailedOutboxCountsByCollection: jest.fn(async () => ({})),
  getFailedOutboxEvents: jest.fn(async () => []),
  getPendingOutboxCountsByCollection: jest.fn(async () => ({
    recipes: 1,
  })),
  getPendingOutboxEvents: jest.fn(async () => [
    {
      attempts: 0,
      collection: 'recipes',
      documentId: 'recipe_ready',
      id: 'outbox_pending',
      lastError: null,
      operation: 'update',
      status: 'pending',
    },
  ]),
}));

jest.mock('../sync/syncStateRepository', () => ({
  getAllSyncStates: jest.fn(async () => [
    {
      groupId: 'group_1',
      lastSyncCursor: 'cursor_1',
      lastSyncedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]),
}));

import { runSyncReadinessCheck } from './syncReadinessCheck';

describe('syncReadinessCheck', () => {
  test('separates ready, private, and blocked shared records', async () => {
    const result = await runSyncReadinessCheck();

    expect(result.readyToSyncCount).toBe(1);
    expect(result.readyToSyncByCollection).toEqual({ recipes: 1 });
    expect(result.conflictDocumentCount).toBe(1);
    expect(result.resolvableConflictCount).toBe(1);
    expect(result.conflictDocumentsByCollection).toEqual({ recipes: 1 });
    expect(result.conflictOutboxCount).toBe(1);
    expect(result.conflictOutboxByCollection).toEqual({ recipes: 1 });
    expect(result.pendingOutboxCount).toBe(1);
    expect(result.localPrivateDocumentsCount).toBe(1);
    expect(result.localPrivateDocumentsByCollection).toEqual({
      __local_meta: 1,
    });
    expect(result.blockedFromSyncBecauseGroupIdMissingCount).toBe(1);
    expect(result.blockedFromSyncBecauseGroupIdMissingByCollection).toEqual({
      inventory: 1,
    });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'shared_documents_missing_groupId',
        }),
        expect.objectContaining({
          code: 'sync_conflicts_present',
        }),
        expect.objectContaining({
          code: 'conflict_outbox_events_present',
        }),
      ]),
    );
  });
});
