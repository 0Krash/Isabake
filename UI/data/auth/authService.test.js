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
  getAuthHeaders,
  getCurrentSession,
  login,
  logout,
  register,
} from './authService';

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
});
