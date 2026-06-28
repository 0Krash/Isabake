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

jest.mock('../../models/workspaceModel', () => ({
  findOne: jest.fn(async () => null),
}));

jest.mock('../../models/workspaceMembershipModel', () => ({
  findOne: jest.fn(async () => null),
}));

const User = require('../../models/userModel');
const app = require('../../app');

describe('auth routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.__store.length = 0;
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
});
