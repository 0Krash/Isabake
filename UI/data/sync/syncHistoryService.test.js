jest.mock('../db/localIds', () => ({
  createLocalId: jest.fn((prefix) => `${prefix}_test_id`),
}));

jest.mock('./syncHistoryRepository', () => ({
  clearOldSyncHistory: jest.fn(),
  getLatestSyncHistory: jest.fn(),
  getRecentSyncHistory: jest.fn(),
  getSyncHistoryCount: jest.fn(),
  insertSyncHistoryRecord: jest.fn(async (record) => record),
  recoverStartedSyncHistoryOlderThan: jest.fn(async () => ({
    recoveredCount: 0,
  })),
  updateSyncHistoryRecord: jest.fn(),
}));

import {
  clearOldSyncHistory,
  insertSyncHistoryRecord,
  recoverStartedSyncHistoryOlderThan,
  updateSyncHistoryRecord,
} from './syncHistoryRepository';
import {
  finishSyncHistoryRun,
  getSyncHistoryAuthState,
  getSyncHistoryWorkspaceName,
  recordSkippedSyncRun,
  recoverStaleSyncHistoryRuns,
  sanitizeSyncHistoryError,
  startSyncHistoryRun,
  summarizeSyncHistoryResult,
} from './syncHistoryService';

describe('syncHistoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sanitizes auth, network, backend and unknown failures', () => {
    expect(sanitizeSyncHistoryError('auth_required')).toEqual({
      errorCode: 'auth_required',
      safeErrorMessage: 'auth_required',
    });
    expect(sanitizeSyncHistoryError('Network request failed')).toEqual({
      errorCode: 'network_error',
      safeErrorMessage: 'network_error',
    });
    expect(sanitizeSyncHistoryError('Sync API URL is not configured')).toEqual({
      errorCode: 'backend_unreachable',
      safeErrorMessage: 'backend_unreachable',
    });
    expect(sanitizeSyncHistoryError('sync_timeout')).toEqual({
      errorCode: 'sync_timeout',
      safeErrorMessage: 'sync_timeout',
    });
    expect(sanitizeSyncHistoryError('AbortError')).toEqual({
      errorCode: 'request_aborted',
      safeErrorMessage: 'request_aborted',
    });
    expect(sanitizeSyncHistoryError('unexpected stack trace details')).toEqual({
      errorCode: 'unknown_sync_error',
      safeErrorMessage: 'unknown_sync_error',
    });
  });

  test('does not store token, hash, authorization, payload, or password details', () => {
    [
      'Bearer eyJ.secret.token',
      'accessToken=secret',
      'refreshTokenHash=secret',
      'inviteTokenHash=secret',
      'Authorization header leaked',
      'passwordHash leaked',
      'request body includes secret',
      'response body includes secret',
    ].forEach((message) => {
      expect(sanitizeSyncHistoryError(message)).toEqual({
        errorCode: 'unknown_sync_error',
        safeErrorMessage: 'unknown_sync_error',
      });
    });
  });

  test('summarizes push, pull, and full sync counts safely', () => {
    expect(
      summarizeSyncHistoryResult('push', {
        accepted: [{ id: 1 }],
        rejected: [{ reason: 'conflict' }, { reason: 'invalid' }],
        skipped: [{ id: 2 }],
      }),
    ).toEqual({
      acceptedCount: 1,
      conflictCount: 1,
      pushedCount: 1,
      rejectedCount: 2,
      skippedCount: 1,
    });
    expect(
      summarizeSyncHistoryResult('pull', {
        applied: [{ id: 1 }, { id: 2 }],
        conflicts: [{ id: 3 }],
      }),
    ).toEqual({
      conflictCount: 1,
      pulledCount: 2,
      skippedCount: 0,
    });
    expect(
      summarizeSyncHistoryResult('full_sync', {
        pull: { applied: [{ id: 1 }], conflicts: [{ id: 2 }] },
        push: { accepted: [{ id: 3 }], rejected: [{ reason: 'conflict' }] },
      }),
    ).toEqual({
      acceptedCount: 1,
      conflictCount: 2,
      pulledCount: 1,
      pushedCount: 1,
      rejectedCount: 1,
      skippedCount: 0,
    });
  });

  test('starts and finishes a manual sync history run with retention', async () => {
    const run = await startSyncHistoryRun({
      actionType: 'push',
      authState: 'authenticated',
      groupId: 'group_1',
      pendingBefore: 3,
      triggerSource: 'manual',
      workspaceName: 'Panaderia',
    });

    expect(insertSyncHistoryRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'push',
        authState: 'authenticated',
        groupId: 'group_1',
        pendingBefore: 3,
        status: 'started',
        triggerSource: 'manual',
        workspaceName: 'Panaderia',
      }),
    );

    await finishSyncHistoryRun({
      authState: 'authenticated',
      pendingAfter: 0,
      result: { accepted: [{ id: 1 }], ok: true, rejected: [], skipped: [] },
      run,
    });

    expect(updateSyncHistoryRecord).toHaveBeenCalledWith(
      run.runId,
      expect.objectContaining({
        acceptedCount: 1,
        pendingAfter: 0,
        pushedCount: 1,
        status: 'success',
      }),
    );
    expect(clearOldSyncHistory).toHaveBeenCalledWith({ keepLatest: 100 });
  });

  test('recovers stale started sync history runs safely', async () => {
    recoverStartedSyncHistoryOlderThan.mockResolvedValueOnce({
      recoveredCount: 2,
    });

    await expect(
      recoverStaleSyncHistoryRuns({
        now: Date.parse('2026-01-01T00:05:00.000Z'),
        olderThanMs: 120000,
      }),
    ).resolves.toEqual({ recoveredCount: 2 });

    expect(recoverStartedSyncHistoryOlderThan).toHaveBeenCalledWith({
      errorCode: 'sync_timeout',
      finishedAt: '2026-01-01T00:05:00.000Z',
      olderThanIso: '2026-01-01T00:03:00.000Z',
      safeErrorMessage: 'La sincronizacion tardo demasiado.',
    });
  });

  test('records skipped sync safely', async () => {
    await recordSkippedSyncRun({
      actionType: 'push',
      authState: 'auth_required',
      reason: 'auth_required',
      triggerSource: 'manual',
    });

    expect(insertSyncHistoryRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'push',
        errorCode: 'auth_required',
        safeErrorMessage: 'auth_required',
        skippedCount: 1,
        status: 'skipped',
      }),
    );
  });

  test('derives safe auth state and workspace names', () => {
    expect(getSyncHistoryAuthState({ session: null })).toBe('auth_required');
    expect(
      getSyncHistoryAuthState({ session: { sessionState: 'expired' } }),
    ).toBe('session_expired');
    expect(
      getSyncHistoryAuthState({ session: { sessionState: 'authenticated' } }),
    ).toBe('authenticated');
    expect(
      getSyncHistoryWorkspaceName({ isRemote: true, name: 'ws_phase_29' }),
    ).toBe('Proyecto compartido');
    expect(
      getSyncHistoryWorkspaceName({ isRemote: true, name: 'Panaderia Norte' }),
    ).toBe('Panaderia Norte');
  });
});
