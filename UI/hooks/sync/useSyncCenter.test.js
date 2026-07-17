jest.mock('../../data/auth/authService', () => ({
  getCurrentSession: jest.fn(),
}));

jest.mock('../../data/workspace/workspaceRepository', () => ({
  getCurrentWorkspace: jest.fn(),
  getOrCreateDefaultLocalWorkspace: jest.fn(),
}));

jest.mock('../../data/validation/syncReadinessCheck', () => ({
  runSyncReadinessCheck: jest.fn(),
}));

jest.mock('../../data/sync/syncService', () => ({
  pullRemoteChanges: jest.fn(),
  pushPendingChanges: jest.fn(),
  runSync: jest.fn(),
}));

jest.mock('../../data/sync/syncIntegrityService', () => ({
  checkSyncIntegrity: jest.fn(),
  runSyncRepair: jest.fn(),
  SYNC_REPAIR_SCOPES: {
    FULL: 'full_sync_repair',
  },
}));

jest.mock('../../data/sync/syncHistoryService', () => ({
  finishSyncHistoryRun: jest.fn(),
  getSyncHistoryAuthState: jest.fn((status = {}) =>
    status.session ? 'authenticated' : 'auth_required',
  ),
  getSyncHistoryWorkspaceName: jest.fn(
    (workspace = {}) => workspace.name || 'Workspace local',
  ),
  recordSkippedSyncRun: jest.fn(),
  safelyRecordSyncHistory: jest.fn((operation) => operation()),
  startSyncHistoryRun: jest.fn(async (input) => ({
    ...input,
    runId: 'sync_run_1',
    startedAt: '2026-01-01T00:00:00.000Z',
  })),
}));

jest.mock('../../data/sync/syncStateRepository', () => ({
  getSyncState: jest.fn(),
}));

import {
  loadSyncCenterStatus,
  runManualSyncAction,
} from './useSyncCenter';
import {
  finishSyncHistoryRun,
  recordSkippedSyncRun,
  safelyRecordSyncHistory,
  startSyncHistoryRun,
} from '../../data/sync/syncHistoryService';

describe('useSyncCenter helpers', () => {
  const sharedWorkspace = {
    groupId: 'group_1',
    isRemote: true,
    name: 'Shared',
  };
  const localWorkspace = {
    groupId: 'local_1',
    isRemote: false,
    name: 'Local',
  };
  const session = {
    sessionState: 'authenticated',
    userId: 'user_1',
  };
  const readiness = {
    conflictDocumentCount: 1,
    conflictOutboxCount: 0,
    failedOutboxCount: 2,
    ok: false,
    pendingOutboxCount: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('status refresh reports pending failed and conflict counts', async () => {
    const result = await loadSyncCenterStatus({
      getSession: jest.fn(async () => session),
      getState: jest.fn(async () => ({
        groupId: 'group_1',
        lastSyncCursor: 'cursor_1',
        lastSyncedAt: '2026-01-01T00:00:00.000Z',
      })),
      getWorkspace: jest.fn(async () => sharedWorkspace),
      runReadiness: jest.fn(async () => readiness),
    });

    expect(result).toEqual(
      expect.objectContaining({
        authStatus: 'authenticated',
        conflictCount: 1,
        failedCount: 2,
        pendingCount: 3,
      }),
    );
    expect(result.lastSyncState.lastSyncCursor).toBe('cursor_1');
  });

  test('unauthenticated shared sync fails with auth_required', async () => {
    await expect(
      runManualSyncAction({
        action: 'push',
        loadStatus: jest.fn(async () => ({
          currentWorkspace: sharedWorkspace,
          session: null,
        })),
        push: jest.fn(),
      }),
    ).rejects.toThrow('auth_required');
    expect(recordSkippedSyncRun).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'push',
        reason: 'auth_required',
        triggerSource: 'manual',
      }),
    );
  });

  test('local-only sync fails clearly and does not call push', async () => {
    const push = jest.fn();

    await expect(
      runManualSyncAction({
        action: 'push',
        loadStatus: jest.fn(async () => ({
          currentWorkspace: localWorkspace,
          session,
        })),
        push,
      }),
    ).rejects.toThrow('local_only_mode');
    expect(push).not.toHaveBeenCalled();
  });

  test('push calls sync service with active groupId only', async () => {
    const push = jest.fn(async () => ({ ok: true }));
    const loadStatus = jest
      .fn()
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        session,
      })
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        session,
      });

    await runManualSyncAction({
      action: 'push',
      loadStatus,
      push,
    });

    expect(push).toHaveBeenCalledWith({
      client: undefined,
      groupId: 'group_1',
    });
    expect(startSyncHistoryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'push',
        triggerSource: 'manual',
      }),
    );
    expect(finishSyncHistoryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        result: { ok: true },
        run: expect.objectContaining({ runId: 'sync_run_1' }),
      }),
    );
  });

  test('history write failure does not block manual sync', async () => {
    const push = jest.fn(async () => ({ ok: true }));
    const loadStatus = jest
      .fn()
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        pendingCount: 1,
        session,
      })
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        pendingCount: 0,
        session,
      });

    safelyRecordSyncHistory.mockImplementationOnce(async () => null);

    await expect(
      runManualSyncAction({
        action: 'push',
        loadStatus,
        push,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        result: { ok: true },
      }),
    );
    expect(push).toHaveBeenCalledWith({
      client: undefined,
      groupId: 'group_1',
    });
  });

  test('pull calls sync service with active groupId only', async () => {
    const pull = jest.fn(async () => ({ ok: true }));
    const loadStatus = jest
      .fn()
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        session,
      })
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        session,
      });

    await runManualSyncAction({
      action: 'pull',
      loadStatus,
      pull,
    });

    expect(pull).toHaveBeenCalledWith({
      client: undefined,
      groupId: 'group_1',
    });
  });

  test('full sync calls runSync with active groupId only', async () => {
    const sync = jest.fn(async () => ({ ok: true }));
    const loadStatus = jest
      .fn()
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        session,
      })
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        session,
      });

    await runManualSyncAction({
      action: 'full',
      loadStatus,
      sync,
    });

    expect(sync).toHaveBeenCalledWith({
      client: undefined,
      groupId: 'group_1',
    });
  });

  test('manual full sync timeout records failed history and remains retryable', async () => {
    const sync = jest.fn(async () => ({
      error: 'sync_timeout',
      ok: false,
      pull: { applied: [], conflicts: [], skipped: [] },
      push: { accepted: [], rejected: [], skipped: [] },
    }));
    const loadStatus = jest
      .fn()
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        pendingCount: 1,
        session,
      })
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        pendingCount: 1,
        session,
      });

    await expect(
      runManualSyncAction({
        action: 'full',
        loadStatus,
        sync,
      }),
    ).rejects.toThrow('sync_timeout');

    expect(finishSyncHistoryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'sync_timeout',
        status: 'failed',
      }),
    );
    expect(sync).toHaveBeenCalledTimes(1);
  });

  test('manual push and pull timeout failures clear through failed history path', async () => {
    const loadStatus = jest
      .fn()
      .mockResolvedValue({
        currentWorkspace: sharedWorkspace,
        pendingCount: 1,
        session,
      });
    const push = jest.fn(async () => ({ error: 'sync_timeout', ok: false }));
    const pull = jest.fn(async () => ({ error: 'sync_timeout', ok: false }));

    await expect(
      runManualSyncAction({ action: 'push', loadStatus, push }),
    ).rejects.toThrow('sync_timeout');
    await expect(
      runManualSyncAction({ action: 'pull', loadStatus, pull }),
    ).rejects.toThrow('sync_timeout');

    expect(finishSyncHistoryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'sync_timeout',
        status: 'failed',
      }),
    );
  });

  test('does not run sync service while only loading status', async () => {
    const push = jest.fn();
    const pull = jest.fn();
    const sync = jest.fn();

    await loadSyncCenterStatus({
      getSession: jest.fn(async () => session),
      getState: jest.fn(async () => null),
      getWorkspace: jest.fn(async () => sharedWorkspace),
      runReadiness: jest.fn(async () => readiness),
    });

    expect(push).not.toHaveBeenCalled();
    expect(pull).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
    expect(startSyncHistoryRun).not.toHaveBeenCalled();
  });
});
