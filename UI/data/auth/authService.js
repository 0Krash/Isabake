import { getAuthHeaders, setAuthSession, clearAuthSession } from './authSession';
import { createAuthApiClient } from './authApiClient';
import {
  clearStoredAuthSession,
  loadAuthSession,
  saveAuthSession,
} from './authTokenStore';
import { requestPostLoginSyncBootstrap } from '../sync/postLoginSyncBootstrapRequest';
import {
  getOrCreatePersonalWorkspace,
  setCurrentWorkspace,
} from '../workspace/workspaceRepository';

const REFRESH_LEEWAY_MS = 60 * 1000;

export const decodeJwtPayload = (token) => {
  const [, payload] = String(token || '').split('.');

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded =
      typeof atob === 'function'
        ? atob(normalizedPayload)
        : Buffer.from(normalizedPayload, 'base64').toString('utf8');

    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
};

export const getAccessTokenExpiresAt = ({ accessToken, expiresIn } = {}) => {
  const payload = decodeJwtPayload(accessToken);

  if (payload?.exp) {
    return payload.exp * 1000;
  }

  return expiresIn ? Date.now() + expiresIn * 1000 : null;
};

export const isAccessTokenNearExpiry = (
  session,
  { leewayMs = REFRESH_LEEWAY_MS, now = Date.now() } = {},
) =>
  Boolean(
    session?.accessTokenExpiresAt &&
      session.accessTokenExpiresAt - now <= leewayMs,
  );

const withSessionState = (session) => ({
  ...session,
  sessionState: isAccessTokenNearExpiry(session, { leewayMs: 0 })
    ? 'expired'
    : 'authenticated',
});

const toStoredSession = (payload = {}) =>
  withSessionState({
  accessToken: payload.session?.accessToken,
  accessTokenExpiresAt: getAccessTokenExpiresAt({
    accessToken: payload.session?.accessToken,
    expiresIn: payload.session?.expiresIn,
  }),
  authProvider: payload.user?.authProvider || 'password',
  displayName: payload.user?.displayName || null,
  email: payload.user?.email || null,
  refreshToken: payload.session?.refreshToken || null,
  restored: false,
  sessionId: payload.session?.sessionId || payload.sessionMetadata?.sessionId || null,
  sessionMetadata: payload.sessionMetadata || null,
  temporary: false,
  user: payload.user || null,
  userId: payload.user?.userId,
});

const getDeviceMetadata = (payload = {}) => ({
  deviceId: payload.deviceId || 'mobile_device',
  deviceName: payload.deviceName || 'Mobile device',
});

export const getCurrentSession = async () => {
  const session = await loadAuthSession();

  if (session) {
    const restoredSession = withSessionState({
      ...session,
      restored: true,
    });

    await setAuthSession(restoredSession);
    return restoredSession;
  }

  return session;
};

export const register = async ({ client, ...payload } = {}) => {
  const authClient = client || createAuthApiClient(payload);
  const response = await authClient.register({
    ...getDeviceMetadata(payload),
    ...payload,
  });
  const session = toStoredSession(response);

  await saveAuthSession(session);
  await setAuthSession(session);
  requestPostLoginSyncBootstrap('login_success');
  return session;
};

export const login = async ({ client, ...payload } = {}) => {
  const authClient = client || createAuthApiClient(payload);
  const response = await authClient.login({
    ...getDeviceMetadata(payload),
    ...payload,
  });
  const session = toStoredSession(response);

  await saveAuthSession(session);
  await setAuthSession(session);
  requestPostLoginSyncBootstrap('login_success');
  return session;
};

export const refreshSession = async ({ client, session } = {}) => {
  const currentSession = session || (await getCurrentSession());

  if (!currentSession?.refreshToken) {
    throw new Error('auth_required');
  }

  try {
    const authClient = client || createAuthApiClient();
    const response = await authClient.refresh({
      refreshToken: currentSession.refreshToken,
    });
    const nextSession = toStoredSession(response);

    await saveAuthSession(nextSession);
    await setAuthSession(nextSession);
    return nextSession;
  } catch (error) {
    await clearStoredAuthSession();
    await clearAuthSession();
    throw new Error('session_expired');
  }
};

export const getFreshAuthSession = async ({
  client,
  forceRefresh = false,
  session,
} = {}) => {
  const currentSession = session || (await getCurrentSession());

  if (!currentSession?.accessToken && !currentSession?.authToken) {
    throw new Error('auth_required');
  }

  if (currentSession.temporary || currentSession.authProvider === 'dev-header') {
    return currentSession;
  }

  if (forceRefresh || isAccessTokenNearExpiry(currentSession)) {
    return refreshSession({ client, session: currentSession });
  }

  return currentSession;
};

export const getFreshAuthHeaders = async (options = {}) =>
  getAuthHeaders(await getFreshAuthSession(options));

export const checkSession = async ({ client, session } = {}) => {
  const currentSession = await getFreshAuthSession({ client, session });
  const authClient = client || createAuthApiClient();

  if (!authClient.getMe) {
    return currentSession;
  }

  await authClient.getMe({
    authHeaders: getAuthHeaders(currentSession),
  });

  return currentSession;
};

export const logout = async ({ client, session } = {}) => {
  const currentSession = session || (await getCurrentSession());
  const authHeaders = getAuthHeaders(currentSession);

  if (client && authHeaders.Authorization) {
    await client.logout({
      authHeaders,
      refreshToken: currentSession?.refreshToken,
      sessionId: currentSession?.sessionId,
    }).catch(() => {});
  }

  await clearStoredAuthSession();
  await clearAuthSession();
  const personalWorkspace = await getOrCreatePersonalWorkspace().catch(
    () => null,
  );

  if (personalWorkspace) {
    await setCurrentWorkspace(personalWorkspace).catch(() => {});
  }

  return null;
};

export const listSessions = async ({ client, session } = {}) => {
  const currentSession = await getFreshAuthSession({ client, session });
  const authClient = client || createAuthApiClient();

  return authClient.listSessions({
    authHeaders: getAuthHeaders(currentSession),
  });
};

export const revokeSession = async ({ client, session, sessionId } = {}) => {
  const currentSession = await getFreshAuthSession({ client, session });
  const authClient = client || createAuthApiClient();

  return authClient.revokeSession({
    authHeaders: getAuthHeaders(currentSession),
    sessionId,
  });
};

export { getAuthHeaders };

export default {
  checkSession,
  decodeJwtPayload,
  getAccessTokenExpiresAt,
  getAuthHeaders,
  getCurrentSession,
  getFreshAuthHeaders,
  getFreshAuthSession,
  isAccessTokenNearExpiry,
  login,
  listSessions,
  logout,
  refreshSession,
  register,
  revokeSession,
};
