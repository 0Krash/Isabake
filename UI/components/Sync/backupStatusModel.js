const SENSITIVE_PATTERNS = [
  /Bearer\s+/i,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /(access|refresh|invite)?token(hash)?/i,
  /authorization|password(hash)?|api[_-]?key|cookie/i,
  /groupId|cursor|serverVersion|sync_outbox|localId|remoteId/i,
];

const sanitizeText = (
  value,
  fallback = 'Revisa el respaldo e intenta de nuevo.',
) => {
  const text = String(value || '').trim();

  if (!text || SENSITIVE_PATTERNS.some((pattern) => pattern.test(text))) {
    return fallback;
  }

  return text.slice(0, 120);
};

const getFriendlyFailureDescription = (value) => {
  const text = String(value || '').trim();

  if (text === 'sync_timeout') {
    return 'La sincronización tardó demasiado. Intenta de nuevo.';
  }

  if (text === 'backend_unreachable' || text === 'network_error') {
    return 'Tus cambios siguen guardados en este dispositivo.';
  }

  if (text === 'request_aborted') {
    return 'La sincronización se detuvo. Intenta de nuevo.';
  }

  return sanitizeText(text);
};

const toDate = (value) => {
  const date = value ? new Date(value) : null;

  return date && !Number.isNaN(date.getTime()) ? date : null;
};

export const formatRelativeBackupTime = (
  value,
  { now = Date.now(), locale = 'es-MX' } = {},
) => {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  const diffMs = Math.max(0, Number(now) - date.getTime());
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < minuteMs) {
    return 'hace unos segundos';
  }

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.round(diffMs / minuteMs));
    return `hace ${minutes} min`;
  }

  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.round(diffMs / hourMs));
    return `hace ${hours} h`;
  }

  if (diffMs < 2 * dayMs) {
    return 'ayer';
  }

  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
  });
};

const getLastBackupTime = ({ latestSyncHistory, lastSyncState } = {}) =>
  latestSyncHistory?.finishedAt ||
  latestSyncHistory?.startedAt ||
  lastSyncState?.lastSyncedAt ||
  null;

const withAction = (status, { onOpenConflicts } = {}) => {
  if (status.statusKey === 'conflicts' && onOpenConflicts) {
    return {
      ...status,
      primaryActionLabel: 'Revisar cambios',
    };
  }

  return status;
};

const getAutoSyncStateKey = (autoSyncState = {}) =>
  autoSyncState?.autoSyncState || autoSyncState?.state || null;

const isAutoSyncState = (autoSyncState, states) =>
  states.includes(getAutoSyncStateKey(autoSyncState));

export const getBackupStatus = ({
  authStatus = 'auth_required',
  autoSyncState = null,
  conflictCount = 0,
  currentWorkspace = null,
  failedCount = 0,
  latestSyncHistory = null,
  lastSyncState = null,
  networkState = 'unknown',
  networkStatus = null,
  now,
  pendingCount = 0,
  syncing = false,
} = {}) => {
  const lastBackupTime = getLastBackupTime({
    latestSyncHistory,
    lastSyncState,
  });
  const lastBackupLabel = formatRelativeBackupTime(lastBackupTime, { now });
  const lastBackupDescription = lastBackupLabel
    ? `Último respaldo: ${lastBackupLabel}`
    : 'Aún no hay respaldo compartido.';
  const workspaceIsShared = Boolean(currentWorkspace?.isRemote);
  const autoSyncStateKey = getAutoSyncStateKey(autoSyncState);
  const effectiveNetworkState =
    networkStatus?.networkState || networkState || 'unknown';

  if (!workspaceIsShared) {
    if (
      pendingCount > 0 &&
      (autoSyncStateKey === 'skipped_no_workspace' || !currentWorkspace)
    ) {
      return {
        description: 'Tus cambios están guardados localmente.',
        primaryActionLabel: null,
        secondaryActionLabel: null,
        showInMainScreens: true,
        statusKey: 'needs_workspace',
        title: 'Selecciona un negocio compartido',
        tone: 'warning',
      };
    }

    return {
      description: 'Inicia sesión solo si quieres respaldar o compartir.',
      primaryActionLabel: null,
      secondaryActionLabel: null,
      showInMainScreens: true,
      statusKey: 'local_only',
      title: 'Privado',
      tone: 'neutral',
    };
  }

  if (
    syncing ||
    autoSyncState?.syncInFlight ||
    autoSyncStateKey === 'syncing'
  ) {
    return {
      description: 'Estamos respaldando tus cambios.',
      primaryActionLabel: null,
      secondaryActionLabel: null,
      showInMainScreens: true,
      statusKey: 'syncing',
      title: 'Sincronizando...',
      tone: 'info',
    };
  }

  if (conflictCount > 0) {
    return {
      description: 'Revisa qué versión conservar.',
      primaryActionLabel: 'Revisar cambios',
      secondaryActionLabel: null,
      showInMainScreens: true,
      statusKey: 'conflicts',
      title: 'Cambios por revisar',
      tone: 'warning',
    };
  }

  if (pendingCount > 0 && autoSyncStateKey === 'skipped_no_auth') {
    return {
      description: 'Tus cambios están guardados en este dispositivo.',
      primaryActionLabel: null,
      secondaryActionLabel: null,
      showInMainScreens: true,
      statusKey: 'needs_login',
      title: 'Cuenta requerida para respaldo',
      tone: 'warning',
    };
  }

  if (authStatus !== 'authenticated') {
    return {
      description: 'Tus datos locales siguen disponibles.',
      primaryActionLabel: null,
      secondaryActionLabel: null,
      showInMainScreens: true,
      statusKey: 'needs_login',
      title: 'Cuenta requerida para respaldo',
      tone: 'warning',
    };
  }

  if (
    effectiveNetworkState === 'offline' ||
    autoSyncStateKey === 'skipped_offline'
  ) {
    return {
      description:
        pendingCount > 0
          ? 'Se respaldarán cuando vuelva la conexión.'
          : 'Tus cambios están guardados en este dispositivo.',
      primaryActionLabel: null,
      secondaryActionLabel: null,
      showInMainScreens: true,
      statusKey: 'offline',
      title: 'Sin conexión',
      tone: 'warning',
    };
  }

  if (
    effectiveNetworkState === 'backend_unreachable' ||
    autoSyncStateKey === 'backend_unreachable'
  ) {
    return {
      description: 'Tus cambios siguen guardados en este dispositivo.',
      primaryActionLabel: null,
      secondaryActionLabel: null,
      showInMainScreens: true,
      statusKey: 'backend_unreachable',
      title: 'Sin conexión con el servidor',
      tone: 'warning',
    };
  }

  if (
    effectiveNetworkState === 'sync_url_missing' ||
    effectiveNetworkState === 'sync_url_invalid'
  ) {
    return {
      description: 'Falta configurar el servidor de respaldo.',
      primaryActionLabel: null,
      secondaryActionLabel: null,
      showInMainScreens: true,
      statusKey: 'backup_not_configured',
      title: 'Respaldo no configurado',
      tone: 'warning',
    };
  }

  if (isAutoSyncState(autoSyncState, ['backoff'])) {
    return {
      description: 'Se intentará de nuevo más tarde.',
      primaryActionLabel: null,
      secondaryActionLabel: null,
      showInMainScreens: true,
      statusKey: 'failed',
      title: 'No se pudo respaldar',
      tone: 'error',
    };
  }

  if (
    failedCount > 0 ||
    latestSyncHistory?.status === 'failed' ||
    isAutoSyncState(autoSyncState, ['failed'])
  ) {
    return {
      description: getFriendlyFailureDescription(
        autoSyncState?.lastErrorCode ||
          autoSyncState?.lastErrorMessage ||
          latestSyncHistory?.errorCode ||
          latestSyncHistory?.safeErrorMessage,
      ),
      primaryActionLabel: null,
      secondaryActionLabel: null,
      showInMainScreens: true,
      statusKey: 'failed',
      title: 'No se pudo respaldar',
      tone: 'error',
    };
  }

  if (pendingCount > 0) {
    if (autoSyncStateKey === 'scheduled') {
      return {
        description: 'Se respaldarán en unos segundos.',
        primaryActionLabel: null,
        secondaryActionLabel: null,
        showInMainScreens: true,
        statusKey: 'pending',
        title: 'Cambios pendientes',
        tone: 'info',
      };
    }

    if (
      autoSyncState?.autoSyncEnabled === false ||
      autoSyncStateKey === 'skipped_disabled'
    ) {
      return {
        description: 'La sincronización automática está desactivada.',
        primaryActionLabel: null,
        secondaryActionLabel: null,
        showInMainScreens: true,
        statusKey: 'pending',
        title: 'Cambios pendientes',
        tone: 'info',
      };
    }

    if (
      autoSyncStateKey === 'skipped_no_workspace' ||
      autoSyncStateKey === 'skipped_local_only'
    ) {
      return {
        description: 'Tus cambios están guardados localmente.',
        primaryActionLabel: null,
        secondaryActionLabel: null,
        showInMainScreens: true,
        statusKey: 'needs_workspace',
        title: 'Selecciona un negocio compartido',
        tone: 'warning',
      };
    }

    if (autoSyncStateKey === 'skipped_conflicts') {
      return {
        description: 'Revisa los cambios antes de continuar.',
        primaryActionLabel: 'Revisar cambios',
        secondaryActionLabel: null,
        showInMainScreens: true,
        statusKey: 'conflicts',
        title: 'Cambios por revisar',
        tone: 'warning',
      };
    }

    if (autoSyncStateKey === 'skipped_app_inactive') {
      return {
        description: 'Se respaldarán cuando vuelvas a abrir la app.',
        primaryActionLabel: null,
        secondaryActionLabel: null,
        showInMainScreens: true,
        statusKey: 'pending',
        title: 'Cambios pendientes',
        tone: 'info',
      };
    }

    if (autoSyncStateKey === 'cooldown') {
      return {
        description: 'Se respaldarán después de la pausa automática.',
        primaryActionLabel: null,
        secondaryActionLabel: null,
        showInMainScreens: true,
        statusKey: 'pending',
        title: 'Cambios pendientes',
        tone: 'info',
      };
    }

    if (autoSyncStateKey === 'failed') {
      return {
        description: 'Puedes intentar sincronizar ahora.',
        primaryActionLabel: null,
        secondaryActionLabel: null,
        showInMainScreens: true,
        statusKey: 'pending',
        title: 'Cambios pendientes',
        tone: 'info',
      };
    }

    return {
      description:
        autoSyncState?.autoSyncEnabled === false
          ? 'Puedes sincronizar cuando quieras.'
          : 'Se respaldarán automáticamente.',
      primaryActionLabel: null,
      secondaryActionLabel: null,
      showInMainScreens: true,
      statusKey: 'pending',
      title: 'Cambios pendientes',
      tone: 'info',
    };
  }

  return {
    description: lastBackupDescription,
    primaryActionLabel: null,
    secondaryActionLabel: null,
    showInMainScreens: true,
    statusKey: 'backed_up',
    title: 'Todo respaldado',
    tone: 'success',
  };
};

export const getBackupStatusForIndicator = (input = {}) =>
  withAction(getBackupStatus(input), input);

export default {
  formatRelativeBackupTime,
  getBackupStatus,
  getBackupStatusForIndicator,
};
