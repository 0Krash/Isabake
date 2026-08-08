import { useCallback, useEffect, useState } from 'react';

import { createSyncCenterSummary, getUserSafeSyncError } from '../../components/Sync/syncCenterModel';
import { getCurrentSession } from '../../data/auth/authService';
import {
  getCurrentWorkspace,
  getOrCreateDefaultLocalWorkspace,
} from '../../data/workspace/workspaceRepository';
import { runSyncReadinessCheck } from '../../data/validation/syncReadinessCheck';
import {
  pullRemoteChanges,
  pushPendingChanges,
  runSync,
} from '../../data/sync/syncService';
import {
  checkSyncIntegrity,
  runSyncRepair,
  SYNC_REPAIR_SCOPES,
} from '../../data/sync/syncIntegrityService';
import {
  finishSyncHistoryRun,
  getSyncHistoryAuthState,
  getSyncHistoryWorkspaceName,
  recordSkippedSyncRun,
  safelyRecordSyncHistory,
  startSyncHistoryRun,
} from '../../data/sync/syncHistoryService';
import { setAutoSyncState } from '../../data/sync/autoSyncStateRepository';
import { getSyncState } from '../../data/sync/syncStateRepository';

export const loadSyncCenterStatus = async ({
  getSession = getCurrentSession,
  getState = getSyncState,
  getWorkspace = getCurrentWorkspace,
  runReadiness = runSyncReadinessCheck,
} = {}) => {
  const currentWorkspace =
    (await getWorkspace()) || (await getOrCreateDefaultLocalWorkspace());
  const session = await getSession().catch(() => null);
  const canUseSharedWorkspace =
    currentWorkspace?.isRemote &&
    (!currentWorkspace.accountUserId ||
      currentWorkspace.accountUserId === session?.userId);
  const syncGroupId = canUseSharedWorkspace
    ? currentWorkspace.groupId
    : null;
  const [readiness, lastSyncState] = await Promise.all([
    runReadiness({ groupId: syncGroupId }),
    currentWorkspace?.groupId
      ? getState(currentWorkspace.groupId).catch(() => null)
      : Promise.resolve(null),
  ]);
  const summary = createSyncCenterSummary({
    currentWorkspace,
    lastSyncState,
    readiness,
    session,
  });

  return {
    authStatus: summary.authStatus,
    conflictCount: summary.conflictCount,
    currentWorkspace,
    failedCount: summary.failedCount,
    lastSyncState,
    pendingCount: summary.pendingCount,
    readiness,
    session,
    summary,
  };
};

const requireSharedSyncReady = ({ currentWorkspace, session } = {}) => {
  if (!currentWorkspace?.isRemote) {
    throw new Error('local_only_mode');
  }

  if (!currentWorkspace.groupId) {
    throw new Error('groupId_required');
  }

  if (!session) {
    throw new Error('auth_required');
  }

  if (session.sessionState === 'expired') {
    throw new Error('session_expired');
  }

  if (
    currentWorkspace.accountUserId &&
    currentWorkspace.accountUserId !== session.userId
  ) {
    throw new Error('workspace_account_mismatch');
  }

  return currentWorkspace.groupId;
};

const getHistoryActionType = (action) => {
  if (action === 'full') {
    return 'full_sync';
  }

  return action;
};

const getHistoryContext = (status = {}) => ({
  authState: getSyncHistoryAuthState(status),
  groupId: status.currentWorkspace?.groupId || null,
  pendingBefore: status.pendingCount ?? null,
  workspaceName: getSyncHistoryWorkspaceName(status.currentWorkspace),
});

const getSyncResultError = (result = {}) =>
  result.error || result.push?.error || result.pull?.error || null;

const recordManualSyncState = ({
  actionType,
  pendingCount = 0,
  status = 'success',
} = {}) =>
  setAutoSyncState({
    autoSyncState: 'idle',
    lastFinishedAt: new Date().toISOString(),
    lastReason: `manual_${actionType || 'sync'}`,
    lastStatus: status,
    pendingOutboxCount: Number(pendingCount || 0),
    syncInFlight: false,
  }).catch(() => null);

export const runManualSyncAction = async ({
  action,
  client,
  loadStatus = loadSyncCenterStatus,
  pull = pullRemoteChanges,
  push = pushPendingChanges,
  sync = runSync,
} = {}) => {
  const before = await loadStatus();
  const actionType = getHistoryActionType(action);
  const historyContext = getHistoryContext(before);
  let groupId;
  let historyRun = null;

  try {
    groupId = requireSharedSyncReady(before);
  } catch (error) {
    await safelyRecordSyncHistory(() =>
      recordSkippedSyncRun({
        ...historyContext,
        actionType,
        error,
        reason: error?.message || 'unknown_sync_error',
        triggerSource: 'manual',
      }),
    );
    throw error;
  }

  historyRun = await safelyRecordSyncHistory(() =>
    startSyncHistoryRun({
      ...historyContext,
      actionType,
      triggerSource: 'manual',
    }),
  );
  let result;

  try {
    if (action === 'push') {
      result = await push({ client, groupId });
    } else if (action === 'pull') {
      result = await pull({ client, groupId });
    } else if (action === 'full') {
      result = await sync({ client, groupId });
    } else {
      throw new Error('sync_action_unknown');
    }
  } catch (error) {
    await safelyRecordSyncHistory(() =>
      finishSyncHistoryRun({
        authState: historyContext.authState,
        error,
        pendingAfter: before.pendingCount ?? null,
        run: historyRun,
        status: 'failed',
      }),
    );
    await recordManualSyncState({
      actionType,
      pendingCount: before.pendingCount,
      status: 'failed',
    });
    throw error;
  }

  const after = await loadStatus();
  const syncResultError = getSyncResultError(result);

  await safelyRecordSyncHistory(() =>
    finishSyncHistoryRun({
      authState: getSyncHistoryAuthState(after),
      error: syncResultError,
      pendingAfter: after.pendingCount ?? null,
      result,
      run: historyRun,
      status: syncResultError ? 'failed' : null,
    }),
  );

  if (syncResultError) {
    await recordManualSyncState({
      actionType,
      pendingCount: after.pendingCount,
      status: 'failed',
    });
    throw new Error(syncResultError);
  }

  await recordManualSyncState({
    actionType,
    pendingCount: after.pendingCount,
    status: 'success',
  });

  return {
    after,
    before,
    groupId,
    result,
  };
};

export default function useSyncCenter({ autoLoad = true, client } = {}) {
  const [authStatus, setAuthStatus] = useState('auth_required');
  const [conflictCount, setConflictCount] = useState(0);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [error, setError] = useState(null);
  const [failedCount, setFailedCount] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [integrityReport, setIntegrityReport] = useState(null);
  const [lastRepairResult, setLastRepairResult] = useState(null);
  const [lastSyncState, setLastSyncState] = useState(null);
  const [loading, setLoading] = useState(Boolean(autoLoad));
  const [pendingCount, setPendingCount] = useState(0);
  const [readiness, setReadiness] = useState(null);
  const [summary, setSummary] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const applyStatus = useCallback((status) => {
    setAuthStatus(status.authStatus);
    setConflictCount(status.conflictCount);
    setCurrentWorkspace(status.currentWorkspace);
    setFailedCount(status.failedCount);
    setLastSyncState(status.lastSyncState);
    setPendingCount(status.pendingCount);
    setReadiness(status.readiness);
    setSummary(status.summary);
  }, []);

  const refreshStatus = useCallback(async ({ recordHistory = false } = {}) => {
    setLoading(true);
    setError(null);

    try {
      const status = await loadSyncCenterStatus();
      applyStatus(status);

      if (recordHistory) {
        await safelyRecordSyncHistory(async () => {
          const context = getHistoryContext(status);
          const run = await startSyncHistoryRun({
            ...context,
            actionType: 'status_refresh',
            triggerSource: 'manual',
          });

          await finishSyncHistoryRun({
            authState: context.authState,
            pendingAfter: status.pendingCount ?? null,
            result: { ok: true },
            run,
            status: 'success',
          });
        });
      }

      return status;
    } catch (nextError) {
      const message = getUserSafeSyncError(nextError);
      setError(message);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [applyStatus]);

  const runAction = useCallback(
    async (action) => {
      setSyncing(true);
      setError(null);
      setLastResult(null);

      try {
        const result = await runManualSyncAction({ action, client });
        setLastResult(result.result);
        applyStatus(result.after);
        return result;
      } catch (nextError) {
        const message = getUserSafeSyncError(nextError);
        setError(message);
        throw nextError;
      } finally {
        setSyncing(false);
      }
    },
    [applyStatus, client],
  );

  const reviewBackup = useCallback(async () => {
    setSyncing(true);
    setError(null);

    try {
      const before = await loadSyncCenterStatus();
      const groupId = requireSharedSyncReady(before);
      const report = await checkSyncIntegrity({
        client,
        groupId,
        verifyRemote: true,
      });

      setIntegrityReport(report);
      applyStatus(await loadSyncCenterStatus());
      return report;
    } catch (nextError) {
      const message = getUserSafeSyncError(nextError);
      setError(message);
      throw nextError;
    } finally {
      setSyncing(false);
    }
  }, [applyStatus, client]);

  const repairBackup = useCallback(async () => {
    setSyncing(true);
    setError(null);

    try {
      const before = await loadSyncCenterStatus();
      const groupId = requireSharedSyncReady(before);
      const result = await runSyncRepair({
        client,
        confirm: true,
        groupId,
        scope: SYNC_REPAIR_SCOPES.FULL,
        verifyRemote: true,
      });

      setLastRepairResult(result);
      applyStatus(await loadSyncCenterStatus());
      return result;
    } catch (nextError) {
      const message = getUserSafeSyncError(nextError);
      setError(message);
      throw nextError;
    } finally {
      setSyncing(false);
    }
  }, [applyStatus, client]);

  useEffect(() => {
    if (autoLoad) {
      refreshStatus().catch(() => {});
    }
  }, [autoLoad, refreshStatus]);

  return {
    authStatus,
    conflictCount,
    currentWorkspace,
    error,
    failedCount,
    integrityReport,
    lastRepairResult,
    lastResult,
    lastSyncState,
    loading,
    pendingCount,
    readiness,
    refreshStatus,
    repairBackup,
    reviewBackup,
    runFullSync: () => runAction('full'),
    runPull: () => runAction('pull'),
    runPush: () => runAction('push'),
    summary,
    syncing,
  };
}
