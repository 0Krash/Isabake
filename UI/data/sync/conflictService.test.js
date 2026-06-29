const mockDocuments = new Map();
const mockConflictOutboxEvents = [];
const mockPendingOutboxEvents = [];

jest.mock('../db/documentStore', () => ({
  getConflictDocuments: jest.fn(async () =>
    Array.from(mockDocuments.values()).filter(
      (document) => document.syncStatus === 'conflict',
    ),
  ),
  getDocument: jest.fn(async (collection, id) =>
    mockDocuments.get(`${collection}:${id}`) || null,
  ),
  preferRemoteVersion: jest.fn(async (collection, id, remoteDocument) => {
    const document = {
      collection,
      data: remoteDocument.document,
      groupId: remoteDocument.document?.groupId,
      id,
      remoteId: remoteDocument.remoteId,
      serverVersion: remoteDocument.serverVersion,
      syncStatus: 'synced',
    };
    mockDocuments.set(`${collection}:${id}`, document);
    return document;
  }),
  saveDocument: jest.fn(async (collection, id, data, options = {}) => {
    const document = {
      collection,
      data,
      groupId: options.groupId,
      id,
      syncStatus: options.syncStatus || 'pending',
    };
    mockDocuments.set(`${collection}:${id}`, document);
    mockPendingOutboxEvents.push({
      collection,
      documentId: id,
      id: `pending_${mockPendingOutboxEvents.length + 1}`,
      status: 'pending',
    });
    return document;
  }),
  updateSyncStatus: jest.fn(async (collection, id, syncStatus) => {
    const document = mockDocuments.get(`${collection}:${id}`);
    document.syncStatus = syncStatus;
    return document;
  }),
}));

jest.mock('./syncOutbox', () => ({
  addOutboxEvent: jest.fn(async (collection, documentId, operation, payload) => {
    const event = {
      collection,
      documentId,
      id: `pending_${mockPendingOutboxEvents.length + 1}`,
      operation,
      payload,
      status: 'pending',
    };
    mockPendingOutboxEvents.push(event);
    return event.id;
  }),
  getConflictOutboxEvents: jest.fn(async () => mockConflictOutboxEvents),
  getPendingOutboxEventsForDocument: jest.fn(async (collection, documentId) =>
    mockPendingOutboxEvents.filter(
      (event) =>
        event.collection === collection && event.documentId === documentId,
    ),
  ),
  markOutboxEventResolved: jest.fn(async (id, resolution) => {
    const event = mockConflictOutboxEvents.find((item) => item.id === id);
    if (event) {
      event.status = 'done';
      event.lastError = JSON.stringify(resolution);
    }
  }),
}));

import {
  getConflictDetails,
  getConflictResolutionCapabilities,
  getLatestResolvableConflict,
  getResolvableConflicts,
  getConflictSummary,
  isConflictResolvablePreferLocal,
  isConflictResolvablePreferRemote,
  markConflictResolvedManually,
  resolveConflictPreferLocal,
  resolveConflictPreferRemote,
} from './conflictService';

describe('conflictService', () => {
  beforeEach(() => {
    mockDocuments.clear();
    mockConflictOutboxEvents.length = 0;
    mockPendingOutboxEvents.length = 0;
    mockDocuments.set('recipes:recipe_1', {
      collection: 'recipes',
      data: {
        name: 'Local',
      },
      groupId: 'group_1',
      id: 'recipe_1',
      localVersion: 3,
      remoteId: 'remote_1',
      serverVersion: 1,
      syncStatus: 'conflict',
    });
    mockConflictOutboxEvents.push({
      collection: 'recipes',
      documentId: 'recipe_1',
      id: 'outbox_conflict_1',
      lastError: JSON.stringify({
        attemptedBaseServerVersion: 1,
        conflictDocument: {
          document: {
            groupId: 'group_1',
            name: 'Remote',
          },
          remoteId: 'remote_1',
          serverVersion: 2,
        },
        currentServerVersion: 2,
        rejectedAt: '2026-01-01T00:00:00.000Z',
      }),
      operation: 'update',
      status: 'conflict',
    });
  });

  test('getConflictSummary returns counts by collection', async () => {
    await expect(getConflictSummary()).resolves.toEqual(
      expect.objectContaining({
        conflictDocumentCount: 1,
        conflictOutboxCount: 1,
        conflictsByCollection: { recipes: 1 },
        preferLocalResolvableCount: 1,
        preferRemoteResolvableCount: 1,
        resolvableConflictCount: 1,
        unresolvedMissingRemoteCount: 0,
      }),
    );
  });

  test('getConflictDetails returns local and remote metadata', async () => {
    const details = await getConflictDetails({
      collection: 'recipes',
      documentId: 'recipe_1',
    });

    expect(details.localData).toEqual({ name: 'Local' });
    expect(details.remoteDocument.document.name).toBe('Remote');
    expect(details.attemptedBaseServerVersion).toBe(1);
    expect(details.currentServerVersion).toBe(2);
    expect(details.resolvablePreferLocal).toBe(true);
    expect(details.resolvablePreferRemote).toBe(true);
  });

  test('resolvability helpers detect missing remote and local data', () => {
    expect(
      isConflictResolvablePreferRemote({
        conflictMetadata: {
          conflictDocument: {
            document: { name: 'Remote' },
          },
        },
      }),
    ).toBe(true);
    expect(isConflictResolvablePreferRemote({ localData: { name: 'Local' } }))
      .toBe(false);
    expect(
      isConflictResolvablePreferLocal({
        localData: { name: 'Local' },
        localDocument: { id: 'recipe_1' },
      }),
    ).toBe(true);
    expect(getConflictResolutionCapabilities({})).toEqual({
      missingLocalDocument: true,
      missingRemoteDocument: true,
      resolvablePreferLocal: false,
      resolvablePreferRemote: false,
    });
  });

  test('preferRemote selector skips conflicts without remote document', async () => {
    mockDocuments.set('recipes:recipe_missing_remote', {
      collection: 'recipes',
      data: { name: 'Only local' },
      groupId: 'group_1',
      id: 'recipe_missing_remote',
      syncStatus: 'conflict',
      updatedAt: '2026-01-03T00:00:00.000Z',
    });

    const conflicts = await getResolvableConflicts({
      resolutionType: 'preferRemote',
    });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].localDocument.id).toBe('recipe_1');
  });

  test('preferRemote selector chooses latest resolvable conflict', async () => {
    mockDocuments.get('recipes:recipe_1').updatedAt =
      '2026-01-01T00:00:00.000Z';
    mockDocuments.set('recipes:recipe_2', {
      collection: 'recipes',
      data: { name: 'Local 2' },
      groupId: 'group_1',
      id: 'recipe_2',
      syncStatus: 'conflict',
      updatedAt: '2026-01-04T00:00:00.000Z',
    });
    mockConflictOutboxEvents.push({
      collection: 'recipes',
      documentId: 'recipe_2',
      id: 'outbox_conflict_2',
      lastError: JSON.stringify({
        conflictDocument: {
          document: { groupId: 'group_1', name: 'Remote 2' },
          remoteId: 'remote_2',
          serverVersion: 3,
        },
      }),
      operation: 'update',
      status: 'conflict',
    });

    const { conflict } = await getLatestResolvableConflict({
      resolutionType: 'preferRemote',
    });

    expect(conflict.localDocument.id).toBe('recipe_2');
  });

  test('preferRemote applies remote data without creating outbox', async () => {
    const result = await resolveConflictPreferRemote({
      collection: 'recipes',
      documentId: 'recipe_1',
    });

    expect(result.document).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Remote' }),
        syncStatus: 'synced',
      }),
    );
    expect(mockPendingOutboxEvents).toEqual([]);
    expect(mockConflictOutboxEvents[0].status).toBe('done');
  });

  test('preferLocal keeps local data and creates pending outbox', async () => {
    const result = await resolveConflictPreferLocal({
      collection: 'recipes',
      documentId: 'recipe_1',
    });

    expect(result.document.data.name).toBe('Local');
    expect(result.document.syncStatus).toBe('pending');
    expect(mockPendingOutboxEvents).toEqual([
      expect.objectContaining({
        documentId: 'recipe_1',
        operation: 'update',
        status: 'pending',
      }),
    ]);
    expect(mockConflictOutboxEvents[0].status).toBe('done');
  });

  test('manual resolution requires notes or final document', async () => {
    await expect(
      markConflictResolvedManually({
        collection: 'recipes',
        documentId: 'recipe_1',
      }),
    ).rejects.toThrow('notes o finalDocument requerido');

    await expect(
      markConflictResolvedManually({
        collection: 'recipes',
        documentId: 'recipe_1',
        notes: 'Reviewed manually',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        resolution: 'manual',
        resolvedOutboxCount: 1,
      }),
    );
  });
});
