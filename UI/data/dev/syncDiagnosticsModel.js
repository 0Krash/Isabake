import { EXPO_PUBLIC_ENABLE_DEV_TOOLS } from '@env';

import {
  runAuthWorkspaceDevCheck,
  runAuthenticatedPushPullDevCheck,
  runAuthenticatedWorkspaceIsolationDevCheck,
  runBackendSyncConnectivityCheck,
  runConflictSimulationDevCheck,
  runMembershipSyncAccessDevCheck,
  runPullOverPendingConflictDevCheck,
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
    runAuthenticatedPushPullDevCheck,
    runAuthenticatedWorkspaceIsolationDevCheck,
    runBackendSyncConnectivityCheck,
    runConflictSimulationDevCheck,
    runMembershipSyncAccessDevCheck,
    runPullOverPendingConflictDevCheck,
    runPushPullDevCheck,
    runTwoWorkspaceIsolationDevCheck,
  },
} = {}) => [
  {
    key: 'authWorkspace',
    label: 'Auth workspace check',
    run: () => runners.runAuthWorkspaceDevCheck({ groupId }),
  },
  {
    key: 'membershipAccess',
    label: 'Membership access check',
    run: () => runners.runMembershipSyncAccessDevCheck({ groupId }),
  },
  {
    key: 'connectivity',
    label: 'Check backend connectivity',
    run: () => runners.runBackendSyncConnectivityCheck({ authSession, groupId }),
  },
  {
    key: 'authenticatedPushPull',
    label: 'Authenticated push/pull check',
    run: () =>
      runners.runAuthenticatedPushPullDevCheck({ authSession, groupId }),
  },
  {
    key: 'authenticatedIsolation',
    label: 'Authenticated workspace isolation check',
    run: () => runners.runAuthenticatedWorkspaceIsolationDevCheck(),
  },
  {
    key: 'conflictSimulation',
    label: 'Conflict simulation check',
    run: () => runners.runConflictSimulationDevCheck({ groupId }),
  },
  {
    key: 'pullOverPendingConflict',
    label: 'Pull-over-pending conflict check',
    run: () => runners.runPullOverPendingConflictDevCheck({ groupId }),
  },
  {
    key: 'legacyPushPull',
    label: 'Legacy unauthenticated push/pull check',
    run: () =>
      runners.runPushPullDevCheck({
        groupId,
        legacy: true,
      }),
  },
  {
    key: 'legacyIsolation',
    label: 'Legacy unauthenticated workspace isolation check',
    run: () =>
      runners.runTwoWorkspaceIsolationDevCheck({
        legacy: true,
      }),
  },
  {
    key: 'all',
    label: 'Run all authenticated sync checks',
    run: async () => {
      const authWorkspace = await runners.runAuthWorkspaceDevCheck({ groupId });
      const [
        connectivity,
        membershipAccess,
        authenticatedPushPull,
        authenticatedIsolation,
        conflictSimulation,
        pullOverPendingConflict,
      ] =
        await Promise.all([
          runners.runBackendSyncConnectivityCheck({ authSession, groupId }),
          runners.runMembershipSyncAccessDevCheck({ groupId }),
          runners.runAuthenticatedPushPullDevCheck({ authSession, groupId }),
          runners.runAuthenticatedWorkspaceIsolationDevCheck(),
          runners.runConflictSimulationDevCheck({ groupId }),
          runners.runPullOverPendingConflictDevCheck({ groupId }),
      ]);

      return {
        authenticatedIsolation,
        authenticatedPushPull,
        authWorkspace,
        checkedAt: new Date().toISOString(),
        connectivity,
        conflictSimulation,
        membershipAccess,
        ok:
          authWorkspace.ok &&
          connectivity.ok &&
          membershipAccess.ok &&
          authenticatedPushPull.ok &&
          authenticatedIsolation.ok &&
          conflictSimulation.ok &&
          pullOverPendingConflict.ok,
        pullOverPendingConflict,
      };
    },
  },
];
