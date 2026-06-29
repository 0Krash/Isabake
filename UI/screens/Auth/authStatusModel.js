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

export const createAuthStatusDisplay = ({
  loading = false,
  refreshing = false,
  session = null,
} = {}) => {
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
      detail: session?.email || 'Inicia sesion de nuevo para sync compartido.',
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
    detail: 'Puedes seguir usando inventario, recetas y ventas locales.',
    state,
    title: 'Modo local',
  };
};
