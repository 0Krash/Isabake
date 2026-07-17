import {
  createSyncDiagnosticsActions,
  DEV_AUTH_GROUP_ID,
  isSyncDiagnosticsEnabled,
} from './syncDiagnosticsModel';

describe('syncDiagnosticsModel', () => {
  test('is disabled outside dev or when the dev tools flag is false', () => {
    expect(
      isSyncDiagnosticsEnabled({
        devFlag: false,
        enableDevTools: 'true',
      }),
    ).toBe(false);
    expect(
      isSyncDiagnosticsEnabled({
        devFlag: true,
        enableDevTools: 'false',
      }),
    ).toBe(false);
  });

  test('is enabled only in dev with explicit flag', () => {
    expect(
      isSyncDiagnosticsEnabled({
        devFlag: true,
        enableDevTools: 'true',
      }),
    ).toBe(true);
  });

  test('creating actions does not run diagnostics automatically', () => {
    const runners = {
      runAuthWorkspaceDevCheck: jest.fn(),
      runAuthenticatedPushPullDevCheck: jest.fn(),
      runAuthenticatedWorkspaceIsolationDevCheck: jest.fn(),
      runBackendSyncConnectivityCheck: jest.fn(),
      runConflictPreferLocalDevCheck: jest.fn(),
      runConflictResolutionDevCheck: jest.fn(),
      runConflictSimulationDevCheck: jest.fn(),
      runConflictSummaryDevCheck: jest.fn(),
      runListConflictsDevCheck: jest.fn(),
      runMembershipSyncAccessDevCheck: jest.fn(),
      runPullOverPendingConflictDevCheck: jest.fn(),
      runPushPullDevCheck: jest.fn(),
      runRealAuthSessionDevCheck: jest.fn(),
      runResolveLatestConflictPreferLocalDevCheck: jest.fn(),
      runResolveLatestConflictPreferRemoteDevCheck: jest.fn(),
      runServerSessionRevocationDevCheck: jest.fn(),
      runTwoWorkspaceIsolationDevCheck: jest.fn(),
      runDevDataReset: jest.fn(),
    };

    const actions = createSyncDiagnosticsActions({ runners });

    expect(actions).toHaveLength(19);
    expect(runners.runAuthWorkspaceDevCheck).not.toHaveBeenCalled();
    expect(runners.runAuthenticatedPushPullDevCheck).not.toHaveBeenCalled();
    expect(runners.runAuthenticatedWorkspaceIsolationDevCheck).not.toHaveBeenCalled();
    expect(runners.runBackendSyncConnectivityCheck).not.toHaveBeenCalled();
    expect(runners.runConflictPreferLocalDevCheck).not.toHaveBeenCalled();
    expect(runners.runConflictResolutionDevCheck).not.toHaveBeenCalled();
    expect(runners.runConflictSimulationDevCheck).not.toHaveBeenCalled();
    expect(runners.runConflictSummaryDevCheck).not.toHaveBeenCalled();
    expect(runners.runListConflictsDevCheck).not.toHaveBeenCalled();
    expect(runners.runMembershipSyncAccessDevCheck).not.toHaveBeenCalled();
    expect(runners.runPullOverPendingConflictDevCheck).not.toHaveBeenCalled();
    expect(runners.runResolveLatestConflictPreferLocalDevCheck).not.toHaveBeenCalled();
    expect(runners.runResolveLatestConflictPreferRemoteDevCheck).not.toHaveBeenCalled();
    expect(runners.runPushPullDevCheck).not.toHaveBeenCalled();
    expect(runners.runRealAuthSessionDevCheck).not.toHaveBeenCalled();
    expect(runners.runServerSessionRevocationDevCheck).not.toHaveBeenCalled();
    expect(runners.runTwoWorkspaceIsolationDevCheck).not.toHaveBeenCalled();
    expect(runners.runDevDataReset).not.toHaveBeenCalled();
  });

  test('actions call their runners with the dev sync group', async () => {
    const runners = {
      runAuthWorkspaceDevCheck: jest.fn(async () => ({ ok: true })),
      runAuthenticatedPushPullDevCheck: jest.fn(async () => ({ ok: true })),
      runAuthenticatedWorkspaceIsolationDevCheck: jest.fn(async () => ({ ok: true })),
      runBackendSyncConnectivityCheck: jest.fn(async () => ({ ok: true })),
      runConflictPreferLocalDevCheck: jest.fn(async () => ({ ok: true })),
      runConflictResolutionDevCheck: jest.fn(async () => ({ ok: true })),
      runConflictSimulationDevCheck: jest.fn(async () => ({ ok: true })),
      runConflictSummaryDevCheck: jest.fn(async () => ({ ok: true })),
      runListConflictsDevCheck: jest.fn(async () => ({ ok: true })),
      runMembershipSyncAccessDevCheck: jest.fn(async () => ({ ok: true })),
      runPullOverPendingConflictDevCheck: jest.fn(async () => ({ ok: true })),
      runPushPullDevCheck: jest.fn(async () => ({ ok: true })),
      runRealAuthSessionDevCheck: jest.fn(async () => ({ ok: true })),
      runResolveLatestConflictPreferLocalDevCheck: jest.fn(async () => ({ ok: true })),
      runResolveLatestConflictPreferRemoteDevCheck: jest.fn(async () => ({ ok: true })),
      runServerSessionRevocationDevCheck: jest.fn(async () => ({ ok: true })),
      runTwoWorkspaceIsolationDevCheck: jest.fn(async () => ({ ok: true })),
      runDevDataReset: jest.fn(async () => ({ success: true })),
    };
    const actions = createSyncDiagnosticsActions({ runners });

    await actions.find((action) => action.key === 'deleteAllLocalData').run();
    await actions.find((action) => action.key === 'authWorkspace').run();
    await actions.find((action) => action.key === 'membershipAccess').run();
    await actions.find((action) => action.key === 'connectivity').run();
    await actions.find((action) => action.key === 'authenticatedPushPull').run();
    await actions.find((action) => action.key === 'authenticatedIsolation').run();
    await actions.find((action) => action.key === 'conflictSimulation').run();
    await actions.find((action) => action.key === 'pullOverPendingConflict').run();
    await actions.find((action) => action.key === 'listConflicts').run();
    await actions.find((action) => action.key === 'conflictSummary').run();
    await actions.find((action) => action.key === 'resolveLatestPreferLocal').run();
    await actions.find((action) => action.key === 'resolveLatestPreferRemote').run();
    await actions.find((action) => action.key === 'conflictResolutionEndToEnd').run();
    await actions.find((action) => action.key === 'conflictPreferLocal').run();
    await actions.find((action) => action.key === 'realAuthSession').run();
    await actions.find((action) => action.key === 'serverSessionRevocation').run();
    await actions.find((action) => action.key === 'legacyPushPull').run();
    await actions.find((action) => action.key === 'legacyIsolation').run();

    expect(runners.runAuthWorkspaceDevCheck).toHaveBeenCalledWith({
      groupId: DEV_AUTH_GROUP_ID,
    });
    expect(runners.runMembershipSyncAccessDevCheck).toHaveBeenCalledWith({
      groupId: DEV_AUTH_GROUP_ID,
    });
    expect(runners.runBackendSyncConnectivityCheck).toHaveBeenCalledWith({
      authSession: expect.objectContaining({
        userId: 'phase_14_auth_dev_owner',
      }),
      groupId: DEV_AUTH_GROUP_ID,
    });
    expect(runners.runAuthenticatedPushPullDevCheck).toHaveBeenCalledWith({
      authSession: expect.objectContaining({
        userId: 'phase_14_auth_dev_owner',
      }),
      groupId: DEV_AUTH_GROUP_ID,
    });
    expect(runners.runAuthenticatedWorkspaceIsolationDevCheck).toHaveBeenCalledWith();
    expect(runners.runConflictSimulationDevCheck).toHaveBeenCalledWith({
      groupId: DEV_AUTH_GROUP_ID,
    });
    expect(runners.runPullOverPendingConflictDevCheck).toHaveBeenCalledWith({
      groupId: DEV_AUTH_GROUP_ID,
    });
    expect(runners.runListConflictsDevCheck).toHaveBeenCalledWith();
    expect(runners.runConflictSummaryDevCheck).toHaveBeenCalledWith();
    expect(runners.runResolveLatestConflictPreferLocalDevCheck).toHaveBeenCalledWith();
    expect(runners.runResolveLatestConflictPreferRemoteDevCheck).toHaveBeenCalledWith();
    expect(runners.runConflictResolutionDevCheck).toHaveBeenCalledWith({
      groupId: DEV_AUTH_GROUP_ID,
    });
    expect(runners.runConflictPreferLocalDevCheck).toHaveBeenCalledWith({
      groupId: DEV_AUTH_GROUP_ID,
    });
    expect(runners.runRealAuthSessionDevCheck).toHaveBeenCalledWith();
    expect(runners.runServerSessionRevocationDevCheck).toHaveBeenCalledWith();
    expect(runners.runPushPullDevCheck).toHaveBeenCalledWith({
      groupId: DEV_AUTH_GROUP_ID,
      legacy: true,
    });
    expect(runners.runTwoWorkspaceIsolationDevCheck).toHaveBeenCalledWith({
      legacy: true,
    });
    expect(runners.runDevDataReset).toHaveBeenCalledWith({
      confirm: true,
      scope: 'full_local_dev_reset',
    });
  });

  test('all action uses authenticated diagnostics and skips legacy runners', async () => {
    const runners = {
      runAuthWorkspaceDevCheck: jest.fn(async () => ({ ok: true })),
      runAuthenticatedPushPullDevCheck: jest.fn(async () => ({ ok: true })),
      runAuthenticatedWorkspaceIsolationDevCheck: jest.fn(async () => ({
        ok: false,
      })),
      runBackendSyncConnectivityCheck: jest.fn(async () => ({ ok: true })),
      runConflictPreferLocalDevCheck: jest.fn(async () => ({ ok: true })),
      runConflictResolutionDevCheck: jest.fn(async () => ({ ok: true })),
      runConflictSimulationDevCheck: jest.fn(async () => ({ ok: true })),
      runConflictSummaryDevCheck: jest.fn(async () => ({ ok: true })),
      runListConflictsDevCheck: jest.fn(async () => ({ ok: true })),
      runMembershipSyncAccessDevCheck: jest.fn(async () => ({ ok: true })),
      runPullOverPendingConflictDevCheck: jest.fn(async () => ({ ok: true })),
      runPushPullDevCheck: jest.fn(async () => ({ ok: true })),
      runRealAuthSessionDevCheck: jest.fn(async () => ({ ok: true })),
      runResolveLatestConflictPreferLocalDevCheck: jest.fn(async () => ({ ok: true })),
      runResolveLatestConflictPreferRemoteDevCheck: jest.fn(async () => ({ ok: true })),
      runServerSessionRevocationDevCheck: jest.fn(async () => ({ ok: true })),
      runTwoWorkspaceIsolationDevCheck: jest.fn(async () => ({ ok: true })),
      runDevDataReset: jest.fn(async () => ({ success: true })),
    };
    const actions = createSyncDiagnosticsActions({ runners });
    const result = await actions.find((action) => action.key === 'all').run();

    expect(result.ok).toBe(false);
    expect(result.authWorkspace.ok).toBe(true);
    expect(result.connectivity.ok).toBe(true);
    expect(result.membershipAccess.ok).toBe(true);
    expect(result.authenticatedPushPull.ok).toBe(true);
    expect(result.authenticatedIsolation.ok).toBe(false);
    expect(result.conflictSimulation.ok).toBe(true);
    expect(result.pullOverPendingConflict.ok).toBe(true);
    expect(runners.runPushPullDevCheck).not.toHaveBeenCalled();
    expect(runners.runRealAuthSessionDevCheck).not.toHaveBeenCalled();
    expect(runners.runServerSessionRevocationDevCheck).not.toHaveBeenCalled();
    expect(runners.runTwoWorkspaceIsolationDevCheck).not.toHaveBeenCalled();
  });

  test('all action passes when authenticated conflict diagnostics pass', async () => {
    const runners = {
      runAuthWorkspaceDevCheck: jest.fn(async () => ({ ok: true })),
      runAuthenticatedPushPullDevCheck: jest.fn(async () => ({ ok: true })),
      runAuthenticatedWorkspaceIsolationDevCheck: jest.fn(async () => ({
        ok: true,
      })),
      runBackendSyncConnectivityCheck: jest.fn(async () => ({ ok: true })),
      runConflictPreferLocalDevCheck: jest.fn(async () => ({ ok: true })),
      runConflictResolutionDevCheck: jest.fn(async () => ({ ok: true })),
      runConflictSimulationDevCheck: jest.fn(async () => ({ ok: true })),
      runConflictSummaryDevCheck: jest.fn(async () => ({ ok: true })),
      runListConflictsDevCheck: jest.fn(async () => ({ ok: true })),
      runMembershipSyncAccessDevCheck: jest.fn(async () => ({ ok: true })),
      runPullOverPendingConflictDevCheck: jest.fn(async () => ({ ok: true })),
      runPushPullDevCheck: jest.fn(async () => ({ ok: false })),
      runRealAuthSessionDevCheck: jest.fn(async () => ({ ok: true })),
      runResolveLatestConflictPreferLocalDevCheck: jest.fn(async () => ({ ok: true })),
      runResolveLatestConflictPreferRemoteDevCheck: jest.fn(async () => ({ ok: true })),
      runServerSessionRevocationDevCheck: jest.fn(async () => ({ ok: true })),
      runTwoWorkspaceIsolationDevCheck: jest.fn(async () => ({ ok: false })),
      runDevDataReset: jest.fn(async () => ({ success: true })),
    };
    const actions = createSyncDiagnosticsActions({ runners });
    const result = await actions.find((action) => action.key === 'all').run();

    expect(result.ok).toBe(true);
    expect(result.pullOverPendingConflict.ok).toBe(true);
    expect(runners.runPushPullDevCheck).not.toHaveBeenCalled();
    expect(runners.runRealAuthSessionDevCheck).not.toHaveBeenCalled();
    expect(runners.runServerSessionRevocationDevCheck).not.toHaveBeenCalled();
    expect(runners.runTwoWorkspaceIsolationDevCheck).not.toHaveBeenCalled();
    expect(runners.runDevDataReset).not.toHaveBeenCalled();
  });

  test('delete all local data action is marked destructive and requires confirmation', async () => {
    const runners = {
      runAuthWorkspaceDevCheck: jest.fn(),
      runAuthenticatedPushPullDevCheck: jest.fn(),
      runAuthenticatedWorkspaceIsolationDevCheck: jest.fn(),
      runBackendSyncConnectivityCheck: jest.fn(),
      runConflictPreferLocalDevCheck: jest.fn(),
      runConflictResolutionDevCheck: jest.fn(),
      runConflictSimulationDevCheck: jest.fn(),
      runConflictSummaryDevCheck: jest.fn(),
      runListConflictsDevCheck: jest.fn(),
      runMembershipSyncAccessDevCheck: jest.fn(),
      runPullOverPendingConflictDevCheck: jest.fn(),
      runPushPullDevCheck: jest.fn(),
      runRealAuthSessionDevCheck: jest.fn(),
      runResolveLatestConflictPreferLocalDevCheck: jest.fn(),
      runResolveLatestConflictPreferRemoteDevCheck: jest.fn(),
      runServerSessionRevocationDevCheck: jest.fn(),
      runTwoWorkspaceIsolationDevCheck: jest.fn(),
      runDevDataReset: jest.fn(async () => ({ success: true })),
    };
    const actions = createSyncDiagnosticsActions({ runners });
    const resetAction = actions.find(
      (action) => action.key === 'deleteAllLocalData',
    );

    expect(resetAction).toEqual(
      expect.objectContaining({
        destructive: true,
        label: 'Delete all local SQLite data',
        requiresConfirmation: true,
      }),
    );

    await resetAction.run();

    expect(runners.runDevDataReset).toHaveBeenCalledWith({
      confirm: true,
      scope: 'full_local_dev_reset',
    });
  });
});
