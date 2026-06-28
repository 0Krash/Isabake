import { getAuthHeaders, setAuthSession, clearAuthSession } from './authSession';
import { createAuthApiClient } from './authApiClient';
import {
  clearStoredAuthSession,
  loadAuthSession,
  saveAuthSession,
} from './authTokenStore';

const toStoredSession = (payload = {}) => ({
  accessToken: payload.session?.accessToken,
  authProvider: payload.user?.authProvider || 'password',
  displayName: payload.user?.displayName || null,
  email: payload.user?.email || null,
  refreshToken: payload.session?.refreshToken || null,
  temporary: false,
  user: payload.user || null,
  userId: payload.user?.userId,
});

export const getCurrentSession = async () => {
  const session = await loadAuthSession();

  if (session) {
    await setAuthSession(session);
  }

  return session;
};

export const register = async ({ client, ...payload } = {}) => {
  const authClient = client || createAuthApiClient(payload);
  const response = await authClient.register(payload);
  const session = toStoredSession(response);

  await saveAuthSession(session);
  await setAuthSession(session);
  return session;
};

export const login = async ({ client, ...payload } = {}) => {
  const authClient = client || createAuthApiClient(payload);
  const response = await authClient.login(payload);
  const session = toStoredSession(response);

  await saveAuthSession(session);
  await setAuthSession(session);
  return session;
};

export const refreshSession = async ({ client, session } = {}) => {
  const currentSession = session || (await getCurrentSession());

  if (!currentSession?.refreshToken) {
    throw new Error('refresh_token_missing');
  }

  const authClient = client || createAuthApiClient();
  const response = await authClient.refresh({
    refreshToken: currentSession.refreshToken,
  });
  const nextSession = toStoredSession(response);

  await saveAuthSession(nextSession);
  await setAuthSession(nextSession);
  return nextSession;
};

export const logout = async ({ client, session } = {}) => {
  const currentSession = session || (await getCurrentSession());
  const authHeaders = getAuthHeaders(currentSession);

  if (client && authHeaders.Authorization) {
    await client.logout({ authHeaders }).catch(() => {});
  }

  await clearStoredAuthSession();
  await clearAuthSession();
  return null;
};

export { getAuthHeaders };

export default {
  getAuthHeaders,
  getCurrentSession,
  login,
  logout,
  refreshSession,
  register,
};
