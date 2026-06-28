let currentAuthSession = null;

const normalizeSession = (session = {}) => {
  if (!session) {
    return null;
  }

  const user = session.user || {};
  const authToken = session.authToken || session.accessToken || session.token || null;
  const userId = session.userId || user.userId || null;

  if (!authToken || !userId) {
    return null;
  }

  return {
    authProvider: session.authProvider || 'dev-header',
    authToken,
    displayName: session.displayName || user.displayName || null,
    email: session.email || user.email || `${userId}@dev.local`,
    refreshToken: session.refreshToken || null,
    temporary:
      session.temporary !== undefined
        ? session.temporary
        : (session.authProvider || user.authProvider) !== 'password',
    user: session.user || null,
    userId,
  };
};

export const getAuthSession = async () => currentAuthSession;

export const setAuthSession = async (session) => {
  currentAuthSession = normalizeSession(session);

  if (!currentAuthSession) {
    throw new Error('Sesion auth invalida');
  }

  return currentAuthSession;
};

export const clearAuthSession = async () => {
  currentAuthSession = null;
  return null;
};

export const getAuthHeaders = (session = currentAuthSession) => {
  const normalizedSession = normalizeSession(session);

  if (!normalizedSession) {
    return {};
  }

  return {
    Authorization: `Bearer ${normalizedSession.authToken}`,
    ...(normalizedSession.authProvider === 'dev-header' ||
    normalizedSession.temporary
      ? {
          'x-dev-user-email': normalizedSession.email,
          'x-dev-user-id': normalizedSession.userId,
          ...(normalizedSession.displayName
            ? { 'x-dev-user-name': normalizedSession.displayName }
            : {}),
        }
      : {}),
  };
};

export const requireAuthHeaders = (session = currentAuthSession) => {
  const headers = getAuthHeaders(session);

  if (!headers.Authorization) {
    throw new Error('Sesion auth requerida para sync remoto');
  }

  return headers;
};

export const createDevAuthSession = ({ displayName, email, userId } = {}) => {
  if (!userId) {
    throw new Error('userId requerido');
  }

  return normalizeSession({
    authProvider: 'dev-header',
    authToken: `dev-token-${userId}`,
    displayName,
    email,
    temporary: true,
    userId,
  });
};

export default {
  clearAuthSession,
  createDevAuthSession,
  getAuthHeaders,
  getAuthSession,
  requireAuthHeaders,
  setAuthSession,
};
