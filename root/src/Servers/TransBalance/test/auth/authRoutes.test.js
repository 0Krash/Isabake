const request = require('supertest');

jest.mock('../../models/userModel', () => {
  const store = [];

  return {
    __store: store,
    create: jest.fn(async (user) => {
      const nextUser = {
        createdAt: '2026-01-01T00:00:00.000Z',
        deletedAt: null,
        updatedAt: '2026-01-01T00:00:01.000Z',
        ...user,
      };
      store.push(nextUser);
      return nextUser;
    }),
    findOne: jest.fn(async (query) =>
      store.find(
        (user) =>
          (!query.userId || user.userId === query.userId) &&
          (!query.email || user.email === query.email) &&
          !user.deletedAt,
      ) || null,
    ),
    findOneAndUpdate: jest.fn(),
  };
});

jest.mock('../../models/authSessionModel', () => {
  const store = [];

  return {
    __store: store,
    create: jest.fn(async (session) => {
      const nextSession = {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:01.000Z',
        ...session,
      };
      store.push(nextSession);
      return nextSession;
    }),
    find: jest.fn((query) => ({
      sort: jest.fn(async () =>
        store
          .filter((session) => session.userId === query.userId)
          .sort((left, right) =>
            String(right.createdAt).localeCompare(String(left.createdAt)),
          ),
      ),
    })),
    findOne: jest.fn(async (query) =>
      store.find((session) => session.sessionId === query.sessionId) || null,
    ),
    findOneAndUpdate: jest.fn(async (query, update) => {
      const index = store.findIndex(
        (session) => session.sessionId === query.sessionId,
      );

      if (index < 0) {
        return null;
      }

      store[index] = {
        ...store[index],
        ...update,
        updatedAt: '2026-01-01T00:00:02.000Z',
      };

      return store[index];
    }),
    updateMany: jest.fn(async (query, update) => {
      let modifiedCount = 0;

      store.forEach((session, index) => {
        if (session.userId === query.userId && session.revokedAt == null) {
          store[index] = {
            ...session,
            ...update,
          };
          modifiedCount += 1;
        }
      });

      return { modifiedCount };
    }),
  };
});

jest.mock('../../models/workspaceModel', () => ({
  findOne: jest.fn(async () => null),
}));

jest.mock('../../models/workspaceMembershipModel', () => ({
  findOne: jest.fn(async () => null),
}));

const User = require('../../models/userModel');
const AuthSession = require('../../models/authSessionModel');
const app = require('../../app');

describe('auth routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.__store.length = 0;
    AuthSession.__store.length = 0;
  });

  test('register creates user with hashed password and returns JWT', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        displayName: 'Ana',
        email: 'ANA@EXAMPLE.TEST',
        password: 'password123',
      });

    expect(response.status).toBe(201);
    expect(response.body.session.accessToken).toEqual(expect.any(String));
    expect(response.body.session.refreshToken).toEqual(expect.any(String));
    expect(response.body.session.sessionId).toEqual(expect.any(String));
    expect(response.body.session.refreshTokenHash).toBeUndefined();
    expect(response.body.sessionMetadata.refreshTokenHash).toBeUndefined();
    expect(response.body.user).toEqual(
      expect.objectContaining({
        authProvider: 'password',
        displayName: 'Ana',
        email: 'ana@example.test',
        userId: expect.any(String),
      }),
    );
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(User.__store[0].passwordHash).toMatch(/^scrypt:/);
    expect(User.__store[0].passwordHash).not.toBe('password123');
    expect(AuthSession.__store).toHaveLength(1);
    expect(AuthSession.__store[0].refreshTokenHash).toEqual(expect.any(String));
    expect(AuthSession.__store[0].refreshTokenHash).not.toBe(
      response.body.session.refreshToken,
    );
  });

  test('duplicate active email is rejected', async () => {
    await request(app)
      .post('/auth/register')
      .send({
        email: 'ana@example.test',
        password: 'password123',
      });
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'ANA@example.test',
        password: 'password456',
      });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('email_already_registered');
  });

  test('login returns JWT and user profile', async () => {
    await request(app)
      .post('/auth/register')
      .send({
        displayName: 'Ana',
        email: 'ana@example.test',
        password: 'password123',
      });

    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'ANA@example.test',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body.session.accessToken).toEqual(expect.any(String));
    expect(response.body.session.sessionId).toEqual(expect.any(String));
    expect(response.body.user.email).toBe('ana@example.test');
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  test('wrong password and deleted users are rejected', async () => {
    await request(app)
      .post('/auth/register')
      .send({
        email: 'ana@example.test',
        password: 'password123',
      });

    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({
        email: 'ana@example.test',
        password: 'wrong-password',
      });

    User.__store[0].deletedAt = '2026-01-02T00:00:00.000Z';
    const deletedUser = await request(app)
      .post('/auth/login')
      .send({
        email: 'ana@example.test',
        password: 'password123',
      });

    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.message).toBe('invalid_credentials');
    expect(deletedUser.status).toBe(401);
    expect(deletedUser.body.message).toBe('invalid_credentials');
  });

  test('/auth/me works with JWT', async () => {
    const registerResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'ana@example.test',
        password: 'password123',
      });
    const token = registerResponse.body.session.accessToken;

    const response = await request(app)
      .get('/auth/me')
      .set('authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('ana@example.test');
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  test('refresh rotates session and revoked refresh token cannot be reused', async () => {
    const registerResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'ana@example.test',
        password: 'password123',
      });
    const firstRefreshToken = registerResponse.body.session.refreshToken;
    const firstSessionId = registerResponse.body.session.sessionId;

    const refreshResponse = await request(app)
      .post('/auth/refresh')
      .send({
        refreshToken: firstRefreshToken,
      });
    const reuseResponse = await request(app)
      .post('/auth/refresh')
      .send({
        refreshToken: firstRefreshToken,
      });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.session.refreshToken).not.toBe(firstRefreshToken);
    expect(refreshResponse.body.session.sessionId).not.toBe(firstSessionId);
    expect(AuthSession.__store).toHaveLength(2);
    expect(AuthSession.__store[0].revokedReason).toBe('rotated');
    expect(AuthSession.__store[0].replacedBySessionId).toBe(
      refreshResponse.body.session.sessionId,
    );
    expect(reuseResponse.status).toBe(401);
    expect(reuseResponse.body.message).toBe('invalid_token');
  });

  test('refresh fails for revoked session, expired session, and deleted user', async () => {
    const registerResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'ana@example.test',
        password: 'password123',
      });

    AuthSession.__store[0].revokedAt = '2026-01-02T00:00:00.000Z';
    const revokedResponse = await request(app)
      .post('/auth/refresh')
      .send({
        refreshToken: registerResponse.body.session.refreshToken,
      });

    AuthSession.__store[0].revokedAt = null;
    AuthSession.__store[0].expiresAt = '2020-01-01T00:00:00.000Z';
    const expiredResponse = await request(app)
      .post('/auth/refresh')
      .send({
        refreshToken: registerResponse.body.session.refreshToken,
      });

    AuthSession.__store[0].expiresAt = '2099-01-01T00:00:00.000Z';
    User.__store[0].deletedAt = '2026-01-02T00:00:00.000Z';
    const deletedUserResponse = await request(app)
      .post('/auth/refresh')
      .send({
        refreshToken: registerResponse.body.session.refreshToken,
      });

    expect(revokedResponse.status).toBe(401);
    expect(expiredResponse.status).toBe(401);
    expect(deletedUserResponse.status).toBe(401);
  });

  test('logout revokes current refresh session', async () => {
    const registerResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'ana@example.test',
        password: 'password123',
      });
    const { accessToken, refreshToken } = registerResponse.body.session;

    const logoutResponse = await request(app)
      .post('/auth/logout')
      .set('authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    const refreshResponse = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.revoked).toBe(true);
    expect(AuthSession.__store[0].revokedReason).toBe('logout');
    expect(refreshResponse.status).toBe(401);
  });

  test('session endpoints list and revoke only own sessions', async () => {
    const ana = await request(app)
      .post('/auth/register')
      .send({
        email: 'ana@example.test',
        password: 'password123',
      });
    const bob = await request(app)
      .post('/auth/register')
      .send({
        email: 'bob@example.test',
        password: 'password123',
      });
    const anaToken = ana.body.session.accessToken;

    const listResponse = await request(app)
      .get('/auth/sessions')
      .set('authorization', `Bearer ${anaToken}`);
    const revokeOtherResponse = await request(app)
      .delete(`/auth/sessions/${bob.body.session.sessionId}`)
      .set('authorization', `Bearer ${anaToken}`);
    const revokeOwnResponse = await request(app)
      .delete(`/auth/sessions/${ana.body.session.sessionId}`)
      .set('authorization', `Bearer ${anaToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.sessions).toHaveLength(1);
    expect(listResponse.body.sessions[0].refreshTokenHash).toBeUndefined();
    expect(revokeOtherResponse.status).toBe(404);
    expect(revokeOwnResponse.status).toBe(200);
    expect(revokeOwnResponse.body.session.revokedReason).toBe('revoked_by_user');
    expect(revokeOwnResponse.body.session.refreshTokenHash).toBeUndefined();
  });

  test('DELETE /auth/sessions revokes all own sessions', async () => {
    const first = await request(app)
      .post('/auth/register')
      .send({
        email: 'ana@example.test',
        password: 'password123',
      });
    await request(app)
      .post('/auth/login')
      .send({
        email: 'ana@example.test',
        password: 'password123',
      });

    const response = await request(app)
      .delete('/auth/sessions')
      .set('authorization', `Bearer ${first.body.session.accessToken}`);

    expect(response.status).toBe(200);
    expect(
      AuthSession.__store.filter((session) => session.revokedAt).length,
    ).toBe(2);
  });
});
