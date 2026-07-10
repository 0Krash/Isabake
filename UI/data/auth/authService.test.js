jest.mock('./authTokenStore', () => {
  let session = null;

  return {
    clearStoredAuthSession: jest.fn(async () => {
      session = null;
    }),
    loadAuthSession: jest.fn(async () => session),
    saveAuthSession: jest.fn(async (nextSession) => {
      session = nextSession;
      return session;
    }),
  };
});

jest.mock('../sync/postLoginSyncBootstrapRequest', () => ({
  requestPostLoginSyncBootstrap: jest.fn(),
}));

import {
  clearStoredAuthSession,
  loadAuthSession,
  saveAuthSession,
} from './authTokenStore';
import { requestPostLoginSyncBootstrap } from '../sync/postLoginSyncBootstrapRequest';
import {
  getFreshAuthHeaders,
  getAuthHeaders,
  getCurrentSession,
  isAccessTokenNearExpiry,
  listSessions,
  login,
  logout,
  register,
  revokeSession,
} from './authService';

const createJwt = (payload) => {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.sig`;
};

const authResponse = {
  session: {
    accessToken: 'jwt_access',
    refreshToken: 'jwt_refresh',
    sessionId: 'session_1',
  },
  sessionMetadata: {
    deviceName: 'Mobile device',
    sessionId: 'session_1',
  },
  user: {
    authProvider: 'password',
    displayName: 'Ana',
    email: 'ana@example.test',
    userId: 'user_1',
  },
};

const flushPostLoginBootstrap = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe('authService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearStoredAuthSession();
  });

  test('register stores real JWT session', async () => {
    const client = {
      register: jest.fn(async () => authResponse),
    };

    await expect(
      register({
        client,
        displayName: 'Ana',
        email: 'ANA@EXAMPLE.TEST',
        password: 'password123',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        accessToken: 'jwt_access',
        authProvider: 'password',
        email: 'ana@example.test',
        temporary: false,
      }),
    );

    expect(client.register).toHaveBeenCalledWith({
      deviceId: 'mobile_device',
      deviceName: 'Mobile device',
      displayName: 'Ana',
      email: 'ANA@EXAMPLE.TEST',
      password: 'password123',
    });
    expect(saveAuthSession).toHaveBeenCalled();
    await flushPostLoginBootstrap();
    expect(requestPostLoginSyncBootstrap).toHaveBeenCalledWith('login_success');
  });

  test('login stores session and exposes only bearer auth header', async () => {
    const client = {
      login: jest.fn(async () => authResponse),
    };
    const session = await login({
      client,
      email: 'ana@example.test',
      password: 'password123',
    });

    expect(getAuthHeaders(session)).toEqual({
      Authorization: 'Bearer jwt_access',
    });
    expect(client.login).toHaveBeenCalledWith({
      deviceId: 'mobile_device',
      deviceName: 'Mobile device',
      email: 'ana@example.test',
      password: 'password123',
    });
    await flushPostLoginBootstrap();
    expect(requestPostLoginSyncBootstrap).toHaveBeenCalledWith('login_success');
  });

  test('loads and clears session without deleting local data', async () => {
    const client = {
      login: jest.fn(async () => authResponse),
    };

    await login({
      client,
      email: 'ana@example.test',
      password: 'password123',
    });

    await expect(getCurrentSession()).resolves.toEqual(
      expect.objectContaining({ userId: 'user_1' }),
    );
    expect(loadAuthSession).toHaveBeenCalled();

    await logout();
    await expect(getCurrentSession()).resolves.toBeNull();
  });

  test('logout calls backend when possible and still clears tokens when request fails', async () => {
    const client = {
      logout: jest.fn(async () => {
        throw new Error('offline');
      }),
    };

    await logout({
      client,
      session: {
        accessToken: 'jwt_access',
        authProvider: 'password',
        refreshToken: 'jwt_refresh',
        sessionId: 'session_1',
        temporary: false,
        userId: 'user_1',
      },
    });

    expect(client.logout).toHaveBeenCalledWith({
      authHeaders: {
        Authorization: 'Bearer jwt_access',
      },
      refreshToken: 'jwt_refresh',
      sessionId: 'session_1',
    });
    expect(clearStoredAuthSession).toHaveBeenCalled();
  });

  test('detects near-expired access tokens', () => {
    expect(
      isAccessTokenNearExpiry({
        accessTokenExpiresAt: Date.now() + 30 * 1000,
      }),
    ).toBe(true);
  });

  test('expired access token refreshes before shared sync headers are returned', async () => {
    const client = {
      refresh: jest.fn(async () => ({
        session: {
          accessToken: createJwt({
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
          refreshToken: 'next_refresh',
        },
        user: {
          authProvider: 'password',
          email: 'ana@example.test',
          userId: 'user_1',
        },
      })),
    };

    await expect(
      getFreshAuthHeaders({
        client,
        session: {
          accessToken: createJwt({
            exp: Math.floor(Date.now() / 1000) - 10,
          }),
          accessTokenExpiresAt: Date.now() - 10,
          authProvider: 'password',
          refreshToken: 'old_refresh',
          temporary: false,
          userId: 'user_1',
        },
      }),
    ).resolves.toEqual({
      Authorization: expect.stringMatching(/^Bearer /),
    });
    expect(client.refresh).toHaveBeenCalledWith({
      refreshToken: 'old_refresh',
    });
  });

  test('failed refresh clears tokens and returns session_expired', async () => {
    const client = {
      refresh: jest.fn(async () => {
        throw new Error('invalid_token');
      }),
    };

    await expect(
      getFreshAuthHeaders({
        client,
        session: {
          accessToken: createJwt({
            exp: Math.floor(Date.now() / 1000) - 10,
          }),
          accessTokenExpiresAt: Date.now() - 10,
          authProvider: 'password',
          refreshToken: 'old_refresh',
          temporary: false,
          userId: 'user_1',
        },
      }),
    ).rejects.toThrow('session_expired');
    expect(clearStoredAuthSession).toHaveBeenCalled();
  });

  test('lists and revokes sessions through auth client', async () => {
    const client = {
      listSessions: jest.fn(async () => ({
        sessions: [{ sessionId: 'session_1' }],
      })),
      revokeSession: jest.fn(async () => ({
        session: { sessionId: 'session_1' },
      })),
    };
    const session = {
      accessToken: createJwt({
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
      accessTokenExpiresAt: Date.now() + 3600 * 1000,
      authProvider: 'password',
      sessionId: 'session_1',
      temporary: false,
      userId: 'user_1',
    };

    await expect(listSessions({ client, session })).resolves.toEqual({
      sessions: [{ sessionId: 'session_1' }],
    });
    await expect(
      revokeSession({ client, session, sessionId: 'session_1' }),
    ).resolves.toEqual({
      session: { sessionId: 'session_1' },
    });
  });
});
