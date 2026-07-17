export const createAuthModeCopy = (mode) =>
  mode === 'register'
    ? {
        button: 'Crear cuenta',
        switchLabel: 'Ya tengo cuenta',
        title: 'Crear cuenta',
      }
    : {
        button: 'Iniciar sesion',
        switchLabel: 'Crear cuenta',
        title: 'Iniciar sesion',
      };

export const getAuthStatusState = ({ loading, refreshing, session } = {}) => {
  if (refreshing) {
    return 'refreshing';
  }

  if (!session) {
    return loading ? 'loading' : 'local-only';
  }

  if (session.sessionState === 'expired') {
    return 'expired';
  }

  return 'authenticated';
};

export const formatAuthError = (error) => {
  const message = String(error?.message || error || '');

  if (!message) {
    return null;
  }

  if (message.includes('session_expired') || message.includes('jwt_expired')) {
    return 'La sesion expiro. Inicia sesion de nuevo para continuar con workspaces compartidos.';
  }

  if (message.includes('session_revoked')) {
    return 'Esta sesion fue revocada. Inicia sesion de nuevo en este dispositivo.';
  }

  if (message.includes('invalid_credentials')) {
    return 'Correo o contrasena incorrectos.';
  }

  if (message.includes('auth_required')) {
    return 'Inicia sesion para usar workspaces compartidos. El modo local sigue disponible.';
  }

  if (message.includes('network') || message.includes('Network')) {
    return 'No se pudo conectar con el servidor. Puedes seguir trabajando en modo local.';
  }

  if (message.includes('refresh')) {
    return 'No se pudo actualizar la sesion. Vuelve a iniciar sesion si necesitas sync compartido.';
  }

  return 'No se pudo completar la accion de cuenta.';
};

export const createAuthStatusDisplay = ({
  error = null,
  loading = false,
  refreshing = false,
  session = null,
} = {}) => {
  const formattedError = formatAuthError(error);

  if (formattedError) {
    if (formattedError.includes('revocada')) {
      return {
        detail: formattedError,
        state: 'revoked',
        title: 'Sesion revocada',
      };
    }

    if (formattedError.includes('actualizar')) {
      return {
        detail: formattedError,
        state: 'refresh-failed',
        title: 'No se pudo actualizar la sesion',
      };
    }
  }

  const state = getAuthStatusState({ loading, refreshing, session });

  if (state === 'refreshing') {
    return {
      detail: 'Verificando la sesion guardada.',
      state,
      title: 'Actualizando sesion',
    };
  }

  if (state === 'expired') {
    return {
      detail:
        session?.email ||
        'Inicia sesion de nuevo. Tus datos locales permanecen en el dispositivo.',
      state,
      title: 'Sesion expirada',
    };
  }

  if (state === 'authenticated') {
    return {
      detail: session?.email || session?.displayName || 'Sesion activa',
      state,
      title: session?.restored
        ? 'Sesion restaurada localmente'
        : 'Sync compartido activo',
    };
  }

  if (state === 'loading') {
    return {
      detail: 'Buscando sesion local guardada.',
      state,
      title: 'Cargando cuenta',
    };
  }

  return {
    detail:
      'Puedes seguir usando inventario, recetas y ventas locales sin cuenta.',
    state,
    title: 'Modo local',
  };
};

export const getAuthActionMessage = (action) => {
  if (action === 'login') {
    return 'Sesion iniciada. El sync compartido queda disponible y sigue siendo manual.';
  }

  if (action === 'register') {
    return 'Cuenta creada. El sync compartido queda disponible y sigue siendo manual.';
  }

  if (action === 'logout') {
    return 'Sesion cerrada. No se elimino ningun dato local.';
  }

  if (action === 'verify') {
    return 'Sesion verificada.';
  }

  if (action === 'sessions') {
    return 'Sesiones actualizadas.';
  }

  return null;
};

export const sanitizeSessionForDisplay = (session = {}) => ({
  deviceName: session.deviceName || 'Dispositivo',
  isCurrent: Boolean(session.isCurrent),
  lastUsedAt: session.lastUsedAt || null,
  revokedAt: session.revokedAt || null,
  sessionId: session.sessionId,
});
