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

export const runManualSyncAction = async ({
  action,
  client,
  loadStatus = loadSyncCenterStatus,
  pull = pullRemoteChanges,
  push = pushPendingChanges,
  sync = runSync,
} = {}) => {
  const before = await loadStatus();
  const groupId = requireSharedSyncReady(before);
  let result;

  if (action === 'push') {
    result = await push({ client, groupId });
  } else if (action === 'pull') {
    result = await pull({ client, groupId });
  } else if (action === 'full') {
    result = await sync({ client, groupId });
  } else {
    throw new Error('sync_action_unknown');
  }

  const after = await loadStatus();

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

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const status = await loadSyncCenterStatus();
      applyStatus(status);
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
