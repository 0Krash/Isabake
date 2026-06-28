let currentAuthSession = null;

const normalizeSession = (session = {}) => {
  if (!session) {
    return null;
  }

  const authToken = session.authToken || session.token || null;
  const userId = session.userId || null;

  if (!authToken || !userId) {
    return null;
  }

  return {
    authProvider: session.authProvider || 'dev-header',
    authToken,
    displayName: session.displayName || null,
    email: session.email || `${userId}@dev.local`,
    temporary: session.temporary !== false,
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
    'x-dev-user-email': normalizedSession.email,
    'x-dev-user-id': normalizedSession.userId,
    ...(normalizedSession.displayName
      ? { 'x-dev-user-name': normalizedSession.displayName }
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
