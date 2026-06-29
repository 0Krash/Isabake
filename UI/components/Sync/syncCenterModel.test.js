import {
  createSyncCenterSummary,
  getAuthStatusLabel,
  getSyncCenterModeLabel,
  getUserSafeSyncError,
} from './syncCenterModel';

describe('syncCenterModel', () => {
  test('renders local-only state summary', () => {
    const summary = createSyncCenterSummary({
      currentWorkspace: {
        groupId: 'local_1',
        isRemote: false,
        name: 'Local',
      },
      readiness: {
        conflictDocumentCount: 0,
        conflictOutboxCount: 0,
        failedOutboxCount: 0,
        pendingOutboxCount: 2,
      },
      session: null,
    });

    expect(summary).toEqual(
      expect.objectContaining({
        authStatus: 'auth_required',
        isSharedWorkspace: false,
        modeLabel: 'Solo local',
        pendingCount: 2,
      }),
    );
    expect(summary.warnings).toEqual([
      expect.objectContaining({ code: 'local_only_mode' }),
    ]);
  });

  test('renders shared authenticated workspace summary', () => {
    const summary = createSyncCenterSummary({
      currentWorkspace: {
        groupId: 'group_1',
        isRemote: true,
        name: 'Shared',
      },
      lastSyncState: {
        lastSyncCursor: 'cursor_1',
        lastSyncedAt: '2026-01-01T00:00:00.000Z',
      },
      readiness: {
        conflictDocumentCount: 1,
        conflictOutboxCount: 1,
        failedOutboxCount: 3,
        pendingOutboxCount: 5,
      },
      session: {
        sessionState: 'authenticated',
        userId: 'user_1',
      },
    });

    expect(summary).toEqual(
      expect.objectContaining({
        authStatus: 'authenticated',
        conflictCount: 2,
        failedCount: 3,
        isSharedWorkspace: true,
        lastSyncCursor: 'cursor_1',
        modeLabel: 'Compartido',
        pendingCount: 5,
      }),
    );
    expect(summary.warnings.map((warning) => warning.code)).toEqual([
      'conflict_detected',
      'failed_outbox_events_present',
    ]);
  });

  test('maps user-safe sync errors and auth labels without tokens', () => {
    expect(getAuthStatusLabel('authenticated')).toBe('Sesion activa');
    expect(getAuthStatusLabel('session_expired')).toBe('Sesion expirada');
    expect(getAuthStatusLabel('auth_required')).toBe('auth_required');
    expect(getUserSafeSyncError(new Error('auth_required'))).toBe(
      'auth_required',
    );
    expect(getUserSafeSyncError(new Error('Network request failed'))).toBe(
      'network_or_backend_unavailable',
    );
    expect(getSyncCenterModeLabel({ isRemote: true })).toBe('Compartido');
  });
});
