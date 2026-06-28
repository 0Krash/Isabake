import { EXPO_PUBLIC_ENABLE_DEV_TOOLS } from '@env';

import {
  runBackendSyncConnectivityCheck,
  runPushPullDevCheck,
  runTwoWorkspaceIsolationDevCheck,
} from './runSyncIntegrationChecks';

export const DEV_SYNC_GROUP_ID = 'phase_13_sync_dev_group';

export const isSyncDiagnosticsEnabled = ({
  devFlag = typeof __DEV__ !== 'undefined' && __DEV__,
  enableDevTools = EXPO_PUBLIC_ENABLE_DEV_TOOLS,
} = {}) => devFlag === true && String(enableDevTools || '').toLowerCase() === 'true';

export const createSyncDiagnosticsActions = ({
  groupId = DEV_SYNC_GROUP_ID,
  runners = {
    runBackendSyncConnectivityCheck,
    runPushPullDevCheck,
    runTwoWorkspaceIsolationDevCheck,
  },
} = {}) => [
  {
    key: 'connectivity',
    label: 'Check backend connectivity',
    run: () => runners.runBackendSyncConnectivityCheck({ groupId }),
  },
  {
    key: 'pushPull',
    label: 'Run push/pull dev check',
    run: () => runners.runPushPullDevCheck({ groupId }),
  },
  {
    key: 'isolation',
    label: 'Run workspace isolation check',
    run: () => runners.runTwoWorkspaceIsolationDevCheck(),
  },
  {
    key: 'all',
    label: 'Run all sync dev checks',
    run: async () => {
      const [connectivity, pushPull, isolation] = await Promise.all([
        runners.runBackendSyncConnectivityCheck({ groupId }),
        runners.runPushPullDevCheck({ groupId }),
        runners.runTwoWorkspaceIsolationDevCheck(),
      ]);

      return {
        checkedAt: new Date().toISOString(),
        connectivity,
        isolation,
        ok: connectivity.ok && pushPull.ok && isolation.ok,
        pushPull,
      };
    },
  },
];
