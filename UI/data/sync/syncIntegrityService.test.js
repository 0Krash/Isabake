jest.mock('../workspace/workspaceRepository', () => ({
  getCurrentWorkspace: jest.fn(async () => ({
    groupId: 'group_1',
    isRemote: true,
    name: 'Compartido',
  })),
}));

jest.mock('./syncIntegrityRepository', () => ({
  getIntegrityDocuments: jest.fn(async () => []),
  getIntegrityOutboxEvents: jest.fn(async () => []),
  getStaleOutboxCutoffIso: jest.fn(() => '2026-01-01T00:00:00.000Z'),
  markDocumentPendingForRepair: jest.fn(),
}));

jest.mock('../db/documentStore', () => ({
  assignDocumentGroupId: jest.fn(),
  getDocument: jest.fn(),
}));

jest.mock('./syncOutbox', () => ({
  addOutboxEvent: jest.fn(async () => 'outbox_repair_1'),
  markOutboxEventAsFailed: jest.fn(),
  requeueOutboxEvent: jest.fn(),
}));

jest.mock('./syncHistoryService', () => ({
  finishSyncHistoryRun: jest.fn(),
  safelyRecordSyncHistory: jest.fn((operation) => operation()),
  startSyncHistoryRun: jest.fn(async () => ({
    actionType: 'integrity_check',
    runId: 'run_1',
    startedAt: '2026-01-01T00:00:00.000Z',
  })),
}));

import {
  assignDocumentGroupId,
  getDocument,
} from '../db/documentStore';
import {
  addOutboxEvent,
  markOutboxEventAsFailed,
  requeueOutboxEvent,
} from './syncOutbox';
import {
  getIntegrityDocuments,
  getIntegrityOutboxEvents,
  markDocumentPendingForRepair,
} from './syncIntegrityRepository';
import {
  checkSyncIntegrity,
  previewSyncRepair,
  runSyncRepair,
  SYNC_REPAIR_SCOPES,
} from './syncIntegrityService';

const createDocument = (overrides = {}) => ({
  collection: 'recipes',
  data: {
    name: 'Pan',
  },
  deletedAt: null,
  groupId: 'group_1',
  id: 'recipe_1',
  remoteId: null,
  serverVersion: null,
  syncStatus: 'pending',
  ...overrides,
});

describe('syncIntegrityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getIntegrityDocuments.mockResolvedValue([]);
    getIntegrityOutboxEvents.mockResolvedValue([]);
    getDocument.mockResolvedValue(null);
  });

  test('detects pending document without pending outbox', async () => {
    getIntegrityDocuments.mockResolvedValueOnce([createDocument()]);

    const result = await checkSyncIntegrity({
      groupId: 'group_1',
      recordHistory: false,
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'pending_doc_missing_outbox',
        collection: 'recipes',
        localId: 'recipe_1',
        repairable: true,
      }),
    ]);
  });

  test('detects synced document without remoteId', async () => {
    getIntegrityDocuments.mockResolvedValueOnce([
      createDocument({
        remoteId: null,
        syncStatus: 'synced',
      }),
    ]);

    const result = await checkSyncIntegrity({
      groupId: 'group_1',
      recordHistory: false,
    });

    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'synced_doc_without_remote_id',
        repairable: true,
      }),
    ]);
  });

  test('detects synced document missing on backend', async () => {
    getIntegrityDocuments.mockResolvedValueOnce([
      createDocument({
        remoteId: 'remote_1',
        serverVersion: 3,
        syncStatus: 'synced',
      }),
    ]);
    const client = {
      verifyRemoteDocuments: jest.fn(async () => ({
        groupId: 'group_1',
        results: [
          {
            collection: 'recipes',
            exists: false,
            remoteId: 'remote_1',
            status: 'missing',
          },
        ],
      })),
    };

    const result = await checkSyncIntegrity({
      client,
      groupId: 'group_1',
      recordHistory: false,
      verifyRemote: true,
    });

    expect(client.verifyRemoteDocuments).toHaveBeenCalledWith({
      documents: [
        {
          collection: 'recipes',
          remoteId: 'remote_1',
          serverVersion: 3,
        },
      ],
      groupId: 'group_1',
    });
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'synced_doc_missing_backend',
        repairable: true,
      }),
    ]);
  });

  test('detects outbox referencing missing document', async () => {
    getIntegrityOutboxEvents.mockResolvedValueOnce([
      {
        collection: 'recipes',
        createdAt: '2026-01-02T00:00:00.000Z',
        documentId: 'recipe_missing',
        id: 'outbox_1',
        operation: 'update',
        status: 'pending',
      },
    ]);

    const result = await checkSyncIntegrity({
      groupId: 'group_1',
      recordHistory: false,
    });

    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'outbox_missing_document',
        localId: 'recipe_missing',
        repairable: true,
      }),
    ]);
  });

  test('detects ungrouped local document and deleted document missing delete outbox', async () => {
    getIntegrityDocuments.mockResolvedValueOnce([
      createDocument({
        groupId: null,
        id: 'recipe_ungrouped',
        syncStatus: 'synced',
      }),
      createDocument({
        deletedAt: '2026-01-02T00:00:00.000Z',
        id: 'recipe_deleted',
        syncStatus: 'pending',
      }),
    ]);

    const result = await checkSyncIntegrity({
      groupId: 'group_1',
      recordHistory: false,
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'local_doc_missing_groupId',
          localId: 'recipe_ungrouped',
        }),
        expect.objectContaining({
          code: 'deleted_doc_missing_delete_outbox',
          localId: 'recipe_deleted',
        }),
      ]),
    );
  });

  test('preview does not mutate data', async () => {
    getIntegrityDocuments.mockResolvedValueOnce([createDocument()]);

    const result = await previewSyncRepair({
      groupId: 'group_1',
      scope: SYNC_REPAIR_SCOPES.OUTBOX,
    });

    expect(result.repairableCount).toBe(1);
    expect(addOutboxEvent).not.toHaveBeenCalled();
    expect(markDocumentPendingForRepair).not.toHaveBeenCalled();
  });

  test('repair requires confirm', async () => {
    await expect(runSyncRepair({ groupId: 'group_1' })).resolves.toEqual({
      error: 'confirm_required',
      ok: false,
      repairedCount: 0,
      scope: SYNC_REPAIR_SCOPES.OUTBOX,
    });
    expect(addOutboxEvent).not.toHaveBeenCalled();
  });

  test('repair creates outbox for missing backend and does not delete business data', async () => {
    const document = createDocument({
      remoteId: 'remote_1',
      serverVersion: 3,
      syncStatus: 'synced',
    });
    getIntegrityDocuments.mockResolvedValueOnce([document]);
    getDocument.mockResolvedValueOnce(document);
    const client = {
      verifyRemoteDocuments: jest.fn(async () => ({
        groupId: 'group_1',
        results: [
          {
            collection: 'recipes',
            exists: false,
            remoteId: 'remote_1',
            status: 'missing',
          },
        ],
      })),
    };

    const result = await runSyncRepair({
      client,
      confirm: true,
      groupId: 'group_1',
      scope: SYNC_REPAIR_SCOPES.MISSING_BACKEND,
    });

    expect(result.ok).toBe(true);
    expect(markDocumentPendingForRepair).toHaveBeenCalledWith(
      'recipes',
      'recipe_1',
      expect.any(Object),
    );
    expect(addOutboxEvent).toHaveBeenCalledWith(
      'recipes',
      'recipe_1',
      'update',
      {
        id: 'recipe_1',
        remoteId: 'remote_1',
      },
      expect.any(Object),
    );
    expect(markOutboxEventAsFailed).not.toHaveBeenCalled();
  });

  test('repair can assign ungrouped local data only in explicit scope', async () => {
    getIntegrityDocuments.mockResolvedValueOnce([
      createDocument({
        groupId: null,
        id: 'recipe_ungrouped',
      }),
    ]);

    const result = await runSyncRepair({
      confirm: true,
      groupId: 'group_1',
      scope: SYNC_REPAIR_SCOPES.UNGROUPED,
    });

    expect(result.repairedCount).toBe(1);
    expect(assignDocumentGroupId).toHaveBeenCalledWith(
      'recipes',
      'recipe_ungrouped',
      'group_1',
      expect.any(Object),
    );
  });

  test('repair requeues failed outbox and marks orphan outbox failed', async () => {
    getIntegrityDocuments.mockResolvedValueOnce([
      createDocument({
        remoteId: 'remote_1',
        serverVersion: 1,
        syncStatus: 'synced',
      }),
    ]);
    getIntegrityOutboxEvents
      .mockResolvedValueOnce([
        {
          collection: 'recipes',
          createdAt: '2026-01-02T00:00:00.000Z',
          documentId: 'recipe_1',
          id: 'outbox_failed',
          operation: 'update',
          status: 'failed',
        },
        {
          collection: 'recipes',
          createdAt: '2026-01-02T00:00:00.000Z',
          documentId: 'recipe_missing',
          id: 'outbox_orphan',
          operation: 'update',
          status: 'pending',
        },
      ])
      .mockResolvedValueOnce([
        {
          collection: 'recipes',
          documentId: 'recipe_1',
          id: 'outbox_failed',
          status: 'failed',
        },
      ])
      .mockResolvedValueOnce([
        {
          collection: 'recipes',
          documentId: 'recipe_missing',
          id: 'outbox_orphan',
          status: 'pending',
        },
      ]);

    const result = await runSyncRepair({
      confirm: true,
      groupId: 'group_1',
      scope: SYNC_REPAIR_SCOPES.OUTBOX,
    });

    expect(result.repairedCount).toBe(2);
    expect(requeueOutboxEvent).toHaveBeenCalledWith(
      'outbox_failed',
      expect.any(Object),
    );
    expect(markOutboxEventAsFailed).toHaveBeenCalledWith(
      'outbox_orphan',
      'orphaned_outbox_event',
      expect.any(Object),
    );
  });

  test('repair does not auto-resolve conflicts', async () => {
    getIntegrityDocuments.mockResolvedValueOnce([
      createDocument({
        id: 'recipe_conflict',
        syncStatus: 'conflict',
      }),
    ]);

    const result = await runSyncRepair({
      confirm: true,
      groupId: 'group_1',
      scope: SYNC_REPAIR_SCOPES.FULL,
    });

    expect(result.repairedCount).toBe(0);
    expect(addOutboxEvent).not.toHaveBeenCalled();
  });
});
