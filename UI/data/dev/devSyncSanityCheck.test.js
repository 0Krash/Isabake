jest.mock('../auth/authService', () => ({
  getFreshAuthSession: jest.fn(),
}));

jest.mock('../db/documentStore', () => ({
  getDocument: jest.fn(),
  saveDocument: jest.fn(),
}));

jest.mock('../db/localIds', () => ({
  createLocalId: jest.fn(),
}));

jest.mock('../repositories/inventoryRepository', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock('../repositories/recipeRepository', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock('../repositories/transactionRepository', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock('../workspace/workspaceRepository', () => ({
  getCurrentWorkspace: jest.fn(),
}));

jest.mock('../sync/syncOutbox', () => ({
  getOutboxEventById: jest.fn(),
  getPendingOutboxEventsForDocument: jest.fn(),
}));

jest.mock('../sync/autoSyncService', () => ({
  getAutoSyncDecisionTrace: jest.fn(),
  getAutoSyncDiagnostics: jest.fn(),
  notifyAutoSyncNeeded: jest.fn(),
  setAutoSyncEnabled: jest.fn(),
  startAutoSync: jest.fn(),
}));

jest.mock('../sync/syncService', () => ({
  runSync: jest.fn(),
}));

jest.mock('../sync/syncHistoryService', () => ({
  finishSyncHistoryRun: jest.fn(),
  getLatestSyncHistory: jest.fn(),
  getSyncHistoryWorkspaceName: jest.fn((workspace = {}) => workspace.name),
  safelyRecordSyncHistory: jest.fn((operation) => operation()),
  startSyncHistoryRun: jest.fn(),
}));

import {
  runAutoSyncBusinessWriteCheck,
  runAutoSyncDecisionTraceCheck,
  runBusinessWriteAutoSyncCheck,
  runBusinessSyncSanityCheck,
  runSyncSanityCheck,
} from './devSyncSanityCheck';

describe('devSyncSanityCheck', () => {
  const session = {
    sessionState: 'authenticated',
    userId: 'user_1',
  };
  const workspace = {
    groupId: 'group_1',
    isRemote: true,
    name: 'Panaderia',
  };
  const makeBusinessRepos = () => ({
    inventoryRepo: {
      create: jest.fn(async (_data, options) => ({
        groupId: options.groupId,
        id: options.id,
        syncStatus: 'pending',
      })),
    },
    recipeRepo: {
      create: jest.fn(async (_data, options) => ({
        groupId: options.groupId,
        id: options.id,
        syncStatus: 'pending',
      })),
    },
    transactionRepo: {
      create: jest.fn(async (_data, options) => ({
        groupId: options.groupId,
        id: options.id,
        syncStatus: 'pending',
      })),
    },
  });

  test('fails safely without auth', async () => {
    await expect(
      runSyncSanityCheck({
        getSession: jest.fn(async () => {
          throw new Error('auth_required');
        }),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        error: 'auth_required',
        failedStep: 'auth_required',
        ok: false,
      }),
    );
  });

  test('fails safely without shared workspace', async () => {
    await expect(
      runSyncSanityCheck({
        getSession: jest.fn(async () => session),
        getWorkspace: jest.fn(async () => ({
          groupId: 'local_1',
          isRemote: false,
        })),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        error: 'shared_workspace_required',
        failedStep: 'shared_workspace_required',
        ok: false,
      }),
    );
  });

  test('creates outbox, runs sync, verifies local synced document and history', async () => {
    const localId = 'dev_check_sync_sanity_1';
    const saveDoc = jest.fn(async () => ({
      groupId: 'group_1',
      id: localId,
      syncStatus: 'pending',
    }));
    const getOutboxForDocument = jest.fn(async () => [
      {
        id: 'outbox_1',
        status: 'pending',
      },
    ]);
    const runSyncFn = jest.fn(async () => ({
      ok: true,
      pull: {
        applied: [],
        conflicts: [],
        skipped: [],
      },
      push: {
        accepted: [{ eventId: 'outbox_1' }],
        rejected: [],
        skipped: [],
      },
    }));
    const getDoc = jest.fn(async () => ({
      groupId: 'group_1',
      id: localId,
      remoteId: 'remote_1',
      serverVersion: 1,
      syncStatus: 'synced',
    }));
    const getOutboxById = jest.fn(async () => ({
      id: 'outbox_1',
      status: 'done',
    }));
    const startHistory = jest.fn(async () => ({
      runId: 'run_1',
      startedAt: '2026-01-01T00:00:00.000Z',
    }));
    const finishHistory = jest.fn(async () => null);
    const getLatestHistory = jest.fn(async () => ({
      status: 'success',
    }));

    const result = await runSyncSanityCheck({
      createId: jest.fn(() => localId),
      finishHistory,
      getDoc,
      getLatestHistory,
      getOutboxById,
      getOutboxForDocument,
      getSession: jest.fn(async () => session),
      getWorkspace: jest.fn(async () => workspace),
      runSyncFn,
      saveDoc,
      startHistory,
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'syncSanityCheck',
        ok: true,
      }),
    );
    expect(saveDoc).toHaveBeenCalledWith(
      'recipes',
      localId,
      expect.objectContaining({
        name: expect.stringContaining('dev_check_sync_sanity'),
      }),
      { groupId: 'group_1' },
    );
    expect(runSyncFn).toHaveBeenCalledWith({
      client: undefined,
      groupId: 'group_1',
    });
    expect(startHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'full_sync',
        triggerSource: 'dev_check',
      }),
    );
    expect(finishHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
      }),
    );
    expect(JSON.stringify(result)).not.toMatch(
      /accessToken|refreshToken|Authorization|Bearer|passwordHash|inviteTokenHash/i,
    );
  });

  test('business sanity check fails safely without auth', async () => {
    await expect(
      runBusinessSyncSanityCheck({
        getSession: jest.fn(async () => {
          throw new Error('auth_required');
        }),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        error: 'auth_required',
        failedStep: 'auth_required',
        name: 'businessSyncSanityCheck',
        ok: false,
      }),
    );
  });

  test('business sanity check fails safely without shared workspace', async () => {
    await expect(
      runBusinessSyncSanityCheck({
        getSession: jest.fn(async () => session),
        getWorkspace: jest.fn(async () => ({
          groupId: 'local_1',
          isRemote: false,
        })),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        error: 'shared_workspace_required',
        failedStep: 'shared_workspace_required',
        name: 'businessSyncSanityCheck',
        ok: false,
      }),
    );
  });

  test('business sanity creates recipe inventory and transaction then verifies backend', async () => {
    const ids = [
      'dev_recipe_1',
      'dev_inventory_1',
      'dev_transaction_1',
    ];
    const createId = jest.fn(() => ids.shift());
    const recipeRepo = {
      create: jest.fn(async (_data, options) => ({
        groupId: options.groupId,
        id: options.id,
        syncStatus: 'pending',
      })),
    };
    const inventoryRepo = {
      create: jest.fn(async (_data, options) => ({
        groupId: options.groupId,
        id: options.id,
        syncStatus: 'pending',
      })),
    };
    const transactionRepo = {
      create: jest.fn(async (_data, options) => ({
        groupId: options.groupId,
        id: options.id,
        syncStatus: 'pending',
      })),
    };
    const getOutboxForDocument = jest.fn(async (_collection, localId) => [
      {
        id: `outbox_${localId}`,
        status: 'pending',
      },
    ]);
    const runSyncFn = jest.fn(async () => ({
      ok: true,
      pull: {
        applied: [],
        conflicts: [],
        skipped: [],
      },
      push: {
        accepted: [
          { eventId: 'outbox_dev_recipe_1' },
          { eventId: 'outbox_dev_inventory_1' },
          { eventId: 'outbox_dev_transaction_1' },
        ],
        rejected: [],
        skipped: [],
      },
    }));
    const getOutboxById = jest.fn(async (eventId) => ({
      id: eventId,
      status: 'done',
    }));
    const syncedDocuments = {
      inventory: {
        collection: 'inventory',
        groupId: 'group_1',
        id: 'dev_inventory_1',
        remoteId: 'remote_inventory_1',
        serverVersion: 2,
        syncStatus: 'synced',
      },
      recipes: {
        collection: 'recipes',
        groupId: 'group_1',
        id: 'dev_recipe_1',
        remoteId: 'remote_recipe_1',
        serverVersion: 1,
        syncStatus: 'synced',
      },
      transactions: {
        collection: 'transactions',
        groupId: 'group_1',
        id: 'dev_transaction_1',
        remoteId: 'remote_transaction_1',
        serverVersion: 3,
        syncStatus: 'synced',
      },
    };
    const getDoc = jest.fn(async (collection) => syncedDocuments[collection]);
    const client = {
      verifyRemoteDocuments: jest.fn(async () => ({
        groupId: 'group_1',
        results: [
          { status: 'ok' },
          { status: 'ok' },
          { status: 'ok' },
        ],
      })),
    };

    const result = await runBusinessSyncSanityCheck({
      client,
      createId,
      getDoc,
      getOutboxById,
      getOutboxForDocument,
      getSession: jest.fn(async () => session),
      getWorkspace: jest.fn(async () => workspace),
      inventoryRepo,
      recipeRepo,
      runSyncFn,
      transactionRepo,
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'businessSyncSanityCheck',
        ok: true,
      }),
    );
    expect(recipeRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipeId: 'dev_recipe_1',
      }),
      {
        groupId: 'group_1',
        id: 'dev_recipe_1',
      },
    );
    expect(inventoryRepo.create).toHaveBeenCalled();
    expect(transactionRepo.create).toHaveBeenCalled();
    expect(runSyncFn).toHaveBeenCalledWith({
      client,
      groupId: 'group_1',
    });
    expect(client.verifyRemoteDocuments).toHaveBeenCalledWith({
      documents: [
        {
          collection: 'recipes',
          remoteId: 'remote_recipe_1',
          serverVersion: 1,
        },
        {
          collection: 'inventory',
          remoteId: 'remote_inventory_1',
          serverVersion: 2,
        },
        {
          collection: 'transactions',
          remoteId: 'remote_transaction_1',
          serverVersion: 3,
        },
      ],
      groupId: 'group_1',
    });
    expect(JSON.stringify(result)).not.toMatch(
      /accessToken|refreshToken|Authorization|Bearer|passwordHash|inviteTokenHash/i,
    );
  });

  test('auto-sync business write check verifies notification schedule sync and backend', async () => {
    const repos = makeBusinessRepos();
    const createId = jest.fn((prefix) => `${prefix}_1`);
    const getOutboxForDocument = jest.fn(async (collection, localId) => [
      {
        id: `outbox_${collection}_${localId}`,
        status: 'pending',
      },
    ]);
    const getDiagnostics = jest
      .fn()
      .mockResolvedValueOnce({
        autoSyncState: 'scheduled',
        lastNotifyReason: 'local_change',
        pendingOutboxCount: 3,
        scheduled: true,
      })
      .mockResolvedValueOnce({
        autoSyncState: 'idle',
        lastRunFinishedAt: '2026-01-01T00:00:03.000Z',
        lastRunStartedAt: '2026-01-01T00:00:02.000Z',
        lastSyncHistoryStatus: 'success',
      });
    const getOutboxById = jest.fn(async (id) => ({
      id,
      status: 'done',
    }));
    const getDoc = jest.fn(async (collection, localId) => ({
      collection,
      groupId: 'group_1',
      id: localId,
      remoteId: `remote_${localId}`,
      serverVersion: 1,
      syncStatus: 'synced',
    }));
    const client = {
      verifyRemoteDocuments: jest.fn(async () => ({
        results: [{ status: 'ok' }],
      })),
    };

    const result = await runAutoSyncBusinessWriteCheck({
      client,
      createId,
      getDiagnostics,
      getDoc,
      getOutboxById,
      getOutboxForDocument,
      getSession: jest.fn(async () => session),
      getWorkspace: jest.fn(async () => workspace),
      ...repos,
      setAutoSync: jest.fn(async () => ({ autoSyncEnabled: true })),
      waitForAutoSync: jest.fn(async () => null),
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'autoSyncBusinessWriteCheck',
        ok: true,
      }),
    );
    expect(repos.recipeRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipeId: 'dev_check_auto_sync_business_recipe_1',
      }),
      {
        groupId: 'group_1',
        id: 'dev_check_auto_sync_business_recipe_1',
      },
    );
    expect(repos.inventoryRepo.create).toHaveBeenCalled();
    expect(repos.transactionRepo.create).toHaveBeenCalled();
    expect(client.verifyRemoteDocuments).toHaveBeenCalledWith({
      documents: [
        {
          collection: 'recipes',
          remoteId: 'remote_dev_check_auto_sync_business_recipe_1',
          serverVersion: 1,
        },
        {
          collection: 'inventory',
          remoteId: 'remote_dev_check_auto_sync_business_inventory_1',
          serverVersion: 1,
        },
        {
          collection: 'transactions',
          remoteId: 'remote_dev_check_auto_sync_business_transaction_1',
          serverVersion: 1,
        },
      ],
      groupId: 'group_1',
    });
    expect(JSON.stringify(result)).not.toMatch(
      /accessToken|refreshToken|Authorization|Bearer|passwordHash|inviteTokenHash/i,
    );
  });

  test('auto-sync business write check reports missing outbox', async () => {
    const result = await runAutoSyncBusinessWriteCheck({
      createId: jest.fn(() => 'auto_recipe_1'),
      getOutboxForDocument: jest.fn(async () => []),
      getSession: jest.fn(async () => session),
      getWorkspace: jest.fn(async () => workspace),
      ...makeBusinessRepos(),
      setAutoSync: jest.fn(async () => ({ autoSyncEnabled: true })),
    });

    expect(result).toEqual(
      expect.objectContaining({
        error: 'no_outbox',
        failedStep: 'outbox_pending',
        name: 'autoSyncBusinessWriteCheck',
        ok: false,
      }),
    );
  });

  test('auto-sync business write check reports missing notification or schedule', async () => {
    const baseOptions = {
      createId: jest.fn(() => 'auto_recipe_1'),
      getOutboxForDocument: jest.fn(async () => [
        {
          id: 'outbox_auto_1',
          status: 'pending',
        },
      ]),
      getSession: jest.fn(async () => session),
      getWorkspace: jest.fn(async () => workspace),
      ...makeBusinessRepos(),
      setAutoSync: jest.fn(async () => ({ autoSyncEnabled: true })),
    };

    await expect(
      runAutoSyncBusinessWriteCheck({
        ...baseOptions,
        getDiagnostics: jest.fn(async () => ({
          autoSyncState: 'idle',
          scheduled: false,
        })),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        error: 'no_autoSync_notification',
        failedStep: 'auto_sync_notification',
      }),
    );

    await expect(
      runAutoSyncBusinessWriteCheck({
        ...baseOptions,
        getDiagnostics: jest.fn(async () => ({
          autoSyncState: 'idle',
          lastNotifyReason: 'local_change',
          scheduled: false,
        })),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        error: 'no_autoSync_schedule',
        failedStep: 'auto_sync_schedule',
      }),
    );
  });

  test('auto-sync business write check reports skipped guard and failed run', async () => {
    const baseOptions = {
      createId: jest.fn(() => 'auto_recipe_1'),
      getOutboxForDocument: jest.fn(async () => [
        {
          id: 'outbox_auto_1',
          status: 'pending',
        },
      ]),
      getSession: jest.fn(async () => session),
      getWorkspace: jest.fn(async () => workspace),
      ...makeBusinessRepos(),
      setAutoSync: jest.fn(async () => ({ autoSyncEnabled: true })),
      waitForAutoSync: jest.fn(async () => null),
    };

    await expect(
      runAutoSyncBusinessWriteCheck({
        ...baseOptions,
        getDiagnostics: jest
          .fn()
          .mockResolvedValueOnce({
            lastNotifyReason: 'local_change',
            scheduled: true,
          })
          .mockResolvedValueOnce({
            autoSyncState: 'skipped_conflicts',
            lastSkippedReason: 'conflicts_pending',
          }),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        error: 'skipped_by_guard',
        failedStep: 'auto_sync_guard',
      }),
    );

    await expect(
      runAutoSyncBusinessWriteCheck({
        ...baseOptions,
        getDiagnostics: jest
          .fn()
          .mockResolvedValueOnce({
            lastNotifyReason: 'local_change',
            scheduled: true,
          })
          .mockResolvedValueOnce({
            autoSyncState: 'failed',
            lastErrorCode: 'network_error',
            lastRunStartedAt: '2026-01-01T00:00:02.000Z',
            lastSyncHistoryStatus: 'failed',
          }),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        error: 'runSync_failed',
        failedStep: 'auto_sync_run',
      }),
    );
  });

  test('business-write auto-sync check alias uses the same guarded diagnostic', async () => {
    await expect(
      runBusinessWriteAutoSyncCheck({
        getSession: jest.fn(async () => session),
        getWorkspace: jest.fn(async () => ({
          groupId: 'local_1',
          isRemote: false,
        })),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        error: 'shared_workspace_required',
        name: 'autoSyncBusinessWriteCheck',
        ok: false,
      }),
    );
  });

  test('auto-sync decision trace check validates notification debounce guard and success', async () => {
    const trace = {
      lastDebounceFiredAt: '2026-01-01T00:00:01.000Z',
      lastDecision: 'run',
      lastGuardEvaluationAt: '2026-01-01T00:00:01.000Z',
      lastNotifyReason: 'local_change',
      lastRunFinishedAt: '2026-01-01T00:00:02.000Z',
      lastRunStartedAt: '2026-01-01T00:00:01.000Z',
      lastRunStatus: 'success',
      lastScheduledAt: '2026-01-01T00:00:00.000Z',
      serviceInitialized: true,
    };
    const recipeRepo = {
      create: jest.fn(async (_data, options) => ({
        groupId: options.groupId,
        id: options.id,
      })),
    };

    await expect(
      runAutoSyncDecisionTraceCheck({
        createId: jest.fn(() => 'trace_recipe_1'),
        getLatestHistory: jest.fn(async () => ({ status: 'success' })),
        getOutboxForDocument: jest.fn(async () => [
          {
            id: 'outbox_trace_1',
            status: 'pending',
          },
        ]),
        getSession: jest.fn(async () => session),
        getTrace: jest.fn(() => trace),
        getWorkspace: jest.fn(async () => workspace),
        notifyAutoSync: jest.fn(() => ({ scheduled: true })),
        recipeRepo,
        setAutoSync: jest.fn(async () => ({ autoSyncEnabled: true })),
        startAutoSyncService: jest.fn(),
        waitForAutoSync: jest.fn(async () => null),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        name: 'autoSyncDecisionTraceCheck',
        ok: true,
      }),
    );
  });

  test('auto-sync decision trace check returns stable skip reason', async () => {
    const traces = [
      {
        lastNotifyReason: 'local_change',
        lastScheduledAt: '2026-01-01T00:00:00.000Z',
        serviceInitialized: true,
      },
      {
        lastDebounceFiredAt: '2026-01-01T00:00:01.000Z',
        lastDecision: 'skipped',
        lastGuardEvaluationAt: '2026-01-01T00:00:01.000Z',
        lastSkippedReason: 'conflicts_pending',
        serviceInitialized: true,
      },
    ];

    await expect(
      runAutoSyncDecisionTraceCheck({
        createId: jest.fn(() => 'trace_recipe_1'),
        getLatestHistory: jest.fn(async () => ({ status: 'skipped' })),
        getOutboxForDocument: jest.fn(async () => [
          {
            id: 'outbox_trace_1',
            status: 'pending',
          },
        ]),
        getSession: jest.fn(async () => session),
        getTrace: jest.fn(() => traces.shift() || traces[0]),
        getWorkspace: jest.fn(async () => workspace),
        notifyAutoSync: jest.fn(() => ({ scheduled: true })),
        recipeRepo: {
          create: jest.fn(async (_data, options) => ({
            groupId: options.groupId,
            id: options.id,
          })),
        },
        setAutoSync: jest.fn(async () => ({ autoSyncEnabled: true })),
        startAutoSyncService: jest.fn(),
        waitForAutoSync: jest.fn(async () => null),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        error: 'skipped_conflicts_pending',
        failedStep: 'guard_decision',
        name: 'autoSyncDecisionTraceCheck',
        ok: false,
        skipped: true,
      }),
    );
  });
});
