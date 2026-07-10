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
  DEFAULT_SYNC_REQUEST_TIMEOUT_MS,
  validateSyncConfig,
} from './syncConfig';
import {
  finishSyncHistoryRun,
  getSyncHistoryWorkspaceName,
  recordSkippedSyncRun,
  recoverStaleSyncHistoryRuns,
  safelyRecordSyncHistory,
  sanitizeSyncHistoryError,
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
import { setAutoSyncNotifier } from './autoSyncNotifier';
import {
  clearAutoSyncDecisionTraceForTests,
  getAutoSyncDecisionTrace,
  recordDebounceFired,
  recordGuardEvaluation,
  recordNotifyReceived,
  recordRunFinished,
  recordRunStarted,
  recordScheduleRequested,
  recordScheduled,
  recordServiceInitialized,
  recordSkippedDecision,
} from './autoSyncDecisionTrace';

const nowMs = () => Date.now();

const runtimeState = {
  appState: 'inactive',
  initialized: false,
  lastNotifyAt: null,
  lastNotifyReason: null,
  lastFailureAt: null,
  lastFailureCode: null,
  lastFailureMessage: null,
  lastRunAt: null,
  lastRunFinishedAt: null,
  lastRunStartedAt: null,
  pendingReason: null,
  scheduledAt: null,
  scheduledReason: null,
  autoSyncEnabled: true,
  staleHistoryRecoveredCount: 0,
  staleInFlightRecovered: false,
  syncInFlightStartedAt: null,
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

const getTraceSkipReason = (reason) => {
  if (reason === AUTO_SYNC_SKIP_REASONS.NO_AUTH_SESSION) {
    return 'no_auth';
  }

  if (
    reason === AUTO_SYNC_SKIP_REASONS.WORKSPACE_REQUIRED ||
    reason === AUTO_SYNC_SKIP_REASONS.LOCAL_ONLY_MODE
  ) {
    return 'no_shared_workspace';
  }

  if (reason === AUTO_SYNC_SKIP_REASONS.GROUP_ID_REQUIRED) {
    return 'missing_groupId';
  }

  if (reason === AUTO_SYNC_SKIP_REASONS.SYNC_URL_MISSING) {
    return 'sync_base_url_missing';
  }

  if (reason === AUTO_SYNC_SKIP_REASONS.SYNC_URL_INVALID) {
    return 'sync_base_url_invalid';
  }

  if (reason === AUTO_SYNC_SKIP_REASONS.RECENT_SYNC) {
    return 'cooldown_active';
  }

  return reason || 'unknown';
};

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

const isStoredSyncingStateStale = ({
  config = AUTO_SYNC_DEFAULTS,
  currentTime = nowMs(),
  storedState = {},
} = {}) => {
  const startedAtMs = Date.parse(storedState.startedAt || 0);

  return (
    (storedState.autoSyncState === AUTO_SYNC_STATES.SYNCING ||
      storedState.syncInFlight) &&
    startedAtMs > 0 &&
    currentTime - startedAtMs > config.staleInFlightMs
  );
};

export const recoverStaleAutoSyncState = async ({
  config = AUTO_SYNC_DEFAULTS,
  getStoredState = getStoredAutoSyncState,
  recoverHistory = recoverStaleSyncHistoryRuns,
} = {}) => {
  const currentTime = nowMs();
  const storedState = await getStoredState().catch(() => ({}));
  const historyRecovery = await recoverHistory({
    olderThanMs: config.staleInFlightMs,
    now: currentTime,
  }).catch(() => ({ recoveredCount: 0 }));
  const staleInFlightRecovered = isStoredSyncingStateStale({
    config,
    currentTime,
    storedState,
  });

  runtimeState.staleHistoryRecoveredCount = Number(
    historyRecovery?.recoveredCount || 0,
  );
  runtimeState.staleInFlightRecovered = staleInFlightRecovered;

  if (staleInFlightRecovered) {
    runtimeState.syncInFlight = false;
    runtimeState.syncInFlightStartedAt = null;
    runtimeState.lastFailureAt = currentTime;
    runtimeState.lastFailureCode = 'sync_timeout';
    runtimeState.lastFailureMessage = 'La sincronizacion tardo demasiado.';
    await setAutoSyncState({
      autoSyncState: AUTO_SYNC_STATES.FAILED,
      lastErrorCode: 'sync_timeout',
      lastErrorMessage: 'La sincronizacion tardo demasiado.',
      lastFinishedAt: new Date(currentTime).toISOString(),
      lastStatus: 'failed',
      syncInFlight: false,
    }).catch(() => null);
  }

  return {
    staleHistoryRecoveredCount: runtimeState.staleHistoryRecoveredCount,
    staleInFlightRecovered,
  };
};

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

  if (
    context.cooldownRemainingMs > 0 &&
    !(
      context.triggerReason === AUTO_SYNC_REASONS.LOCAL_CHANGE &&
      context.pendingCount > 0
    )
  ) {
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
  reason = null,
  refreshNetwork = refreshNetworkStatus,
  runReadiness = runSyncReadinessCheck,
} = {}) => {
  await recoverStaleAutoSyncState({ config }).catch(() => null);

  const [settings, workspace, readiness] = await Promise.all([
    getSettings().catch(() => ({ autoSyncEnabled: true })),
    getWorkspace().catch(() => null),
    runReadiness().catch(() => null),
  ]);
  let session = null;
  let authError = null;
  let networkStatus = getNetworkStatus();
  runtimeState.autoSyncEnabled = settings.autoSyncEnabled !== false;

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
    triggerReason: reason,
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

const saveAutoSyncFailureState = async ({
  error,
  triggerReason,
} = {}) => {
  const sanitizedError = sanitizeSyncHistoryError(error || 'unknown_sync_error');

  runtimeState.lastFailureAt = nowMs();
  runtimeState.lastFailureCode =
    sanitizedError.errorCode || 'unknown_sync_error';
  runtimeState.lastFailureMessage =
    sanitizedError.safeErrorMessage || 'unknown_sync_error';

  await setAutoSyncState({
    autoSyncState: AUTO_SYNC_STATES.FAILED,
    lastErrorCode: runtimeState.lastFailureCode,
    lastErrorMessage: runtimeState.lastFailureMessage,
    lastFinishedAt: new Date().toISOString(),
    lastReason: triggerReason,
    lastStatus: 'failed',
    syncInFlight: false,
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
    reason,
  });
  recordGuardEvaluation(context);
  const eligibility = isAutoSyncAllowed(context);

  if (!eligibility.allowed) {
    recordSkippedDecision(getTraceSkipReason(eligibility.reason));
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
  runtimeState.syncInFlightStartedAt = nowMs();
  runtimeState.lastRunStartedAt = runtimeState.syncInFlightStartedAt;
  runtimeState.scheduledAt = null;
  runtimeState.scheduledReason = null;
  recordRunStarted();
  let historyRun = null;

  try {
    await setAutoSyncState({
      autoSyncState: AUTO_SYNC_STATES.SYNCING,
      lastReason: triggerReason,
      lastStatus: 'syncing',
      startedAt: new Date().toISOString(),
      syncInFlight: true,
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
    runtimeState.lastRunFinishedAt = runtimeState.lastRunAt;
    runtimeState.lastFailureAt = result.ok ? null : nowMs();
    runtimeState.lastFailureCode = result.ok ? null : 'unknown_sync_error';
    runtimeState.lastFailureMessage = result.ok ? null : 'unknown_sync_error';
    recordRunFinished(result.ok ? 'success' : 'partial');

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
      lastErrorCode: result.ok ? null : 'unknown_sync_error',
      lastErrorMessage: result.ok ? null : 'unknown_sync_error',
      lastFinishedAt: new Date().toISOString(),
      lastReason: triggerReason,
      lastStatus: result.ok ? 'success' : 'partial',
      syncInFlight: false,
    }).catch(() => null);

    return {
      ok: Boolean(result.ok),
      result,
      skipped: false,
    };
  } catch (error) {
    runtimeState.lastRunFinishedAt = nowMs();
    recordRunFinished('failed');
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
    await saveAutoSyncFailureState({ error, triggerReason });

    return {
      error,
      ok: false,
      skipped: false,
    };
  } finally {
    runtimeState.syncInFlight = false;
    runtimeState.syncInFlightStartedAt = null;

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
  runtimeState.lastNotifyAt = nowMs();
  runtimeState.lastNotifyReason = reason;
  recordNotifyReceived(reason);
  recordScheduleRequested({ delayMs: config.debounceMs, reason });

  if (!runtimeState.initialized) {
    recordSkippedDecision('notifier_not_initialized');
    return {
      scheduled: false,
      reason: 'auto_sync_not_initialized',
    };
  }

  if (runtimeState.autoSyncEnabled === false) {
    clearAutoSyncTimer();
    recordSkippedDecision('auto_sync_disabled');
    saveRuntimeAutoSyncState({
      autoSyncState: AUTO_SYNC_STATES.SKIPPED_DISABLED,
      lastNotifyAt: new Date(runtimeState.lastNotifyAt).toISOString(),
      lastNotifyReason: reason,
      lastReason: reason,
      lastSkipReason: AUTO_SYNC_SKIP_REASONS.AUTO_SYNC_DISABLED,
      lastStatus: 'skipped',
    });
    return {
      scheduled: false,
      reason: AUTO_SYNC_SKIP_REASONS.AUTO_SYNC_DISABLED,
    };
  }

  if (runtimeState.syncInFlight) {
    runtimeState.pendingReason = reason;
    recordSkippedDecision('sync_in_flight');
    return {
      pending: true,
      scheduled: false,
    };
  }

  if (runtimeState.appState !== 'active') {
    clearAutoSyncTimer();
    recordSkippedDecision('app_inactive');
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

  if (reason === AUTO_SYNC_REASONS.LOCAL_CHANGE) {
    if (runtimeState.scheduledReason === AUTO_SYNC_REASONS.LOCAL_CHANGE) {
      return {
        scheduled: true,
      };
    }

    clearAutoSyncTimer();
    runtimeState.scheduledAt = nowMs();
    runtimeState.scheduledReason = reason;
    recordScheduled({ delayMs: config.debounceMs, reason });
    saveRuntimeAutoSyncState({
      autoSyncState: AUTO_SYNC_STATES.SCHEDULED,
      lastNotifyAt: new Date(runtimeState.lastNotifyAt).toISOString(),
      lastNotifyReason: reason,
      lastReason: reason,
      lastStatus: 'scheduled',
      scheduledAt: new Date().toISOString(),
      scheduledDelayMs: config.debounceMs,
    });
    runtimeState.timer = setTimeout(() => {
      recordDebounceFired();
      runtimeState.scheduledAt = null;
      runtimeState.scheduledReason = null;
      runtimeState.timer = null;
      runAutoSyncNow({ config, reason }).catch(() => {});
    }, config.debounceMs);

    return {
      scheduled: true,
    };
  }

  clearAutoSyncTimer();
  runtimeState.scheduledAt = nowMs();
  runtimeState.scheduledReason = reason;
  recordScheduled({ delayMs: config.debounceMs, reason });
  runtimeState.timer = setTimeout(() => {
    recordDebounceFired();
    runtimeState.timer = null;
    runtimeState.scheduledAt = null;
    runtimeState.scheduledReason = null;
    runAutoSyncNow({ config, reason }).catch(() => {});
  }, config.debounceMs);
  saveRuntimeAutoSyncState({
    autoSyncState: AUTO_SYNC_STATES.SCHEDULED,
    lastNotifyAt: new Date(runtimeState.lastNotifyAt).toISOString(),
    lastNotifyReason: reason,
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
  recordServiceInitialized();
  setAutoSyncNotifier(notifyAutoSyncNeeded);
  getAutoSyncSettings()
    .then((settings) => {
      runtimeState.autoSyncEnabled = settings.autoSyncEnabled !== false;
    })
    .catch(() => {});
  recoverStaleAutoSyncState().catch(() => null);
  getAutoSyncState().catch(() => null);
  return {
    initialized: true,
  };
};

export const startAutoSync = ({ appState = 'active' } = {}) => {
  runtimeState.initialized = true;
  runtimeState.appState = appState;
  recordServiceInitialized();
  setAutoSyncNotifier(notifyAutoSyncNeeded);
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

  if (
    [
      AUTO_SYNC_STATES.SYNC_URL_MISSING,
      AUTO_SYNC_STATES.SYNC_URL_INVALID,
    ].includes(storedState.autoSyncState) &&
    validateSyncConfig().ok
  ) {
    return AUTO_SYNC_STATES.IDLE;
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
    lastNotifyAt: runtimeState.lastNotifyAt
      ? new Date(runtimeState.lastNotifyAt).toISOString()
      : storedState.lastNotifyAt || null,
    lastNotifyReason: runtimeState.lastNotifyReason || storedState.lastNotifyReason || null,
    lastRunFinishedAt: runtimeState.lastRunFinishedAt
      ? new Date(runtimeState.lastRunFinishedAt).toISOString()
      : storedState.lastFinishedAt || null,
    lastRunStartedAt: runtimeState.lastRunStartedAt
      ? new Date(runtimeState.lastRunStartedAt).toISOString()
      : storedState.startedAt || null,
    scheduled: Boolean(runtimeState.timer),
    scheduledAt: runtimeState.scheduledAt
      ? new Date(runtimeState.scheduledAt).toISOString()
      : storedState.scheduledAt || null,
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
  const network = getNetworkDiagnostics();
  const decisionTrace = {
    ...getAutoSyncDecisionTrace(),
    autoSyncEnabled: autoSyncState.autoSyncEnabled !== false,
    backendReachable: network.backendReachable === true,
    backoffRemainingMs: autoSyncState.backoffRemainingMs || 0,
    cooldownRemainingMs: autoSyncState.cooldownRemainingMs || 0,
    groupIdPresent: Boolean(workspace?.groupId),
    hasAuthSession: Boolean(session),
    hasConflicts: conflictCount > 0,
    hasSharedWorkspace: Boolean(workspace?.isRemote && workspace?.groupId),
    inFlight: Boolean(autoSyncState.syncInFlight),
    networkState: network.networkState || 'unknown',
    pendingOutboxCount,
    serviceInitialized: Boolean(autoSyncState.initialized),
  };

  return {
    autoSyncEnabled: autoSyncState.autoSyncEnabled !== false,
    autoSyncState: autoSyncState.autoSyncState || AUTO_SYNC_STATES.IDLE,
    backoffRemainingMs: autoSyncState.backoffRemainingMs || 0,
    conflictCount,
    cooldownRemainingMs: autoSyncState.cooldownRemainingMs || 0,
    currentWorkspaceMode: workspace?.isRemote ? 'shared' : 'local',
    hasAuthSession: Boolean(session),
    hasConflicts: conflictCount > 0,
    hasGroupId: Boolean(workspace?.groupId),
    hasSharedWorkspace: Boolean(workspace?.isRemote && workspace?.groupId),
    inFlight: Boolean(autoSyncState.syncInFlight),
    lastAutoSyncReason: autoSyncState.lastReason || null,
    lastErrorCode:
      autoSyncState.lastErrorCode || runtimeState.lastFailureCode || null,
    lastErrorMessage:
      autoSyncState.lastErrorMessage || runtimeState.lastFailureMessage || null,
    lastNotifyAt: autoSyncState.lastNotifyAt || null,
    lastNotifyReason: autoSyncState.lastNotifyReason || null,
    lastRunFinishedAt: autoSyncState.lastRunFinishedAt || autoSyncState.lastFinishedAt || null,
    lastRunStartedAt: autoSyncState.lastRunStartedAt || autoSyncState.startedAt || null,
    lastScheduledAt: autoSyncState.scheduledAt || null,
    lastSkippedReason: autoSyncState.lastSkipReason || null,
    lastSyncHistoryStatus: autoSyncState.lastStatus || null,
    network,
    networkState: network.networkState || 'unknown',
    pendingOutboxCount,
    decisionTrace,
    scheduled: Boolean(autoSyncState.scheduled),
    staleHistoryRecoveredCount: runtimeState.staleHistoryRecoveredCount,
    staleInFlightRecovered: runtimeState.staleInFlightRecovered,
    syncRequestTimeoutMs: DEFAULT_SYNC_REQUEST_TIMEOUT_MS,
  };
};

export const setAutoSyncEnabled = async (enabled) => {
  runtimeState.autoSyncEnabled = Boolean(enabled);
  if (!runtimeState.autoSyncEnabled) {
    clearAutoSyncTimer();
  }

  return persistAutoSyncEnabled(enabled);
};

export const __resetAutoSyncRuntimeForTests = () => {
  clearAutoSyncTimer();
  clearAutoSyncDecisionTraceForTests();
  runtimeState.appState = 'inactive';
  runtimeState.autoSyncEnabled = true;
  runtimeState.lastNotifyAt = null;
  runtimeState.lastNotifyReason = null;
  runtimeState.initialized = false;
  runtimeState.lastFailureAt = null;
  runtimeState.lastFailureCode = null;
  runtimeState.lastFailureMessage = null;
  runtimeState.lastRunAt = null;
  runtimeState.lastRunFinishedAt = null;
  runtimeState.lastRunStartedAt = null;
  runtimeState.pendingReason = null;
  runtimeState.scheduledAt = null;
  runtimeState.scheduledReason = null;
  runtimeState.staleHistoryRecoveredCount = 0;
  runtimeState.staleInFlightRecovered = false;
  runtimeState.syncInFlightStartedAt = null;
  runtimeState.syncInFlight = false;
};

export { clearAutoSyncDecisionTraceForTests, getAutoSyncDecisionTrace };

export default {
  __resetAutoSyncRuntimeForTests,
  clearAutoSyncDecisionTraceForTests,
  getAutoSyncDecisionTrace,
  getAutoSyncState,
  getAutoSyncDiagnostics,
  handleAutoSyncAppStateChange,
  initializeAutoSync,
  isAutoSyncAllowed,
  loadAutoSyncContext,
  notifyAutoSyncNeeded,
  recoverStaleAutoSyncState,
  runAutoSyncNow,
  setAutoSyncEnabled,
  startAutoSync,
  stopAutoSync,
};
