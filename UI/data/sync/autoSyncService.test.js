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
  safelyRecordSyncHistory: jest.fn((operation) => operation()),
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
  startSyncHistoryRun,
} from './syncHistoryService';
import {
  getAutoSyncSettings,
  setAutoSyncState,
  setAutoSyncEnabled as persistAutoSyncEnabled,
} from './autoSyncStateRepository';
import {
  __resetAutoSyncRuntimeForTests,
  getAutoSyncDiagnostics,
  getAutoSyncState,
  handleAutoSyncAppStateChange,
  isAutoSyncAllowed,
  notifyAutoSyncNeeded,
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
    __resetAutoSyncRuntimeForTests();
    getCurrentWorkspace.mockResolvedValue(sharedWorkspace);
    getCurrentSession.mockResolvedValue(session);
    getFreshAuthSession.mockResolvedValue(session);
    getAutoSyncSettings.mockResolvedValue({ autoSyncEnabled: true });
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

    await runAutoSyncNow({ reason: 'local_change' });
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
    await runAutoSyncNow({ reason: 'local_change' });
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

  test('debounces multiple local-change notifications into one run', async () => {
    startAutoSync({ appState: 'active' });

    notifyAutoSyncNeeded('local_change', {
      config: { cooldownMs: 0, debounceMs: 20, failureBackoffMs: 0 },
    });
    notifyAutoSyncNeeded('local_change', {
      config: { cooldownMs: 0, debounceMs: 20, failureBackoffMs: 0 },
    });

    await jest.advanceTimersByTimeAsync(19);
    expect(runSync).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(runSync).toHaveBeenCalledTimes(1);
  });

  test('notifyAutoSyncNeeded exposes scheduled state before the debounced run', async () => {
    startAutoSync({ appState: 'active' });

    expect(
      notifyAutoSyncNeeded('local_change', {
        config: { cooldownMs: 0, debounceMs: 50, failureBackoffMs: 0 },
      }),
    ).toEqual({ scheduled: true });

    await expect(getAutoSyncState()).resolves.toEqual(
      expect.objectContaining({
        autoSyncState: 'scheduled',
        scheduled: true,
        scheduledReason: 'local_change',
      }),
    );
    expect(setAutoSyncState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        autoSyncState: 'scheduled',
        lastStatus: 'scheduled',
      }),
    );
    expect(runSync).not.toHaveBeenCalled();
  });

  test('cooldown and failure backoff skip repeated runs', async () => {
    startAutoSync({ appState: 'active' });

    await runAutoSyncNow({
      config: { cooldownMs: 1000, debounceMs: 0, failureBackoffMs: 0 },
      reason: 'local_change',
    });
    await runAutoSyncNow({
      config: { cooldownMs: 1000, debounceMs: 0, failureBackoffMs: 0 },
      reason: 'local_change',
    });

    expect(recordSkippedSyncRun).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reason: 'recent_sync',
      }),
    );

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

    await runAutoSyncNow({ reason: 'local_change' });
    expect(recordSkippedSyncRun).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reason: 'auto_sync_disabled',
      }),
    );
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

  test('diagnostics summarize auto-sync state without secrets', async () => {
    startAutoSync({ appState: 'active' });
    notifyAutoSyncNeeded('local_change', {
      config: { cooldownMs: 0, debounceMs: 100, failureBackoffMs: 0 },
    });

    await expect(getAutoSyncDiagnostics()).resolves.toEqual(
      expect.objectContaining({
        autoSyncEnabled: true,
        autoSyncState: 'scheduled',
        conflictCount: 0,
        currentWorkspaceMode: 'shared',
        hasAuthSession: true,
        hasGroupId: true,
        pendingOutboxCount: 1,
      }),
    );
  });
});
