import {
  getCurrentSession,
  getFreshAuthSession,
} from '../auth/authService';
import { getCurrentWorkspace } from '../workspace/workspaceRepository';
import { runSyncReadinessCheck } from '../validation/syncReadinessCheck';
import { NETWORK_STATES } from '../network/networkStatusModel';
import {
  getNetworkDiagnostics,
  getNetworkStatus,
  refreshNetworkStatus,
} from '../network/networkStatusService';
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
  AUTO_SYNC_STATES,
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
  scheduledAt: null,
  scheduledReason: null,
  syncInFlight: false,
  timer: null,
};

const clearAutoSyncTimer = () => {
  if (runtimeState.timer) {
    clearTimeout(runtimeState.timer);
    runtimeState.timer = null;
  }

  runtimeState.scheduledAt = null;
  runtimeState.scheduledReason = null;
};

const getReasonText = (reason) => reason || AUTO_SYNC_REASONS.LOCAL_CHANGE;

const mapSkipReasonToState = (reason) => {
  if (reason === AUTO_SYNC_SKIP_REASONS.AUTO_SYNC_DISABLED) {
    return AUTO_SYNC_STATES.SKIPPED_DISABLED;
  }

  if (reason === AUTO_SYNC_SKIP_REASONS.APP_INACTIVE) {
    return AUTO_SYNC_STATES.SKIPPED_APP_INACTIVE;
  }

  if (reason === AUTO_SYNC_SKIP_REASONS.NETWORK_OFFLINE) {
    return AUTO_SYNC_STATES.SKIPPED_OFFLINE;
  }

  if (reason === AUTO_SYNC_SKIP_REASONS.BACKEND_UNREACHABLE) {
    return AUTO_SYNC_STATES.BACKEND_UNREACHABLE;
  }

  if (reason === AUTO_SYNC_SKIP_REASONS.SYNC_URL_MISSING) {
    return AUTO_SYNC_STATES.SYNC_URL_MISSING;
  }

  if (reason === AUTO_SYNC_SKIP_REASONS.SYNC_URL_INVALID) {
    return AUTO_SYNC_STATES.SYNC_URL_INVALID;
  }

  if (reason === AUTO_SYNC_SKIP_REASONS.NO_AUTH_SESSION) {
    return AUTO_SYNC_STATES.SKIPPED_NO_AUTH;
  }

  if (
    reason === AUTO_SYNC_SKIP_REASONS.WORKSPACE_REQUIRED ||
    reason === AUTO_SYNC_SKIP_REASONS.GROUP_ID_REQUIRED
  ) {
    return AUTO_SYNC_STATES.SKIPPED_NO_WORKSPACE;
  }

  if (reason === AUTO_SYNC_SKIP_REASONS.LOCAL_ONLY_MODE) {
    return AUTO_SYNC_STATES.SKIPPED_LOCAL_ONLY;
  }

  if (reason === AUTO_SYNC_SKIP_REASONS.CONFLICTS_PENDING) {
    return AUTO_SYNC_STATES.SKIPPED_CONFLICTS;
  }

  if (reason === AUTO_SYNC_SKIP_REASONS.RECENT_SYNC) {
    return AUTO_SYNC_STATES.COOLDOWN;
  }

  if (reason === AUTO_SYNC_SKIP_REASONS.BACKOFF_ACTIVE) {
    return AUTO_SYNC_STATES.BACKOFF;
  }

  return AUTO_SYNC_STATES.IDLE;
};

const saveRuntimeAutoSyncState = (state = {}) =>
  setAutoSyncState(state).catch(() => null);

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

  if (context.networkState === NETWORK_STATES.OFFLINE) {
    return {
      allowed: false,
      reason: AUTO_SYNC_SKIP_REASONS.NETWORK_OFFLINE,
    };
  }

  if (context.networkState === NETWORK_STATES.BACKEND_UNREACHABLE) {
    return {
      allowed: false,
      reason: AUTO_SYNC_SKIP_REASONS.BACKEND_UNREACHABLE,
    };
  }

  if (context.networkState === NETWORK_STATES.SYNC_URL_MISSING) {
    return {
      allowed: false,
      reason: AUTO_SYNC_SKIP_REASONS.SYNC_URL_MISSING,
    };
  }

  if (context.networkState === NETWORK_STATES.SYNC_URL_INVALID) {
    return {
      allowed: false,
      reason: AUTO_SYNC_SKIP_REASONS.SYNC_URL_INVALID,
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
  refreshNetwork = refreshNetworkStatus,
  runReadiness = runSyncReadinessCheck,
} = {}) => {
  const [settings, workspace, readiness] = await Promise.all([
    getSettings().catch(() => ({ autoSyncEnabled: true })),
    getWorkspace().catch(() => null),
    runReadiness().catch(() => null),
  ]);
  let session = null;
  let authError = null;
  let networkStatus = getNetworkStatus();

  const shouldReadSession =
    settings.autoSyncEnabled !== false &&
    appState === 'active' &&
    workspace?.isRemote &&
    workspace?.groupId;
  const shouldCheckNetwork =
    shouldReadSession && getConflictCount(readiness) === 0;

  if (shouldCheckNetwork) {
    networkStatus = await refreshNetwork().catch(() => networkStatus);
  }

  if (
    shouldReadSession &&
    ![
      NETWORK_STATES.OFFLINE,
      NETWORK_STATES.BACKEND_UNREACHABLE,
      NETWORK_STATES.SYNC_URL_INVALID,
      NETWORK_STATES.SYNC_URL_MISSING,
    ].includes(networkStatus?.networkState)
  ) {
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
    networkState: networkStatus?.networkState || NETWORK_STATES.UNKNOWN,
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
    autoSyncState: mapSkipReasonToState(reason),
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
  runtimeState.scheduledAt = null;
  runtimeState.scheduledReason = null;
  let historyRun = null;

  try {
    await setAutoSyncState({
      autoSyncState: AUTO_SYNC_STATES.SYNCING,
      lastReason: triggerReason,
      lastStatus: 'syncing',
      startedAt: new Date().toISOString(),
    }).catch(() => null);

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
      autoSyncState: result.ok ? AUTO_SYNC_STATES.IDLE : AUTO_SYNC_STATES.FAILED,
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
      autoSyncState: AUTO_SYNC_STATES.FAILED,
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
    saveRuntimeAutoSyncState({
      autoSyncState: AUTO_SYNC_STATES.SKIPPED_APP_INACTIVE,
      lastReason: reason,
      lastSkipReason: AUTO_SYNC_SKIP_REASONS.APP_INACTIVE,
      lastStatus: 'skipped',
    });
    return {
      scheduled: false,
      reason: AUTO_SYNC_SKIP_REASONS.APP_INACTIVE,
    };
  }

  clearAutoSyncTimer();
  runtimeState.scheduledAt = nowMs();
  runtimeState.scheduledReason = reason;
  runtimeState.timer = setTimeout(() => {
    runtimeState.timer = null;
    runtimeState.scheduledAt = null;
    runtimeState.scheduledReason = null;
    runAutoSyncNow({ config, reason }).catch(() => {});
  }, config.debounceMs);
  saveRuntimeAutoSyncState({
    autoSyncState: AUTO_SYNC_STATES.SCHEDULED,
    lastReason: reason,
    lastStatus: 'scheduled',
    scheduledAt: new Date().toISOString(),
    scheduledDelayMs: config.debounceMs,
  });

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
  const hadScheduledSync = Boolean(runtimeState.timer);
  clearAutoSyncTimer();
  runtimeState.appState = 'inactive';
  runtimeState.pendingReason = null;
  runtimeState.scheduledAt = null;
  runtimeState.scheduledReason = null;

  if (hadScheduledSync) {
    saveRuntimeAutoSyncState({
      autoSyncState: AUTO_SYNC_STATES.SKIPPED_APP_INACTIVE,
      lastSkipReason: AUTO_SYNC_SKIP_REASONS.APP_INACTIVE,
      lastStatus: 'skipped',
    });
  }
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

const getRuntimeAutoSyncState = ({
  config = AUTO_SYNC_DEFAULTS,
  storedState = {},
} = {}) => {
  const currentTime = nowMs();
  const backoffRemainingMs = getBackoffRemaining({
    config,
    currentTime,
    lastFailureAt: runtimeState.lastFailureAt,
  });
  const cooldownRemainingMs = getCooldownRemaining({
    config,
    currentTime,
    lastRunAt: runtimeState.lastRunAt,
  });

  if (runtimeState.syncInFlight) {
    return AUTO_SYNC_STATES.SYNCING;
  }

  if (runtimeState.timer) {
    return AUTO_SYNC_STATES.SCHEDULED;
  }

  if (backoffRemainingMs > 0) {
    return AUTO_SYNC_STATES.BACKOFF;
  }

  if (cooldownRemainingMs > 0) {
    return AUTO_SYNC_STATES.COOLDOWN;
  }

  return storedState.autoSyncState || AUTO_SYNC_STATES.IDLE;
};

export const getAutoSyncState = async ({ config = AUTO_SYNC_DEFAULTS } = {}) => {
  const [storedState, settings] = await Promise.all([
    getStoredAutoSyncState().catch(() => ({})),
    getAutoSyncSettings().catch(() => ({ autoSyncEnabled: true })),
  ]);
  const currentTime = nowMs();

  return {
    ...storedState,
    ...settings,
    appState: runtimeState.appState,
    autoSyncState: getRuntimeAutoSyncState({ config, storedState }),
    backoffRemainingMs: getBackoffRemaining({
      config,
      currentTime,
      lastFailureAt: runtimeState.lastFailureAt,
    }),
    cooldownRemainingMs: getCooldownRemaining({
      config,
      currentTime,
      lastRunAt: runtimeState.lastRunAt,
    }),
    initialized: runtimeState.initialized,
    scheduled: Boolean(runtimeState.timer),
    scheduledReason: runtimeState.scheduledReason,
    syncInFlight: runtimeState.syncInFlight,
  };
};

export const getAutoSyncDiagnostics = async ({
  getSession = getCurrentSession,
  getWorkspace = getCurrentWorkspace,
  runReadiness = runSyncReadinessCheck,
} = {}) => {
  const [autoSyncState, workspace, readiness, session] = await Promise.all([
    getAutoSyncState().catch(() => ({})),
    getWorkspace().catch(() => null),
    runReadiness().catch(() => null),
    getSession().catch(() => null),
  ]);
  const pendingOutboxCount = getPendingCount(readiness);
  const conflictCount = getConflictCount(readiness);

  return {
    autoSyncEnabled: autoSyncState.autoSyncEnabled !== false,
    autoSyncState: autoSyncState.autoSyncState || AUTO_SYNC_STATES.IDLE,
    conflictCount,
    currentWorkspaceMode: workspace?.isRemote ? 'shared' : 'local',
    hasAuthSession: Boolean(session),
    hasGroupId: Boolean(workspace?.groupId),
    lastAutoSyncReason: autoSyncState.lastReason || null,
    lastSkippedReason: autoSyncState.lastSkipReason || null,
    lastSyncHistoryStatus: autoSyncState.lastStatus || null,
    network: getNetworkDiagnostics(),
    pendingOutboxCount,
  };
};

export const setAutoSyncEnabled = (enabled) => persistAutoSyncEnabled(enabled);

export const __resetAutoSyncRuntimeForTests = () => {
  clearAutoSyncTimer();
  runtimeState.appState = 'inactive';
  runtimeState.initialized = false;
  runtimeState.lastFailureAt = null;
  runtimeState.lastRunAt = null;
  runtimeState.pendingReason = null;
  runtimeState.scheduledAt = null;
  runtimeState.scheduledReason = null;
  runtimeState.syncInFlight = false;
};

export default {
  __resetAutoSyncRuntimeForTests,
  getAutoSyncState,
  getAutoSyncDiagnostics,
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
