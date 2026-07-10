jest.mock('../auth/authService', () => ({
  getCurrentSession: jest.fn(),
  getFreshAuthSession: jest.fn(),
}));

jest.mock('../workspace/workspaceRepository', () => ({
  getCurrentWorkspace: jest.fn(),
}));

jest.mock('../validation/syncReadinessCheck', () => ({
  runSyncReadinessCheck: jest.fn(),
}));

jest.mock('../network/networkStatusService', () => ({
  getNetworkDiagnostics: jest.fn(() => ({
    backendReachable: true,
    networkState: 'backend_reachable',
    syncBaseUrlConfigured: true,
    syncBaseUrlHost: 'api.example.test',
  })),
  getNetworkStatus: jest.fn(() => ({
    backendReachable: true,
    networkState: 'backend_reachable',
    syncBaseUrlConfigured: true,
  })),
  refreshNetworkStatus: jest.fn(async () => ({
    backendReachable: true,
    networkState: 'backend_reachable',
    syncBaseUrlConfigured: true,
  })),
}));

jest.mock('./syncService', () => ({
  runSync: jest.fn(),
}));

jest.mock('./syncHistoryService', () => ({
  finishSyncHistoryRun: jest.fn(),
  getSyncHistoryWorkspaceName: jest.fn((workspace = {}) =>
    workspace.name || 'Workspace',
  ),
  recordSkippedSyncRun: jest.fn(),
  recoverStaleSyncHistoryRuns: jest.fn(async () => ({ recoveredCount: 0 })),
  safelyRecordSyncHistory: jest.fn((operation) => operation()),
  sanitizeSyncHistoryError: jest.fn((error) => ({
    errorCode: String(error?.message || error || 'unknown_sync_error'),
    safeErrorMessage: String(error?.message || error || 'unknown_sync_error'),
  })),
  startSyncHistoryRun: jest.fn(async (input) => ({
    ...input,
    runId: 'auto_sync_run_1',
    startedAt: '2026-01-01T00:00:00.000Z',
  })),
}));

jest.mock('./autoSyncStateRepository', () => ({
  getAutoSyncSettings: jest.fn(async () => ({ autoSyncEnabled: true })),
  getAutoSyncState: jest.fn(async () => ({})),
  setAutoSyncEnabled: jest.fn(async (enabled) => ({
    autoSyncEnabled: Boolean(enabled),
  })),
  setAutoSyncState: jest.fn(async (state) => state),
}));

import {
  getCurrentSession,
  getFreshAuthSession,
} from '../auth/authService';
import { getCurrentWorkspace } from '../workspace/workspaceRepository';
import { runSyncReadinessCheck } from '../validation/syncReadinessCheck';
import { refreshNetworkStatus } from '../network/networkStatusService';
import { runSync } from './syncService';
import {
  finishSyncHistoryRun,
  recordSkippedSyncRun,
  recoverStaleSyncHistoryRuns,
  startSyncHistoryRun,
} from './syncHistoryService';
import {
  getAutoSyncSettings,
  getAutoSyncState as getStoredAutoSyncState,
  setAutoSyncState,
  setAutoSyncEnabled as persistAutoSyncEnabled,
} from './autoSyncStateRepository';
import {
  __resetAutoSyncNotifierForTests,
  notifyAutoSyncFromLocalChange,
} from './autoSyncNotifier';
import {
  __resetAutoSyncRuntimeForTests,
  clearAutoSyncDecisionTraceForTests,
  getAutoSyncDecisionTrace,
  getAutoSyncDiagnostics,
  getAutoSyncState,
  handleAutoSyncAppStateChange,
  isAutoSyncAllowed,
  notifyAutoSyncNeeded,
  recoverStaleAutoSyncState,
  runAutoSyncNow,
  setAutoSyncEnabled,
  startAutoSync,
  stopAutoSync,
} from './autoSyncService';

describe('autoSyncService', () => {
  const sharedWorkspace = {
    groupId: 'group_1',
    isRemote: true,
    name: 'Panaderia',
  };
  const session = {
    sessionState: 'authenticated',
    userId: 'user_1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    __resetAutoSyncNotifierForTests();
    __resetAutoSyncRuntimeForTests();
    getCurrentWorkspace.mockResolvedValue(sharedWorkspace);
    getCurrentSession.mockResolvedValue(session);
    getFreshAuthSession.mockResolvedValue(session);
    getAutoSyncSettings.mockResolvedValue({ autoSyncEnabled: true });
    getStoredAutoSyncState.mockResolvedValue({});
    recoverStaleSyncHistoryRuns.mockResolvedValue({ recoveredCount: 0 });
    runSync.mockResolvedValue({
      ok: true,
      pull: { applied: [], conflicts: [], skipped: [] },
      push: { accepted: [], rejected: [], skipped: [] },
    });
    runSyncReadinessCheck.mockResolvedValue({
      conflictDocumentCount: 0,
      conflictOutboxCount: 0,
      pendingOutboxCount: 1,
    });
    refreshNetworkStatus.mockResolvedValue({
      backendReachable: true,
      networkState: 'backend_reachable',
      syncBaseUrlConfigured: true,
    });
  });

  afterEach(() => {
    stopAutoSync();
    __resetAutoSyncNotifierForTests();
    clearAutoSyncDecisionTraceForTests();
    jest.useRealTimers();
  });

  test('eligibility blocks unsafe contexts', () => {
    expect(isAutoSyncAllowed({ autoSyncEnabled: false }).reason).toBe(
      'auto_sync_disabled',
    );
    expect(
      isAutoSyncAllowed({ appState: 'inactive', autoSyncEnabled: true }).reason,
    ).toBe('app_inactive');
    expect(
      isAutoSyncAllowed({
        appState: 'active',
        autoSyncEnabled: true,
        workspace: { isRemote: false },
      }).reason,
    ).toBe('local_only_mode');
    expect(
      isAutoSyncAllowed({
        appState: 'active',
        autoSyncEnabled: true,
        session,
        workspace: sharedWorkspace,
        conflictCount: 1,
      }).reason,
    ).toBe('conflicts_pending');
  });

  test('runs full sync when active authenticated shared workspace is safe', async () => {
    startAutoSync({ appState: 'active' });

    await expect(runAutoSyncNow({ reason: 'local_change' })).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        skipped: false,
      }),
    );

    expect(runSync).toHaveBeenCalledWith({ groupId: 'group_1' });
    expect(startSyncHistoryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'full_sync',
        groupId: 'group_1',
        triggerSource: 'system_future',
      }),
    );
    expect(finishSyncHistoryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
      }),
    );
  });

  test('skips and records local-only mode without running sync', async () => {
    getCurrentWorkspace.mockResolvedValue({
      groupId: 'local_1',
      isRemote: false,
      name: 'Local',
    });
    startAutoSync({ appState: 'active' });

    await expect(runAutoSyncNow({ reason: 'app_active' })).resolves.toEqual(
      expect.objectContaining({
        reason: 'local_only_mode',
        skipped: true,
      }),
    );

    expect(runSync).not.toHaveBeenCalled();
    expect(getFreshAuthSession).not.toHaveBeenCalled();
    expect(recordSkippedSyncRun).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'local_only_mode',
        triggerSource: 'system_future',
      }),
    );
  });

  test('skips without auth and with conflicts', async () => {
    getFreshAuthSession.mockRejectedValueOnce(new Error('auth_required'));
    startAutoSync({ appState: 'active' });

    await runAutoSyncNow({ reason: 'app_active' });
    expect(recordSkippedSyncRun).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reason: 'auth_required',
      }),
    );

    getFreshAuthSession.mockResolvedValue(session);
    runSyncReadinessCheck.mockResolvedValueOnce({
      conflictDocumentCount: 1,
      pendingOutboxCount: 1,
    });

    await runAutoSyncNow({ reason: 'app_active' });
    expect(recordSkippedSyncRun).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reason: 'conflicts_pending',
      }),
    );
  });

  test('skips when network is offline, backend is unreachable, or sync URL is missing', async () => {
    startAutoSync({ appState: 'active' });

    refreshNetworkStatus.mockResolvedValueOnce({
      backendReachable: false,
      networkState: 'offline',
      syncBaseUrlConfigured: true,
    });
    await runAutoSyncNow({ reason: 'app_active' });
    expect(recordSkippedSyncRun).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reason: 'network_offline',
      }),
    );

    refreshNetworkStatus.mockResolvedValueOnce({
      backendReachable: false,
      networkState: 'backend_unreachable',
      syncBaseUrlConfigured: true,
    });
    await runAutoSyncNow({ reason: 'local_change' });
    expect(recordSkippedSyncRun).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reason: 'backend_unreachable',
      }),
    );

    refreshNetworkStatus.mockResolvedValueOnce({
      backendReachable: false,
      networkState: 'sync_url_missing',
      syncBaseUrlConfigured: false,
    });
    await runAutoSyncNow({ reason: 'local_change' });
    expect(recordSkippedSyncRun).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reason: 'sync_url_missing',
      }),
    );
    expect(runSync).not.toHaveBeenCalled();
  });

  test('coalesces multiple local-change notifications into one debounced run', async () => {
    startAutoSync({ appState: 'active' });

    expect(notifyAutoSyncNeeded('local_change', {
      config: { cooldownMs: 0, debounceMs: 20, failureBackoffMs: 0 },
    })).toEqual({ scheduled: true });
    expect(notifyAutoSyncNeeded('local_change', {
      config: { cooldownMs: 0, debounceMs: 20, failureBackoffMs: 0 },
    })).toEqual({ scheduled: true });

    await jest.advanceTimersByTimeAsync(19);
    expect(runSync).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(runSync).toHaveBeenCalledTimes(1);
  });

  test('notifier queues before service initialization and flushes once on start', async () => {
    expect(notifyAutoSyncFromLocalChange('local_change')).toEqual({
      reason: 'auto_sync_not_initialized',
      scheduled: false,
    });
    expect(getAutoSyncDecisionTrace()).toEqual(
      expect.objectContaining({
        lastNotifyReason: 'local_change',
        notifierQueued: true,
      }),
    );

    startAutoSync({ appState: 'active' });

    expect(getAutoSyncDecisionTrace()).toEqual(
      expect.objectContaining({
        lastNotifyReason: 'local_change',
        lastScheduledAt: expect.any(String),
        notifierFlushedAt: expect.any(String),
        notifierQueued: false,
        serviceInitialized: true,
      }),
    );

    await jest.advanceTimersByTimeAsync(1500);
    expect(runSync).toHaveBeenCalledTimes(1);
  });

  test('login_success notification is preserved in decision trace', () => {
    startAutoSync({ appState: 'active' });

    expect(notifyAutoSyncNeeded('login_success')).toEqual({
      scheduled: true,
    });

    expect(getAutoSyncDecisionTrace()).toEqual(
      expect.objectContaining({
        lastDecision: 'scheduled',
        lastNotifyReason: 'login_success',
      }),
    );
  });

  test('debounce firing and successful run update decision trace', async () => {
    startAutoSync({ appState: 'active' });
    notifyAutoSyncNeeded('local_change', {
      config: { cooldownMs: 0, debounceMs: 10, failureBackoffMs: 0 },
    });

    await jest.advanceTimersByTimeAsync(10);

    expect(getAutoSyncDecisionTrace()).toEqual(
      expect.objectContaining({
        lastDebounceFiredAt: expect.any(String),
        lastDecision: 'run',
        lastGuardEvaluationAt: expect.any(String),
        lastRunFinishedAt: expect.any(String),
        lastRunStartedAt: expect.any(String),
        lastRunStatus: 'success',
        pendingOutboxCount: 1,
      }),
    );
  });

  test('guard skips update decision trace with stable reasons', async () => {
    getFreshAuthSession.mockRejectedValueOnce(new Error('auth_required'));
    startAutoSync({ appState: 'active' });

    await runAutoSyncNow({ reason: 'local_change' });
    expect(getAutoSyncDecisionTrace()).toEqual(
      expect.objectContaining({
        lastDecision: 'skipped',
        lastRunStatus: 'skipped',
        lastSkippedReason: 'no_auth',
      }),
    );

    getFreshAuthSession.mockResolvedValue(session);
    getCurrentWorkspace.mockResolvedValueOnce({
      groupId: null,
      isRemote: true,
    });

    await runAutoSyncNow({ reason: 'local_change' });
    expect(getAutoSyncDecisionTrace()).toEqual(
      expect.objectContaining({
        lastSkippedReason: 'missing_groupId',
      }),
    );
  });

  test('notifyAutoSyncNeeded exposes scheduled state before the local-change debounce completes', async () => {
    startAutoSync({ appState: 'active' });

    expect(
      notifyAutoSyncNeeded('local_change', {
        config: { cooldownMs: 0, debounceMs: 50, failureBackoffMs: 0 },
      }),
    ).toEqual({ scheduled: true });

    await expect(getAutoSyncState()).resolves.toEqual(
      expect.objectContaining({
        autoSyncState: 'scheduled',
        lastNotifyAt: expect.any(String),
        lastNotifyReason: 'local_change',
        scheduled: true,
        scheduledAt: expect.any(String),
        scheduledReason: 'local_change',
      }),
    );
    expect(setAutoSyncState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        autoSyncState: 'scheduled',
        lastNotifyAt: expect.any(String),
        lastNotifyReason: 'local_change',
        lastStatus: 'scheduled',
        scheduledDelayMs: 50,
      }),
    );
  });

  test('does not keep stale sync URL config state after config becomes valid', async () => {
    getStoredAutoSyncState.mockResolvedValueOnce({
      autoSyncState: 'sync_url_missing',
      lastSkipReason: 'sync_url_missing',
      lastStatus: 'skipped',
    });
    process.env = {
      ...process.env,
      EXPO_PUBLIC_SYNC_API_URL: 'http://sync.example.test',
    };
    startAutoSync({ appState: 'active' });

    await expect(getAutoSyncState()).resolves.toEqual(
      expect.objectContaining({
        autoSyncState: 'idle',
      }),
    );
  });

  test('cooldown skips repeated app-active runs but local changes with pending outbox can sync again', async () => {
    startAutoSync({ appState: 'active' });

    await runAutoSyncNow({
      config: { cooldownMs: 1000, debounceMs: 0, failureBackoffMs: 0 },
      reason: 'app_active',
    });
    await runAutoSyncNow({
      config: { cooldownMs: 1000, debounceMs: 0, failureBackoffMs: 0 },
      reason: 'app_active',
    });

    expect(recordSkippedSyncRun).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reason: 'recent_sync',
      }),
    );
    expect(runSync).toHaveBeenCalledTimes(1);

    await runAutoSyncNow({
      config: { cooldownMs: 1000, debounceMs: 0, failureBackoffMs: 0 },
      reason: 'local_change',
    });

    expect(runSync).toHaveBeenCalledTimes(2);

    __resetAutoSyncRuntimeForTests();
    startAutoSync({ appState: 'active' });
    runSync.mockResolvedValueOnce({ ok: false, pull: {}, push: {} });

    await runAutoSyncNow({
      config: { cooldownMs: 0, debounceMs: 0, failureBackoffMs: 1000 },
      reason: 'local_change',
    });
    await runAutoSyncNow({
      config: { cooldownMs: 0, debounceMs: 0, failureBackoffMs: 1000 },
      reason: 'local_change',
    });

    expect(recordSkippedSyncRun).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reason: 'backoff_active',
      }),
    );
    expect(setAutoSyncState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        autoSyncState: 'backoff',
        lastSkipReason: 'backoff_active',
      }),
    );
  });

  test('app active schedules sync and inactive clears timers', async () => {
    startAutoSync({ appState: 'inactive' });

    expect(handleAutoSyncAppStateChange('active')).toEqual({ scheduled: true });
    handleAutoSyncAppStateChange('background');
    await jest.advanceTimersByTimeAsync(20000);

    expect(runSync).not.toHaveBeenCalled();
  });

  test('setting can disable auto-sync', async () => {
    await expect(setAutoSyncEnabled(false)).resolves.toEqual({
      autoSyncEnabled: false,
    });
    expect(persistAutoSyncEnabled).toHaveBeenCalledWith(false);

    getAutoSyncSettings.mockResolvedValueOnce({ autoSyncEnabled: false });
    startAutoSync({ appState: 'active' });

    await runAutoSyncNow({ reason: 'app_active' });
    expect(recordSkippedSyncRun).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reason: 'auto_sync_disabled',
      }),
    );
  });

  test('local changes skip when the auto-sync toggle is disabled', async () => {
    getAutoSyncSettings.mockResolvedValue({ autoSyncEnabled: false });
    startAutoSync({ appState: 'active' });

    await expect(runAutoSyncNow({ reason: 'local_change' })).resolves.toEqual(
      expect.objectContaining({
        reason: 'auto_sync_disabled',
        skipped: true,
      }),
    );

    expect(getFreshAuthSession).not.toHaveBeenCalled();
    expect(runSync).not.toHaveBeenCalled();
  });

  test('disabled auto-sync does not schedule a local-change run', async () => {
    startAutoSync({ appState: 'active' });
    await setAutoSyncEnabled(false);

    expect(
      notifyAutoSyncNeeded('local_change', {
        config: { cooldownMs: 0, debounceMs: 10, failureBackoffMs: 0 },
      }),
    ).toEqual({ reason: 'auto_sync_disabled', scheduled: false });

    await jest.advanceTimersByTimeAsync(20);

    expect(runSync).not.toHaveBeenCalled();
    expect(setAutoSyncState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        autoSyncState: 'skipped_disabled',
        lastNotifyReason: 'local_change',
        lastSkipReason: 'auto_sync_disabled',
      }),
    );
  });

  test('local change notification does not schedule while inactive', async () => {
    startAutoSync({ appState: 'inactive' });

    expect(
      notifyAutoSyncNeeded('local_change', {
        config: { cooldownMs: 0, debounceMs: 10, failureBackoffMs: 0 },
      }),
    ).toEqual({ reason: 'app_inactive', scheduled: false });

    await jest.advanceTimersByTimeAsync(20);

    expect(runSync).not.toHaveBeenCalled();
  });

  test('sync failure records sanitized history without throwing', async () => {
    runSync.mockRejectedValueOnce(new Error('Network request failed'));
    startAutoSync({ appState: 'active' });

    await expect(runAutoSyncNow({ reason: 'local_change' })).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        skipped: false,
      }),
    );

    expect(finishSyncHistoryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
        status: 'failed',
      }),
    );
    expect(setAutoSyncState).toHaveBeenCalledWith(
      expect.objectContaining({
        autoSyncState: 'failed',
        lastStatus: 'failed',
      }),
    );
  });

  test('timeout clears inFlight, records failure, and enters backoff', async () => {
    runSync.mockRejectedValueOnce(new Error('sync_timeout'));
    startAutoSync({ appState: 'active' });

    await expect(
      runAutoSyncNow({
        config: { cooldownMs: 0, debounceMs: 0, failureBackoffMs: 1000 },
        reason: 'local_change',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        skipped: false,
      }),
    );

    await expect(
      getAutoSyncState({
        config: { cooldownMs: 0, debounceMs: 0, failureBackoffMs: 1000 },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        autoSyncState: 'backoff',
        syncInFlight: false,
      }),
    );
    expect(finishSyncHistoryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
        status: 'failed',
      }),
    );
    expect(setAutoSyncState).toHaveBeenCalledWith(
      expect.objectContaining({
        autoSyncState: 'failed',
        lastErrorCode: 'sync_timeout',
        syncInFlight: false,
      }),
    );
  });

  test('successful sync clears failure and backoff state', async () => {
    runSync.mockRejectedValueOnce(new Error('sync_timeout'));
    startAutoSync({ appState: 'active' });

    await runAutoSyncNow({
      config: { cooldownMs: 0, debounceMs: 0, failureBackoffMs: 0 },
      reason: 'local_change',
    });
    runSync.mockResolvedValueOnce({
      ok: true,
      pull: { applied: [], conflicts: [], skipped: [] },
      push: { accepted: [], rejected: [], skipped: [] },
    });

    await runAutoSyncNow({
      config: { cooldownMs: 0, debounceMs: 0, failureBackoffMs: 0 },
      reason: 'retry_after_failure',
    });

    expect(setAutoSyncState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        autoSyncState: 'idle',
        lastErrorCode: null,
        lastStatus: 'success',
        syncInFlight: false,
      }),
    );
  });

  test('recovers stale stored in-flight state without duplicate sync run', async () => {
    getStoredAutoSyncState.mockResolvedValueOnce({
      autoSyncState: 'syncing',
      startedAt: '2026-01-01T00:00:00.000Z',
      syncInFlight: true,
    });
    recoverStaleSyncHistoryRuns.mockResolvedValueOnce({ recoveredCount: 1 });
    jest.setSystemTime(new Date('2026-01-01T00:05:00.000Z'));

    await expect(
      recoverStaleAutoSyncState({
        config: { cooldownMs: 0, debounceMs: 0, failureBackoffMs: 1000, staleInFlightMs: 60000 },
      }),
    ).resolves.toEqual({
      staleHistoryRecoveredCount: 1,
      staleInFlightRecovered: true,
    });

    expect(setAutoSyncState).toHaveBeenCalledWith(
      expect.objectContaining({
        autoSyncState: 'failed',
        lastErrorCode: 'sync_timeout',
        syncInFlight: false,
      }),
    );
    expect(runSync).not.toHaveBeenCalled();
  });

  test('diagnostics summarize auto-sync state without secrets', async () => {
    startAutoSync({ appState: 'active' });
    notifyAutoSyncNeeded('local_change', {
      config: { cooldownMs: 0, debounceMs: 100, failureBackoffMs: 0 },
    });

    await expect(getAutoSyncDiagnostics()).resolves.toEqual(
      expect.objectContaining({
        autoSyncEnabled: true,
        autoSyncState: 'scheduled',
        backoffRemainingMs: expect.any(Number),
        conflictCount: 0,
        currentWorkspaceMode: 'shared',
        decisionTrace: expect.objectContaining({
          lastDecision: 'scheduled',
          lastNotifyReason: 'local_change',
          serviceInitialized: true,
        }),
        hasAuthSession: true,
        hasConflicts: false,
        hasGroupId: true,
        hasSharedWorkspace: true,
        inFlight: false,
        lastNotifyAt: expect.any(String),
        lastNotifyReason: 'local_change',
        lastScheduledAt: expect.any(String),
        networkState: 'backend_reachable',
        pendingOutboxCount: 1,
        scheduled: true,
        syncRequestTimeoutMs: 25000,
      }),
    );
  });
});
