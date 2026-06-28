import { EXPO_PUBLIC_ENABLE_DEV_TOOLS } from '@env';

import {
  runAuthWorkspaceDevCheck,
  runBackendSyncConnectivityCheck,
  runMembershipSyncAccessDevCheck,
  runPushPullDevCheck,
  runTwoWorkspaceIsolationDevCheck,
} from './runSyncIntegrationChecks';
import { createDevAuthSession } from '../auth/authSession';

export const DEV_SYNC_GROUP_ID = 'phase_13_sync_dev_group';
export const DEV_AUTH_GROUP_ID = 'phase_14_auth_dev_group';
export const DEV_AUTH_OWNER_ID = 'phase_14_auth_dev_owner';

export const isSyncDiagnosticsEnabled = ({
  devFlag = typeof __DEV__ !== 'undefined' && __DEV__,
  enableDevTools = EXPO_PUBLIC_ENABLE_DEV_TOOLS,
} = {}) => devFlag === true && String(enableDevTools || '').toLowerCase() === 'true';

export const createSyncDiagnosticsActions = ({
  groupId = DEV_AUTH_GROUP_ID,
  authSession = createDevAuthSession({ userId: DEV_AUTH_OWNER_ID }),
  runners = {
    runAuthWorkspaceDevCheck,
    runBackendSyncConnectivityCheck,
    runMembershipSyncAccessDevCheck,
    runPushPullDevCheck,
    runTwoWorkspaceIsolationDevCheck,
  },
} = {}) => [
  {
    key: 'authWorkspace',
    label: 'Run auth/workspace dev check',
    run: () => runners.runAuthWorkspaceDevCheck({ groupId }),
  },
  {
    key: 'membershipAccess',
    label: 'Run membership sync access check',
    run: () => runners.runMembershipSyncAccessDevCheck({ groupId }),
  },
  {
    key: 'connectivity',
    label: 'Check backend connectivity',
    run: () => runners.runBackendSyncConnectivityCheck({ authSession, groupId }),
  },
  {
    key: 'pushPull',
    label: 'Run push/pull dev check',
    run: () => runners.runPushPullDevCheck({ authSession, groupId }),
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
      const authWorkspace = await runners.runAuthWorkspaceDevCheck({ groupId });
      const [connectivity, membershipAccess, pushPull, isolation] =
        await Promise.all([
          runners.runBackendSyncConnectivityCheck({ authSession, groupId }),
          runners.runMembershipSyncAccessDevCheck({ groupId }),
          runners.runPushPullDevCheck({ authSession, groupId }),
          runners.runTwoWorkspaceIsolationDevCheck(),
      ]);

      return {
        authWorkspace,
        checkedAt: new Date().toISOString(),
        connectivity,
        isolation,
        membershipAccess,
        ok:
          authWorkspace.ok &&
          connectivity.ok &&
          membershipAccess.ok &&
          pushPull.ok &&
          isolation.ok,
        pushPull,
      };
    },
  },
];
