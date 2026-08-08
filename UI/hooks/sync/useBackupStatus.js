import { useEffect, useState } from 'react';

import { getBackupStatusForIndicator } from '../../components/Sync/backupStatusModel';
import { getNetworkStatus } from '../../data/network/networkStatusService';
import { getAutoSyncState } from '../../data/sync/autoSyncService';
import { subscribeToAutoSyncState } from '../../data/sync/autoSyncStateRepository';
import { getLatestSyncHistory } from '../../data/sync/syncHistoryService';
import { loadSyncCenterStatus } from './useSyncCenter';

export default function useBackupStatus({
  autoLoad = true,
  loadStatus = loadSyncCenterStatus,
  refreshKey = 0,
} = {}) {
  const [backupStatus, setBackupStatus] = useState(() =>
    getBackupStatusForIndicator(),
  );
  const [loading, setLoading] = useState(Boolean(autoLoad));
  const [autoSyncRefreshKey, setAutoSyncRefreshKey] = useState(0);

  useEffect(() => {
    if (!autoLoad) {
      return undefined;
    }

    return subscribeToAutoSyncState(() => {
      setAutoSyncRefreshKey((currentKey) => currentKey + 1);
    });
  }, [autoLoad]);

  useEffect(() => {
    if (!autoLoad) {
      return undefined;
    }

    let isMounted = true;

    const loadBackupStatus = async () => {
      setLoading(true);

      try {
        const [syncStatus, autoSyncState, latestSyncHistory] =
          await Promise.all([
            loadStatus(),
            getAutoSyncState().catch(() => null),
            getLatestSyncHistory().catch(() => null),
          ]);

        if (!isMounted) {
          return;
        }

        setBackupStatus(
          getBackupStatusForIndicator({
            authStatus: syncStatus.authStatus,
            autoSyncState,
            conflictCount: syncStatus.conflictCount,
            currentWorkspace: syncStatus.currentWorkspace,
            failedCount: syncStatus.failedCount,
            latestSyncHistory,
            lastSyncState: syncStatus.lastSyncState,
            networkStatus: getNetworkStatus(),
            pendingCount: syncStatus.summary?.pendingCount ?? syncStatus.pendingCount,
          }),
        );
      } catch (error) {
        if (isMounted) {
          setBackupStatus(
            getBackupStatusForIndicator({
              failedCount: 1,
              latestSyncHistory: {
                safeErrorMessage: error?.message || 'unknown_sync_error',
                status: 'failed',
              },
            }),
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBackupStatus();

    return () => {
      isMounted = false;
    };
  }, [autoLoad, autoSyncRefreshKey, loadStatus, refreshKey]);

  return {
    backupStatus,
    loading,
  };
}
