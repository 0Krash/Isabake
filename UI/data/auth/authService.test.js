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

import {
  clearStoredAuthSession,
  loadAuthSession,
  saveAuthSession,
} from './authTokenStore';
import {
  getFreshAuthHeaders,
  getAuthHeaders,
  getCurrentSession,
  isAccessTokenNearExpiry,
  login,
  logout,
  register,
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
  },
  user: {
    authProvider: 'password',
    displayName: 'Ana',
    email: 'ana@example.test',
    userId: 'user_1',
  },
};

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
      displayName: 'Ana',
      email: 'ANA@EXAMPLE.TEST',
      password: 'password123',
    });
    expect(saveAuthSession).toHaveBeenCalled();
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
});
