jest.mock('../auth/authService', () => ({
  getFreshAuthSession: jest.fn(),
}));

jest.mock('../workspace/workspaceRepository', () => ({
  getCurrentWorkspace: jest.fn(),
}));

jest.mock('../validation/syncReadinessCheck', () => ({
  runSyncReadinessCheck: jest.fn(),
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

import { getFreshAuthSession } from '../auth/authService';
import { getCurrentWorkspace } from '../workspace/workspaceRepository';
import { runSyncReadinessCheck } from '../validation/syncReadinessCheck';
import { runSync } from './syncService';
import {
  finishSyncHistoryRun,
  recordSkippedSyncRun,
  startSyncHistoryRun,
} from './syncHistoryService';
import {
  getAutoSyncSettings,
  setAutoSyncEnabled as persistAutoSyncEnabled,
} from './autoSyncStateRepository';
import {
  __resetAutoSyncRuntimeForTests,
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
  });
});
