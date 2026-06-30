import { getFreshAuthSession } from '../auth/authService';
import { getCurrentWorkspace } from '../workspace/workspaceRepository';
import { runSyncReadinessCheck } from '../validation/syncReadinessCheck';
import { runSync } from './syncService';
import {
  finishSyncHistoryRun,
  getSyncHistoryWorkspaceName,
  recordSkippedSyncRun,
  safelyRecordSyncHistory,
  startSyncHistoryRun,
} from './syncHistoryService';
import {
  AUTO_SYNC_DEFAULTS,
  AUTO_SYNC_REASONS,
  AUTO_SYNC_SKIP_REASONS,
} from './autoSyncConfig';
import {
  getAutoSyncSettings,
  getAutoSyncState as getStoredAutoSyncState,
  setAutoSyncEnabled as persistAutoSyncEnabled,
  setAutoSyncState,
} from './autoSyncStateRepository';

const nowMs = () => Date.now();

const runtimeState = {
  appState: 'inactive',
  initialized: false,
  lastFailureAt: null,
  lastRunAt: null,
  pendingReason: null,
  syncInFlight: false,
  timer: null,
};

const clearAutoSyncTimer = () => {
  if (runtimeState.timer) {
    clearTimeout(runtimeState.timer);
    runtimeState.timer = null;
  }
};

const getReasonText = (reason) => reason || AUTO_SYNC_REASONS.LOCAL_CHANGE;

const getPendingCount = (readiness = {}) =>
  Number(
    readiness.pendingOutboxCount ??
      Object.values(readiness.pendingOutboxByCollection || {}).reduce(
        (total, count) => total + Number(count || 0),
        0,
      ),
  );

const getConflictCount = (readiness = {}) =>
  Number(readiness.conflictDocumentCount || 0) +
  Number(readiness.conflictOutboxCount || 0);

const getCooldownRemaining = ({ config, currentTime, lastRunAt }) =>
  lastRunAt ? Math.max(0, config.cooldownMs - (currentTime - lastRunAt)) : 0;

const getBackoffRemaining = ({ config, currentTime, lastFailureAt }) =>
  lastFailureAt
    ? Math.max(0, config.failureBackoffMs - (currentTime - lastFailureAt))
    : 0;

export const isAutoSyncAllowed = (context = {}) => {
  if (!context.autoSyncEnabled) {
    return {
      allowed: false,
      reason: AUTO_SYNC_SKIP_REASONS.AUTO_SYNC_DISABLED,
    };
  }

  if (context.appState !== 'active') {
    return {
      allowed: false,
      reason: AUTO_SYNC_SKIP_REASONS.APP_INACTIVE,
    };
  }

  if (context.syncInFlight) {
    return {
      allowed: false,
      reason: AUTO_SYNC_SKIP_REASONS.SYNC_IN_FLIGHT,
    };
  }

  if (!context.workspace) {
    return {
      allowed: false,
      reason: AUTO_SYNC_SKIP_REASONS.WORKSPACE_REQUIRED,
    };
  }

  if (!context.workspace.isRemote) {
    return {
      allowed: false,
      reason: AUTO_SYNC_SKIP_REASONS.LOCAL_ONLY_MODE,
    };
  }

  if (!context.workspace.groupId) {
    return {
      allowed: false,
      reason: AUTO_SYNC_SKIP_REASONS.GROUP_ID_REQUIRED,
    };
  }

  if (!context.session) {
    return {
      allowed: false,
      reason: AUTO_SYNC_SKIP_REASONS.NO_AUTH_SESSION,
    };
  }

  if (context.conflictCount > 0) {
    return {
      allowed: false,
      reason: AUTO_SYNC_SKIP_REASONS.CONFLICTS_PENDING,
    };
  }

  if (context.backoffRemainingMs > 0) {
    return {
      allowed: false,
      reason: AUTO_SYNC_SKIP_REASONS.BACKOFF_ACTIVE,
    };
  }

  if (context.cooldownRemainingMs > 0) {
    return {
      allowed: false,
      reason: AUTO_SYNC_SKIP_REASONS.RECENT_SYNC,
    };
  }

  return {
    allowed: true,
    reason: null,
  };
};

export const loadAutoSyncContext = async ({
  appState = runtimeState.appState,
  config = AUTO_SYNC_DEFAULTS,
  getSession = getFreshAuthSession,
  getSettings = getAutoSyncSettings,
  getWorkspace = getCurrentWorkspace,
  runReadiness = runSyncReadinessCheck,
} = {}) => {
  const [settings, workspace, readiness] = await Promise.all([
    getSettings().catch(() => ({ autoSyncEnabled: true })),
    getWorkspace().catch(() => null),
    runReadiness().catch(() => null),
  ]);
  let session = null;
  let authError = null;

  const shouldReadSession =
    settings.autoSyncEnabled !== false &&
    appState === 'active' &&
    workspace?.isRemote &&
    workspace?.groupId;

  if (shouldReadSession) {
    try {
      session = await getSession();
    } catch (error) {
      authError = error;
    }
  }

  const currentTime = nowMs();

  return {
    appState,
    authError,
    autoSyncEnabled: settings.autoSyncEnabled !== false,
    backoffRemainingMs: getBackoffRemaining({
      config,
      currentTime,
      lastFailureAt: runtimeState.lastFailureAt,
    }),
    conflictCount: getConflictCount(readiness),
    cooldownRemainingMs: getCooldownRemaining({
      config,
      currentTime,
      lastRunAt: runtimeState.lastRunAt,
    }),
    networkState: 'unknown',
    pendingCount: getPendingCount(readiness),
    readiness,
    session,
    syncInFlight: runtimeState.syncInFlight,
    workspace,
  };
};

const recordAutoSyncSkipped = async ({ context, reason, triggerReason }) => {
  await safelyRecordSyncHistory(() =>
    recordSkippedSyncRun({
      actionType: 'full_sync',
      authState: context.session
        ? 'authenticated'
        : context.authError?.message === 'session_expired'
          ? 'session_expired'
          : 'auth_required',
      error: reason,
      groupId: context.workspace?.groupId || null,
      networkState: context.networkState || 'unknown',
      pendingBefore: context.pendingCount ?? null,
      reason,
      triggerSource: 'system_future',
      workspaceName: getSyncHistoryWorkspaceName(context.workspace),
    }),
  );
  await setAutoSyncState({
    lastReason: triggerReason,
    lastSkipReason: reason,
    lastStatus: 'skipped',
  }).catch(() => null);
};

export const runAutoSyncNow = async ({
  config = AUTO_SYNC_DEFAULTS,
  reason = AUTO_SYNC_REASONS.LOCAL_CHANGE,
  runSyncFn = runSync,
  ...contextOptions
} = {}) => {
  const triggerReason = getReasonText(reason);
  const context = await loadAutoSyncContext({
    ...contextOptions,
    config,
  });
  const eligibility = isAutoSyncAllowed(context);

  if (!eligibility.allowed) {
    await recordAutoSyncSkipped({
      context,
      reason: eligibility.reason,
      triggerReason,
    });
    return {
      ok: false,
      reason: eligibility.reason,
      skipped: true,
    };
  }

  runtimeState.syncInFlight = true;
  let historyRun = null;

  try {
    historyRun = await safelyRecordSyncHistory(() =>
      startSyncHistoryRun({
        actionType: 'full_sync',
        authState: 'authenticated',
        groupId: context.workspace.groupId,
        networkState: context.networkState || 'unknown',
        pendingBefore: context.pendingCount,
        triggerSource: 'system_future',
        workspaceName: getSyncHistoryWorkspaceName(context.workspace),
      }),
    );

    const result = await runSyncFn({ groupId: context.workspace.groupId });
    runtimeState.lastRunAt = nowMs();
    runtimeState.lastFailureAt = result.ok ? null : nowMs();

    await safelyRecordSyncHistory(() =>
      finishSyncHistoryRun({
        authState: 'authenticated',
        networkState: context.networkState || 'unknown',
        pendingAfter: null,
        result,
        run: historyRun,
        status: result.ok ? 'success' : 'partial',
      }),
    );
    await setAutoSyncState({
      lastFinishedAt: new Date().toISOString(),
      lastReason: triggerReason,
      lastStatus: result.ok ? 'success' : 'partial',
    }).catch(() => null);

    return {
      ok: Boolean(result.ok),
      result,
      skipped: false,
    };
  } catch (error) {
    runtimeState.lastFailureAt = nowMs();
    await safelyRecordSyncHistory(() =>
      finishSyncHistoryRun({
        authState: context.session ? 'authenticated' : 'auth_required',
        error,
        networkState: context.networkState || 'unknown',
        pendingAfter: context.pendingCount,
        run: historyRun,
        status: 'failed',
      }),
    );
    await setAutoSyncState({
      lastFinishedAt: new Date().toISOString(),
      lastReason: triggerReason,
      lastStatus: 'failed',
    }).catch(() => null);

    return {
      error,
      ok: false,
      skipped: false,
    };
  } finally {
    runtimeState.syncInFlight = false;

    if (runtimeState.pendingReason && runtimeState.appState === 'active') {
      const pendingReason = runtimeState.pendingReason;
      runtimeState.pendingReason = null;
      notifyAutoSyncNeeded(pendingReason, { config });
    }
  }
};

export const notifyAutoSyncNeeded = (
  reason = AUTO_SYNC_REASONS.LOCAL_CHANGE,
  { config = AUTO_SYNC_DEFAULTS } = {},
) => {
  if (!runtimeState.initialized) {
    return {
      scheduled: false,
      reason: 'auto_sync_not_initialized',
    };
  }

  if (runtimeState.syncInFlight) {
    runtimeState.pendingReason = reason;
    return {
      pending: true,
      scheduled: false,
    };
  }

  if (runtimeState.appState !== 'active') {
    clearAutoSyncTimer();
    return {
      scheduled: false,
      reason: AUTO_SYNC_SKIP_REASONS.APP_INACTIVE,
    };
  }

  clearAutoSyncTimer();
  runtimeState.timer = setTimeout(() => {
    runtimeState.timer = null;
    runAutoSyncNow({ config, reason }).catch(() => {});
  }, config.debounceMs);

  return {
    scheduled: true,
  };
};

export const initializeAutoSync = () => {
  runtimeState.initialized = true;
  getAutoSyncState().catch(() => null);
  return {
    initialized: true,
  };
};

export const startAutoSync = ({ appState = 'active' } = {}) => {
  runtimeState.initialized = true;
  runtimeState.appState = appState;
};

export const stopAutoSync = () => {
  clearAutoSyncTimer();
  runtimeState.appState = 'inactive';
  runtimeState.pendingReason = null;
};

export const handleAutoSyncAppStateChange = (nextState) => {
  const wasActive = runtimeState.appState === 'active';
  runtimeState.appState = nextState === 'active' ? 'active' : 'inactive';

  if (runtimeState.appState !== 'active') {
    stopAutoSync();
    return {
      scheduled: false,
      reason: AUTO_SYNC_SKIP_REASONS.APP_INACTIVE,
    };
  }

  runtimeState.initialized = true;

  if (!wasActive) {
    return notifyAutoSyncNeeded(AUTO_SYNC_REASONS.APP_ACTIVE);
  }

  return {
    scheduled: false,
    reason: 'already_active',
  };
};

export const getAutoSyncState = async () => ({
  ...(await getStoredAutoSyncState().catch(() => ({}))),
  ...(await getAutoSyncSettings().catch(() => ({ autoSyncEnabled: true }))),
  appState: runtimeState.appState,
  initialized: runtimeState.initialized,
  syncInFlight: runtimeState.syncInFlight,
});

export const setAutoSyncEnabled = (enabled) => persistAutoSyncEnabled(enabled);

export const __resetAutoSyncRuntimeForTests = () => {
  clearAutoSyncTimer();
  runtimeState.appState = 'inactive';
  runtimeState.initialized = false;
  runtimeState.lastFailureAt = null;
  runtimeState.lastRunAt = null;
  runtimeState.pendingReason = null;
  runtimeState.syncInFlight = false;
};

export default {
  __resetAutoSyncRuntimeForTests,
  getAutoSyncState,
  handleAutoSyncAppStateChange,
  initializeAutoSync,
  isAutoSyncAllowed,
  loadAutoSyncContext,
  notifyAutoSyncNeeded,
  runAutoSyncNow,
  setAutoSyncEnabled,
  startAutoSync,
  stopAutoSync,
};
