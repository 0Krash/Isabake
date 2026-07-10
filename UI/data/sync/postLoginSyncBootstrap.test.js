const mockInitDatabase = jest.fn();
const mockGetFreshAuthSession = jest.fn();
const mockGetCurrentWorkspace = jest.fn();
const mockRunSyncReadinessCheck = jest.fn();
const mockNotifyAutoSyncNeeded = jest.fn();
const mockRecordSkippedSyncRun = jest.fn();
const mockRecipeCreate = jest.fn();
const mockGetAutoSyncDiagnostics = jest.fn();
const mockAssignUngrouped = jest.fn();

jest.mock('../db/database', () => ({
  initDatabase: (...args) => mockInitDatabase(...args),
}));

jest.mock('../auth/authService', () => ({
  getFreshAuthSession: (...args) => mockGetFreshAuthSession(...args),
}));

jest.mock('../workspace/workspaceRepository', () => ({
  getCurrentWorkspace: (...args) => mockGetCurrentWorkspace(...args),
}));

jest.mock('../workspace/currentWorkspace', () => ({
  assignUngroupedLocalDataToCurrentWorkspace: (...args) =>
    mockAssignUngrouped(...args),
}));

jest.mock('../validation/syncReadinessCheck', () => ({
  runSyncReadinessCheck: (...args) => mockRunSyncReadinessCheck(...args),
}));

jest.mock('./autoSyncService', () => ({
  getAutoSyncDiagnostics: (...args) => mockGetAutoSyncDiagnostics(...args),
  notifyAutoSyncNeeded: (...args) => mockNotifyAutoSyncNeeded(...args),
}));

jest.mock('./syncHistoryService', () => ({
  getSyncHistoryWorkspaceName: jest.fn((workspace = {}) =>
    workspace?.name || 'Workspace',
  ),
  recordSkippedSyncRun: (...args) => mockRecordSkippedSyncRun(...args),
  safelyRecordSyncHistory: jest.fn((operation) => operation()),
}));

jest.mock('../repositories/recipeRepository', () => ({
  __esModule: true,
  default: {
    create: (...args) => mockRecipeCreate(...args),
  },
}));

import {
  runPostLoginSyncBootstrap,
  runPostLoginSyncBootstrapCheck,
} from './postLoginSyncBootstrap';

describe('postLoginSyncBootstrap', () => {
  const session = {
    sessionState: 'authenticated',
    userId: 'user_1',
  };
  const sharedWorkspace = {
    groupId: 'group_1',
    isRemote: true,
    name: 'Panaderia',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockInitDatabase.mockResolvedValue({});
    mockGetFreshAuthSession.mockResolvedValue(session);
    mockGetCurrentWorkspace.mockResolvedValue(sharedWorkspace);
    mockRunSyncReadinessCheck.mockResolvedValue({
      conflictDocumentCount: 0,
      conflictOutboxCount: 0,
      documentsMissingGroupIdCount: 0,
      pendingOutboxByCollection: {
        inventory: 1,
        recipes: 1,
        transactions: 1,
      },
      pendingOutboxCount: 3,
    });
    mockNotifyAutoSyncNeeded.mockReturnValue({ scheduled: true });
    mockRecordSkippedSyncRun.mockResolvedValue(null);
    mockRecipeCreate.mockResolvedValue({
      groupId: 'group_1',
      id: 'dev_recipe_1',
    });
    mockGetAutoSyncDiagnostics.mockResolvedValue({
      autoSyncEnabled: true,
      hasConflicts: false,
      lastRunFinishedAt: '2026-01-01T00:00:02.000Z',
      lastRunStartedAt: '2026-01-01T00:00:01.000Z',
      lastSyncHistoryStatus: 'success',
      networkState: 'backend_reachable',
    });
    mockAssignUngrouped.mockResolvedValue({
      assignedCount: 1,
      dryRun: false,
      inspectedCount: 1,
    });
  });

  const runBootstrap = (options = {}) =>
    runPostLoginSyncBootstrap({
      getSession: mockGetFreshAuthSession,
      ...options,
    });

  const runBootstrapCheck = (options = {}) =>
    runPostLoginSyncBootstrapCheck({
      getSession: mockGetFreshAuthSession,
      ...options,
    });

  test('skips safely without auth and records safe history', async () => {
    mockGetFreshAuthSession.mockRejectedValueOnce(new Error('auth_required'));

    await expect(runBootstrap()).resolves.toEqual(
      expect.objectContaining({
        error: 'no_auth',
        failedStep: 'auth',
        ok: false,
        skipped: true,
      }),
    );

    expect(mockNotifyAutoSyncNeeded).not.toHaveBeenCalled();
    expect(mockRecordSkippedSyncRun).toHaveBeenCalledWith(
      expect.objectContaining({
        authState: 'auth_required',
        reason: 'no_auth',
        triggerSource: 'post_login',
      }),
    );
  });

  test('skips safely without shared workspace', async () => {
    mockGetCurrentWorkspace.mockResolvedValueOnce({
      groupId: 'local_1',
      isRemote: false,
      name: 'Local',
    });

    await expect(runBootstrap()).resolves.toEqual(
      expect.objectContaining({
        error: 'no_shared_workspace_after_login',
        failedStep: 'workspace',
        ok: false,
        skipped: true,
      }),
    );

    expect(mockNotifyAutoSyncNeeded).not.toHaveBeenCalled();
    expect(mockRecordSkippedSyncRun).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'no_shared_workspace_after_login',
      }),
    );
  });

  test('skips safely without groupId', async () => {
    mockGetCurrentWorkspace.mockResolvedValueOnce({
      isRemote: true,
      name: 'Shared',
    });

    await expect(runBootstrap()).resolves.toEqual(
      expect.objectContaining({
        error: 'groupId_required',
        failedStep: 'groupId',
        ok: false,
        skipped: true,
      }),
    );

    expect(mockNotifyAutoSyncNeeded).not.toHaveBeenCalled();
  });

  test('detects pending business outbox and schedules login_success full sync path', async () => {
    await expect(runBootstrap()).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        scheduled: true,
      }),
    );

    expect(mockNotifyAutoSyncNeeded).toHaveBeenCalledWith('login_success');
    expect(mockRecordSkippedSyncRun).not.toHaveBeenCalled();
  });

  test('assigns ungrouped local data before scheduling when a shared workspace is selected', async () => {
    mockRunSyncReadinessCheck
      .mockResolvedValueOnce({
        conflictDocumentCount: 0,
        conflictOutboxCount: 0,
        documentsMissingGroupIdCount: 1,
        pendingOutboxByCollection: {},
        pendingOutboxCount: 0,
      })
      .mockResolvedValueOnce({
        conflictDocumentCount: 0,
        conflictOutboxCount: 0,
        documentsMissingGroupIdCount: 0,
        pendingOutboxByCollection: {
          recipes: 1,
        },
        pendingOutboxCount: 1,
      });

    const result = await runBootstrap();

    expect(result.details.ungroupedAssignment).toEqual(
      expect.objectContaining({
        assignedCount: 1,
      }),
    );
    expect(mockAssignUngrouped).toHaveBeenCalledWith({ dryRun: false });
    expect(mockNotifyAutoSyncNeeded).toHaveBeenCalledWith('login_success');
  });

  test('does not run when conflicts exist and records skipped reason', async () => {
    mockRunSyncReadinessCheck.mockResolvedValueOnce({
      conflictDocumentCount: 1,
      conflictOutboxCount: 0,
      pendingOutboxCount: 1,
    });

    await expect(runBootstrap()).resolves.toEqual(
      expect.objectContaining({
        error: 'conflicts_pending',
        failedStep: 'conflicts',
        ok: false,
        skipped: true,
      }),
    );

    expect(mockNotifyAutoSyncNeeded).not.toHaveBeenCalled();
    expect(mockRecordSkippedSyncRun).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingBefore: 1,
        reason: 'conflicts_pending',
      }),
    );
  });

  test('records skipped reason when auto-sync cannot schedule', async () => {
    mockNotifyAutoSyncNeeded.mockReturnValueOnce({
      reason: 'auto_sync_disabled',
      scheduled: false,
    });

    await expect(runBootstrap()).resolves.toEqual(
      expect.objectContaining({
        error: 'auto_sync_disabled',
        failedStep: 'schedule',
        ok: false,
        skipped: true,
      }),
    );

    expect(mockRecordSkippedSyncRun).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'auto_sync_disabled',
      }),
    );
  });

  test('does not expose tokens or hashes in result', async () => {
    const result = await runBootstrap();

    expect(JSON.stringify(result)).not.toMatch(
      /accessToken|refreshToken|Authorization|Bearer|passwordHash|inviteTokenHash/i,
    );
  });

  test('diagnostic check creates a pending record and validates bootstrap result', async () => {
    await expect(
      runBootstrapCheck({
        createId: jest.fn(() => 'dev_recipe_1'),
        waitForBootstrap: jest.fn(async () => null),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        scheduled: true,
      }),
    );

    expect(mockRecipeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        recipeId: 'dev_recipe_1',
      }),
      {
        groupId: 'group_1',
        id: 'dev_recipe_1',
      },
    );
  });

  test('diagnostic check reports clear failure reasons', async () => {
    mockGetFreshAuthSession.mockRejectedValueOnce(new Error('auth_required'));

    await expect(runBootstrapCheck()).resolves.toEqual(
      expect.objectContaining({
        error: 'no_auth',
      }),
    );

    mockGetFreshAuthSession.mockResolvedValue(session);
    mockGetCurrentWorkspace.mockResolvedValueOnce({
      groupId: 'local_1',
      isRemote: false,
    });

    await expect(runBootstrapCheck()).resolves.toEqual(
      expect.objectContaining({
        error: 'no_shared_workspace',
      }),
    );
  });
});
