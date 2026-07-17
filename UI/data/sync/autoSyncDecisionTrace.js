const nowIso = () => new Date().toISOString();

const initialTrace = () => ({
  autoSyncEnabled: null,
  backendReachable: null,
  backoffRemainingMs: 0,
  cooldownRemainingMs: 0,
  debounceDelayMs: null,
  groupIdPresent: false,
  hasAuthSession: false,
  hasConflicts: false,
  hasSharedWorkspace: false,
  inFlight: false,
  lastDebounceFiredAt: null,
  lastDecision: null,
  lastGuardEvaluationAt: null,
  lastNotifyAt: null,
  lastNotifyReason: null,
  lastRunFinishedAt: null,
  lastRunStartedAt: null,
  lastRunStatus: null,
  lastScheduleRequestedAt: null,
  lastScheduledAt: null,
  lastSkippedReason: null,
  networkState: 'unknown',
  notifierFlushedAt: null,
  notifierQueued: false,
  pendingOutboxCount: 0,
  serviceInitialized: false,
});

let trace = initialTrace();

const patchTrace = (updates = {}) => {
  trace = {
    ...trace,
    ...updates,
  };

  return getAutoSyncDecisionTrace();
};

export const recordNotifierQueued = (reason) =>
  patchTrace({
    lastNotifyAt: nowIso(),
    lastNotifyReason: reason,
    notifierQueued: true,
  });

export const recordNotifierFlushed = (reason) =>
  patchTrace({
    lastNotifyReason: reason || trace.lastNotifyReason,
    notifierFlushedAt: nowIso(),
    notifierQueued: false,
  });

export const recordServiceInitialized = () =>
  patchTrace({
    serviceInitialized: true,
  });

export const recordNotifyReceived = (reason) =>
  patchTrace({
    lastNotifyAt: nowIso(),
    lastNotifyReason: reason,
  });

export const recordScheduleRequested = ({ delayMs, reason }) =>
  patchTrace({
    debounceDelayMs: delayMs,
    lastNotifyReason: reason || trace.lastNotifyReason,
    lastScheduleRequestedAt: nowIso(),
  });

export const recordScheduled = ({ delayMs, reason }) =>
  patchTrace({
    debounceDelayMs: delayMs,
    lastDecision: 'scheduled',
    lastNotifyReason: reason || trace.lastNotifyReason,
    lastScheduledAt: nowIso(),
    lastSkippedReason: null,
    lastRunStatus: 'scheduled',
  });

export const recordDebounceFired = () =>
  patchTrace({
    lastDebounceFiredAt: nowIso(),
  });

export const recordGuardEvaluation = (context = {}) =>
  patchTrace({
    autoSyncEnabled: context.autoSyncEnabled !== false,
    backendReachable: context.networkState === 'backend_reachable',
    backoffRemainingMs: Number(context.backoffRemainingMs || 0),
    cooldownRemainingMs: Number(context.cooldownRemainingMs || 0),
    groupIdPresent: Boolean(context.workspace?.groupId),
    hasAuthSession: Boolean(context.session),
    hasConflicts: Number(context.conflictCount || 0) > 0,
    hasSharedWorkspace: Boolean(context.workspace?.isRemote && context.workspace?.groupId),
    inFlight: Boolean(context.syncInFlight),
    lastGuardEvaluationAt: nowIso(),
    networkState: context.networkState || 'unknown',
    pendingOutboxCount: Number(context.pendingCount || 0),
  });

export const recordSkippedDecision = (reason) =>
  patchTrace({
    lastDecision: 'skipped',
    lastSkippedReason: reason || 'unknown',
    lastRunStatus: 'skipped',
  });

export const recordRunStarted = () =>
  patchTrace({
    inFlight: true,
    lastDecision: 'run',
    lastRunStartedAt: nowIso(),
    lastRunStatus: 'syncing',
    lastSkippedReason: null,
  });

export const recordRunFinished = (status) =>
  patchTrace({
    inFlight: false,
    lastRunFinishedAt: nowIso(),
    lastRunStatus: status || 'unknown',
  });

export const getAutoSyncDecisionTrace = () => ({ ...trace });

export const clearAutoSyncDecisionTraceForTests = () => {
  trace = initialTrace();
};

export default {
  clearAutoSyncDecisionTraceForTests,
  getAutoSyncDecisionTrace,
  recordDebounceFired,
  recordGuardEvaluation,
  recordNotifierFlushed,
  recordNotifierQueued,
  recordNotifyReceived,
  recordRunFinished,
  recordRunStarted,
  recordScheduleRequested,
  recordScheduled,
  recordServiceInitialized,
  recordSkippedDecision,
};
