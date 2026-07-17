import { useEffect, useState } from 'react';

import { getBackupStatusForIndicator } from '../../components/Sync/backupStatusModel';
import { getNetworkStatus } from '../../data/network/networkStatusService';
import { getAutoSyncState } from '../../data/sync/autoSyncService';
import { getLatestSyncHistory } from '../../data/sync/syncHistoryService';
import { loadSyncCenterStatus } from './useSyncCenter';

export default function useBackupStatus({
  autoLoad = true,
  loadStatus = loadSyncCenterStatus,
} = {}) {
  const [backupStatus, setBackupStatus] = useState(() =>
    getBackupStatusForIndicator(),
  );
  const [loading, setLoading] = useState(Boolean(autoLoad));

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
            pendingCount: syncStatus.pendingCount,
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
  }, [autoLoad, loadStatus]);

  return {
    backupStatus,
    loading,
  };
}
