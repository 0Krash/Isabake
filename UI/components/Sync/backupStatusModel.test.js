import {
  formatRelativeBackupTime,
  getBackupStatus,
  getBackupStatusForIndicator,
} from './backupStatusModel';

describe('backupStatusModel', () => {
  const now = Date.parse('2026-06-30T12:00:00.000Z');
  const sharedWorkspace = {
    groupId: 'group_secret',
    isRemote: true,
    name: 'Panaderia',
  };

  test('maps local-only mode to friendly local status', () => {
    expect(getBackupStatus({ currentWorkspace: { isRemote: false } })).toEqual(
      expect.objectContaining({
        description: 'Inicia sesión solo si quieres respaldar o compartir.',
        statusKey: 'local_only',
        title: 'Privado',
        tone: 'neutral',
      }),
    );
  });

  test('maps logged-out shared workspace to account-required status', () => {
    expect(
      getBackupStatus({
        authStatus: 'auth_required',
        currentWorkspace: sharedWorkspace,
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'Tus datos locales siguen disponibles.',
        statusKey: 'needs_login',
        title: 'Cuenta requerida para respaldo',
      }),
    );
  });

  test('maps successful latest history to backed-up status with relative time', () => {
    expect(
      getBackupStatus({
        authStatus: 'authenticated',
        currentWorkspace: sharedWorkspace,
        latestSyncHistory: {
          finishedAt: '2026-06-30T11:58:00.000Z',
          status: 'success',
        },
        now,
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'Último respaldo: hace 2 min',
        statusKey: 'backed_up',
        title: 'Todo respaldado',
        tone: 'success',
      }),
    );
  });

  test('ignores stale auto-sync pending state when there are no user-facing pending changes', () => {
    expect(
      getBackupStatus({
        autoSyncState: { autoSyncState: 'scheduled', autoSyncEnabled: true },
        authStatus: 'authenticated',
        currentWorkspace: sharedWorkspace,
        pendingCount: 0,
      }),
    ).toEqual(
      expect.objectContaining({
        statusKey: 'backed_up',
        title: 'Todo respaldado',
      }),
    );
  });

  test('maps pending, syncing, offline, failed, and conflict states', () => {
    expect(
      getBackupStatus({
        autoSyncState: { autoSyncState: 'scheduled', autoSyncEnabled: true },
        authStatus: 'authenticated',
        currentWorkspace: sharedWorkspace,
        pendingCount: 2,
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'Se respaldarán en unos segundos.',
        statusKey: 'pending',
        title: 'Cambios pendientes',
      }),
    );
    expect(
      getBackupStatus({
        authStatus: 'authenticated',
        currentWorkspace: sharedWorkspace,
        syncing: true,
      }).title,
    ).toBe('Sincronizando...');
    expect(
      getBackupStatus({
        authStatus: 'authenticated',
        currentWorkspace: sharedWorkspace,
        networkState: 'offline',
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'Tus cambios están guardados en este dispositivo.',
        statusKey: 'offline',
        title: 'Sin conexión',
      }),
    );
    expect(
      getBackupStatus({
        authStatus: 'authenticated',
        currentWorkspace: sharedWorkspace,
        failedCount: 1,
        latestSyncHistory: {
          safeErrorMessage: 'sync_timeout',
          status: 'failed',
        },
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'La sincronización tardó demasiado. Intenta de nuevo.',
        statusKey: 'failed',
        title: 'No se pudo respaldar',
      }),
    );
    expect(
      getBackupStatusForIndicator({
        authStatus: 'authenticated',
        conflictCount: 1,
        currentWorkspace: sharedWorkspace,
        onOpenConflicts: jest.fn(),
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'Revisa qué versión conservar.',
        primaryActionLabel: 'Revisar cambios',
        statusKey: 'conflicts',
        title: 'Cambios por revisar',
      }),
    );
  });

  test('explains pending changes when auto-sync cannot currently run', () => {
    expect(
      getBackupStatus({
        autoSyncState: { autoSyncEnabled: false },
        authStatus: 'authenticated',
        currentWorkspace: sharedWorkspace,
        pendingCount: 1,
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'La sincronización automática está desactivada.',
        title: 'Cambios pendientes',
      }),
    );
    expect(
      getBackupStatus({
        autoSyncState: { autoSyncState: 'skipped_no_auth' },
        authStatus: 'auth_required',
        currentWorkspace: sharedWorkspace,
        pendingCount: 1,
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'Tus cambios están guardados en este dispositivo.',
        statusKey: 'needs_login',
        title: 'Cuenta requerida para respaldo',
      }),
    );
    expect(
      getBackupStatus({
        autoSyncState: { autoSyncState: 'skipped_no_workspace' },
        currentWorkspace: null,
        pendingCount: 1,
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'Tus cambios están guardados localmente.',
        statusKey: 'needs_workspace',
        title: 'Selecciona un negocio compartido',
      }),
    );
    expect(
      getBackupStatus({
        autoSyncState: { autoSyncState: 'skipped_conflicts' },
        authStatus: 'authenticated',
        currentWorkspace: sharedWorkspace,
        pendingCount: 1,
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'Revisa los cambios antes de continuar.',
        statusKey: 'conflicts',
        title: 'Cambios por revisar',
      }),
    );
    expect(
      getBackupStatus({
        autoSyncState: { autoSyncState: 'backoff' },
        authStatus: 'authenticated',
        currentWorkspace: sharedWorkspace,
        pendingCount: 1,
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'Se intentará de nuevo más tarde.',
        statusKey: 'failed',
        title: 'No se pudo respaldar',
      }),
    );
  });

  test('maps network and backup configuration states to friendly messages', () => {
    expect(
      getBackupStatus({
        authStatus: 'authenticated',
        currentWorkspace: sharedWorkspace,
        networkStatus: { networkState: 'offline' },
        pendingCount: 1,
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'Se respaldarán cuando vuelva la conexión.',
        statusKey: 'offline',
        title: 'Sin conexión',
      }),
    );
    expect(
      getBackupStatus({
        authStatus: 'authenticated',
        currentWorkspace: sharedWorkspace,
        networkStatus: { networkState: 'backend_unreachable' },
        pendingCount: 1,
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'Tus cambios siguen guardados en este dispositivo.',
        statusKey: 'backend_unreachable',
        title: 'Sin conexión con el servidor',
      }),
    );
    expect(
      getBackupStatus({
        authStatus: 'authenticated',
        currentWorkspace: sharedWorkspace,
        networkStatus: { networkState: 'sync_url_missing' },
        pendingCount: 1,
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'Falta configurar el servidor de respaldo.',
        statusKey: 'backup_not_configured',
        title: 'Respaldo no configurado',
      }),
    );
  });

  test('ignores stale auto-sync config errors when current network state is not missing config', () => {
    expect(
      getBackupStatus({
        authStatus: 'authenticated',
        autoSyncState: { autoSyncState: 'sync_url_missing' },
        currentWorkspace: sharedWorkspace,
        networkStatus: { networkState: 'backend_reachable' },
        pendingCount: 248,
      }),
    ).toEqual(
      expect.objectContaining({
        statusKey: 'pending',
        title: 'Cambios pendientes',
      }),
    );
  });

  test('formats relative backup time', () => {
    expect(
      formatRelativeBackupTime('2026-06-30T11:59:30.000Z', { now }),
    ).toBe('hace unos segundos');
    expect(
      formatRelativeBackupTime('2026-06-30T11:58:00.000Z', { now }),
    ).toBe('hace 2 min');
    expect(
      formatRelativeBackupTime('2026-06-30T10:00:00.000Z', { now }),
    ).toBe('hace 2 h');
    expect(
      formatRelativeBackupTime('2026-06-29T12:00:00.000Z', { now }),
    ).toBe('ayer');
  });

  test('sanitizes technical and sensitive text from failed status', () => {
    const status = getBackupStatus({
      authStatus: 'authenticated',
      currentWorkspace: sharedWorkspace,
      failedCount: 1,
      latestSyncHistory: {
        safeErrorMessage:
          'Bearer abc.def.ghi cursor groupId serverVersion passwordHash',
        status: 'failed',
      },
    });
    const renderedText = `${status.title} ${status.description}`;

    expect(status.description).toBe('Revisa el respaldo e intenta de nuevo.');
    expect(renderedText).not.toMatch(
      /push|pull|cursor|groupId|serverVersion|token|hash|sync_outbox/i,
    );
  });

  test('maps timeout, backend unreachable, and retry states without technical details', () => {
    expect(
      getBackupStatus({
        authStatus: 'authenticated',
        currentWorkspace: sharedWorkspace,
        latestSyncHistory: {
          errorCode: 'sync_timeout',
          status: 'failed',
        },
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'La sincronización tardó demasiado. Intenta de nuevo.',
        title: 'No se pudo respaldar',
      }),
    );
    expect(
      getBackupStatus({
        authStatus: 'authenticated',
        autoSyncState: {
          autoSyncState: 'failed',
          lastErrorCode: 'backend_unreachable',
        },
        currentWorkspace: sharedWorkspace,
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'Tus cambios siguen guardados en este dispositivo.',
        title: 'No se pudo respaldar',
      }),
    );
    expect(
      getBackupStatus({
        authStatus: 'authenticated',
        currentWorkspace: sharedWorkspace,
        failedCount: 1,
        latestSyncHistory: {
          safeErrorMessage: 'AbortError: stack trace groupId cursor',
          status: 'failed',
        },
      }).description,
    ).toBe('Revisa el respaldo e intenta de nuevo.');
  });
});
