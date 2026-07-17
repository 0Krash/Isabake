const sumCounts = (counts = {}) =>
  Object.values(counts || {}).reduce(
    (total, count) => total + Number(count || 0),
    0,
  );

export const getSyncCenterModeLabel = (workspace) =>
  workspace?.isRemote ? 'Compartido' : 'Solo local';

export const getAuthStatusLabel = (authStatus) => {
  if (authStatus === 'authenticated') {
    return 'Sesion activa';
  }

  if (authStatus === 'session_expired') {
    return 'Sesion expirada';
  }

  return 'Cuenta requerida';
};

export const getSyncWarningMessage = (warning = {}) => {
  const code = warning.code || warning;

  if (code === 'local_only_mode') {
    return 'Estas trabajando solo en este dispositivo.';
  }

  if (code === 'auth_required' || code === 'session_expired') {
    return 'Inicia sesion para usar respaldo compartido.';
  }

  if (code === 'conflict_detected') {
    return 'Hay cambios por revisar antes de continuar.';
  }

  if (code === 'failed_outbox_events_present') {
    return 'Algunos cambios no se pudieron enviar.';
  }

  return 'Hay una situacion que requiere atencion.';
};

export const getUserSafeSyncStatus = ({
  conflictCount = 0,
  failedCount = 0,
  pendingCount = 0,
} = {}) => ({
  conflictsLabel: `Cambios por revisar: ${conflictCount}`,
  failedLabel: `Cambios con error: ${failedCount}`,
  pendingLabel: `Cambios pendientes: ${pendingCount}`,
});

export const getUserSafeSyncError = (error) => {
  const message = String(error?.message || error || '');

  if (!message) {
    return null;
  }

  if (message.includes('auth_required')) {
    return 'auth_required';
  }

  if (message.includes('session_expired')) {
    return 'session_expired';
  }

  if (message.includes('sync_timeout')) {
    return 'La sincronizacion tardo demasiado. Intenta de nuevo.';
  }

  if (message.includes('request_aborted')) {
    return 'La sincronizacion se detuvo. Intenta de nuevo.';
  }

  if (message.includes('workspace_membership_required')) {
    return 'workspace_membership_required';
  }

  if (message.includes('workspace_role_cannot_sync')) {
    return 'workspace_role_cannot_sync';
  }

  if (
    message.includes('Network') ||
    message.includes('fetch') ||
    message.includes('backend_unreachable') ||
    message.includes('network_error') ||
    message.includes('Sync API URL') ||
    message.includes('sync_url_missing') ||
    message.includes('sync_url_invalid') ||
    message.includes('Auth API URL')
  ) {
    return 'network_or_backend_unavailable';
  }

  return message;
};

export const createSyncCenterSummary = ({
  currentWorkspace = null,
  lastSyncState = null,
  readiness = null,
  session = null,
} = {}) => {
  const isSharedWorkspace = Boolean(currentWorkspace?.isRemote);
  const pendingCount =
    readiness?.pendingOutboxCount ??
    sumCounts(readiness?.pendingOutboxByCollection);
  const failedCount =
    readiness?.failedOutboxCount ?? sumCounts(readiness?.failedOutboxByCollection);
  const conflictDocumentCount = readiness?.conflictDocumentCount || 0;
  const conflictOutboxCount = readiness?.conflictOutboxCount || 0;
  const conflictCount = conflictDocumentCount + conflictOutboxCount;
  const authStatus = session
    ? session.sessionState === 'expired'
      ? 'session_expired'
      : 'authenticated'
    : 'auth_required';
  const warnings = [];

  if (!isSharedWorkspace) {
    warnings.push({
      code: 'local_only_mode',
      message: 'El modo local no usa sync compartido.',
    });
  }

  if (isSharedWorkspace && authStatus !== 'authenticated') {
    warnings.push({
      code: authStatus,
      message: 'Inicia sesion para sincronizar este workspace compartido.',
    });
  }

  if (conflictCount > 0) {
    warnings.push({
      code: 'conflict_detected',
      message: 'Hay conflictos pendientes. No se resolveran automaticamente.',
    });
  }

  if (failedCount > 0) {
    warnings.push({
      code: 'failed_outbox_events_present',
      message: 'Hay eventos fallidos que requieren reintento o revision.',
    });
  }

  return {
    authStatus,
    conflictCount,
    conflictDocumentCount,
    conflictOutboxCount,
    failedCount,
    isSharedWorkspace,
    lastSyncCursor: lastSyncState?.lastSyncCursor || null,
    lastSyncedAt: lastSyncState?.lastSyncedAt || null,
    modeLabel: getSyncCenterModeLabel(currentWorkspace),
    pendingCount,
    warningCount: warnings.length,
    warnings,
  };
};

export default {
  createSyncCenterSummary,
  getAuthStatusLabel,
  getSyncCenterModeLabel,
  getSyncWarningMessage,
  getUserSafeSyncStatus,
  getUserSafeSyncError,
};
