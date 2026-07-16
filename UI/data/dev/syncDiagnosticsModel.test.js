import { createSyncDiagnosticsActions, isSyncDiagnosticsEnabled } from './syncDiagnosticsModel';

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

  test('creates only reset and random sample data actions without running them', () => {
    const runners = {
      createDevSampleBusinessData: jest.fn(),
      runDevBackendDataReset: jest.fn(),
      runDevDataReset: jest.fn(),
    };

    const actions = createSyncDiagnosticsActions({ runners });

    expect(actions.map((action) => action.key)).toEqual([
      'deleteAllLocalData',
      'deleteBackendData',
      'createSampleBusinessData',
    ]);
    expect(runners.runDevDataReset).not.toHaveBeenCalled();
    expect(runners.runDevBackendDataReset).not.toHaveBeenCalled();
    expect(runners.createDevSampleBusinessData).not.toHaveBeenCalled();
  });

  test('delete all local data action is destructive and requires confirmation', async () => {
    const runners = {
      createDevSampleBusinessData: jest.fn(),
      runDevBackendDataReset: jest.fn(),
      runDevDataReset: jest.fn(async () => ({ success: true })),
    };
    const actions = createSyncDiagnosticsActions({ runners });
    const resetAction = actions.find(
      (action) => action.key === 'deleteAllLocalData',
    );

    expect(resetAction).toEqual(
      expect.objectContaining({
        destructive: true,
        label: 'Borrar datos locales de SQLite',
        requiresConfirmation: true,
      }),
    );

    await resetAction.run();

    expect(runners.runDevDataReset).toHaveBeenCalledWith({
      confirm: true,
      scope: 'full_local_dev_reset',
    });
  });

  test('backend data reset action is destructive and separate from local reset', async () => {
    const runners = {
      createDevSampleBusinessData: jest.fn(),
      runDevBackendDataReset: jest.fn(async () => ({ ok: true })),
      runDevDataReset: jest.fn(),
    };
    const actions = createSyncDiagnosticsActions({ runners });
    const backendResetAction = actions.find(
      (action) => action.key === 'deleteBackendData',
    );

    expect(backendResetAction).toEqual(
      expect.objectContaining({
        destructive: true,
        label: 'Borrar base de datos del backend',
        requiresConfirmation: true,
      }),
    );

    await backendResetAction.run();

    expect(runners.runDevBackendDataReset).toHaveBeenCalledWith();
    expect(runners.runDevDataReset).not.toHaveBeenCalled();
  });

  test('sample data action delegates random data creation', async () => {
    const runners = {
      createDevSampleBusinessData: jest.fn(async () => ({ ok: true })),
      runDevBackendDataReset: jest.fn(),
      runDevDataReset: jest.fn(),
    };
    const actions = createSyncDiagnosticsActions({ runners });

    await actions.find((action) => action.key === 'createSampleBusinessData').run();

    expect(runners.createDevSampleBusinessData).toHaveBeenCalledWith();
  });
});
