jest.mock('../../data/auth/authService', () => ({
  getCurrentSession: jest.fn(),
}));

jest.mock('../../data/workspace/workspaceRepository', () => ({
  getCurrentWorkspace: jest.fn(),
  getOrCreateDefaultLocalWorkspace: jest.fn(),
}));

jest.mock('../../data/validation/syncReadinessCheck', () => ({
  runSyncReadinessCheck: jest.fn(),
}));

jest.mock('../../data/sync/syncService', () => ({
  pullRemoteChanges: jest.fn(),
  pushPendingChanges: jest.fn(),
  runSync: jest.fn(),
}));

jest.mock('../../data/sync/syncStateRepository', () => ({
  getSyncState: jest.fn(),
}));

import {
  loadSyncCenterStatus,
  runManualSyncAction,
} from './useSyncCenter';

describe('useSyncCenter helpers', () => {
  const sharedWorkspace = {
    groupId: 'group_1',
    isRemote: true,
    name: 'Shared',
  };
  const localWorkspace = {
    groupId: 'local_1',
    isRemote: false,
    name: 'Local',
  };
  const session = {
    sessionState: 'authenticated',
    userId: 'user_1',
  };
  const readiness = {
    conflictDocumentCount: 1,
    conflictOutboxCount: 0,
    failedOutboxCount: 2,
    ok: false,
    pendingOutboxCount: 3,
  };

  test('status refresh reports pending failed and conflict counts', async () => {
    const result = await loadSyncCenterStatus({
      getSession: jest.fn(async () => session),
      getState: jest.fn(async () => ({
        groupId: 'group_1',
        lastSyncCursor: 'cursor_1',
        lastSyncedAt: '2026-01-01T00:00:00.000Z',
      })),
      getWorkspace: jest.fn(async () => sharedWorkspace),
      runReadiness: jest.fn(async () => readiness),
    });

    expect(result).toEqual(
      expect.objectContaining({
        authStatus: 'authenticated',
        conflictCount: 1,
        failedCount: 2,
        pendingCount: 3,
      }),
    );
    expect(result.lastSyncState.lastSyncCursor).toBe('cursor_1');
  });

  test('unauthenticated shared sync fails with auth_required', async () => {
    await expect(
      runManualSyncAction({
        action: 'push',
        loadStatus: jest.fn(async () => ({
          currentWorkspace: sharedWorkspace,
          session: null,
        })),
        push: jest.fn(),
      }),
    ).rejects.toThrow('auth_required');
  });

  test('local-only sync fails clearly and does not call push', async () => {
    const push = jest.fn();

    await expect(
      runManualSyncAction({
        action: 'push',
        loadStatus: jest.fn(async () => ({
          currentWorkspace: localWorkspace,
          session,
        })),
        push,
      }),
    ).rejects.toThrow('local_only_mode');
    expect(push).not.toHaveBeenCalled();
  });

  test('push calls sync service with active groupId only', async () => {
    const push = jest.fn(async () => ({ ok: true }));
    const loadStatus = jest
      .fn()
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        session,
      })
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        session,
      });

    await runManualSyncAction({
      action: 'push',
      loadStatus,
      push,
    });

    expect(push).toHaveBeenCalledWith({
      client: undefined,
      groupId: 'group_1',
    });
  });

  test('pull calls sync service with active groupId only', async () => {
    const pull = jest.fn(async () => ({ ok: true }));
    const loadStatus = jest
      .fn()
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        session,
      })
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        session,
      });

    await runManualSyncAction({
      action: 'pull',
      loadStatus,
      pull,
    });

    expect(pull).toHaveBeenCalledWith({
      client: undefined,
      groupId: 'group_1',
    });
  });

  test('full sync calls runSync with active groupId only', async () => {
    const sync = jest.fn(async () => ({ ok: true }));
    const loadStatus = jest
      .fn()
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        session,
      })
      .mockResolvedValueOnce({
        currentWorkspace: sharedWorkspace,
        session,
      });

    await runManualSyncAction({
      action: 'full',
      loadStatus,
      sync,
    });

    expect(sync).toHaveBeenCalledWith({
      client: undefined,
      groupId: 'group_1',
    });
  });

  test('does not run sync service while only loading status', async () => {
    const push = jest.fn();
    const pull = jest.fn();
    const sync = jest.fn();

    await loadSyncCenterStatus({
      getSession: jest.fn(async () => session),
      getState: jest.fn(async () => null),
      getWorkspace: jest.fn(async () => sharedWorkspace),
      runReadiness: jest.fn(async () => readiness),
    });

    expect(push).not.toHaveBeenCalled();
    expect(pull).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
  });
});
