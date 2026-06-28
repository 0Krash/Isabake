import {
  createSyncDiagnosticsActions,
  DEV_SYNC_GROUP_ID,
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
      runBackendSyncConnectivityCheck: jest.fn(),
      runPushPullDevCheck: jest.fn(),
      runTwoWorkspaceIsolationDevCheck: jest.fn(),
    };

    const actions = createSyncDiagnosticsActions({ runners });

    expect(actions).toHaveLength(4);
    expect(runners.runBackendSyncConnectivityCheck).not.toHaveBeenCalled();
    expect(runners.runPushPullDevCheck).not.toHaveBeenCalled();
    expect(runners.runTwoWorkspaceIsolationDevCheck).not.toHaveBeenCalled();
  });

  test('actions call their runners with the dev sync group', async () => {
    const runners = {
      runBackendSyncConnectivityCheck: jest.fn(async () => ({ ok: true })),
      runPushPullDevCheck: jest.fn(async () => ({ ok: true })),
      runTwoWorkspaceIsolationDevCheck: jest.fn(async () => ({ ok: true })),
    };
    const actions = createSyncDiagnosticsActions({ runners });

    await actions.find((action) => action.key === 'connectivity').run();
    await actions.find((action) => action.key === 'pushPull').run();
    await actions.find((action) => action.key === 'isolation').run();

    expect(runners.runBackendSyncConnectivityCheck).toHaveBeenCalledWith({
      groupId: DEV_SYNC_GROUP_ID,
    });
    expect(runners.runPushPullDevCheck).toHaveBeenCalledWith({
      groupId: DEV_SYNC_GROUP_ID,
    });
    expect(runners.runTwoWorkspaceIsolationDevCheck).toHaveBeenCalledWith();
  });

  test('all action runs every sync diagnostic and combines status', async () => {
    const runners = {
      runBackendSyncConnectivityCheck: jest.fn(async () => ({ ok: true })),
      runPushPullDevCheck: jest.fn(async () => ({ ok: true })),
      runTwoWorkspaceIsolationDevCheck: jest.fn(async () => ({ ok: false })),
    };
    const actions = createSyncDiagnosticsActions({ runners });
    const result = await actions.find((action) => action.key === 'all').run();

    expect(result.ok).toBe(false);
    expect(result.connectivity.ok).toBe(true);
    expect(result.pushPull.ok).toBe(true);
    expect(result.isolation.ok).toBe(false);
  });
});
