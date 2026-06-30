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
  finishSyncHistoryRun,
  getSyncHistoryAuthState,
  getSyncHistoryWorkspaceName,
  recordSkippedSyncRun,
  safelyRecordSyncHistory,
  startSyncHistoryRun,
} from '../../data/sync/syncHistoryService';
import { getSyncState } from '../../data/sync/syncStateRepository';

export const loadSyncCenterStatus = async ({
  getSession = getCurrentSession,
  getState = getSyncState,
  getWorkspace = getCurrentWorkspace,
  runReadiness = runSyncReadinessCheck,
} = {}) => {
  const currentWorkspace =
    (await getWorkspace()) || (await getOrCreateDefaultLocalWorkspace());
  const [session, readiness, lastSyncState] = await Promise.all([
    getSession().catch(() => null),
    runReadiness(),
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
    throw error;
  }

  const after = await loadStatus();

  await safelyRecordSyncHistory(() =>
    finishSyncHistoryRun({
      authState: getSyncHistoryAuthState(after),
      pendingAfter: after.pendingCount ?? null,
      result,
      run: historyRun,
    }),
  );

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
    lastResult,
    lastSyncState,
    loading,
    pendingCount,
    readiness,
    refreshStatus,
    runFullSync: () => runAction('full'),
    runPull: () => runAction('pull'),
    runPush: () => runAction('push'),
    summary,
    syncing,
  };
}
