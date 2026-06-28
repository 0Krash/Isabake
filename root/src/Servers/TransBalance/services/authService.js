const { randomUUID } = require('crypto');

const createHttpError = require('../utils/httpError');
const { MongooseWorkspaceRepository } = require('./workspaceRepository');
const { hashPassword, verifyPassword } = require('./passwordService');
const { issueTokenPair, verifyJwt } = require('./authTokenService');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    authProvider: user.authProvider,
    createdAt: user.createdAt,
    deletedAt: user.deletedAt || null,
    displayName: user.displayName || null,
    email: user.email,
    updatedAt: user.updatedAt,
    userId: user.userId,
  };
};

class AuthService {
  constructor(repository = new MongooseWorkspaceRepository()) {
    this.repository = repository;
  }

  async register({ displayName, email, password }) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      throw createHttpError(400, 'email_required');
    }

    const existingUser = await this.repository.findUserByEmail(normalizedEmail);

    if (existingUser) {
      throw createHttpError(409, 'email_already_registered');
    }

    const user = await this.repository.createUser({
      authProvider: 'password',
      displayName: displayName || normalizedEmail,
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      userId: `user_${randomUUID()}`,
    });

    return this.createAuthResponse(user);
  }

  async login({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.repository.findUserByEmail(normalizedEmail);

    if (!user || user.deletedAt) {
      throw createHttpError(401, 'invalid_credentials');
    }

    const validPassword = await verifyPassword(password, user.passwordHash);

    if (!validPassword) {
      throw createHttpError(401, 'invalid_credentials');
    }

    return this.createAuthResponse(user);
  }

  async refresh(refreshToken) {
    const payload = verifyJwt(refreshToken);

    if (payload.tokenUse !== 'refresh') {
      throw createHttpError(401, 'invalid_token');
    }

    const user = await this.repository.findUserByUserId(payload.sub);

    if (!user || user.deletedAt) {
      throw createHttpError(401, 'invalid_token');
    }

    return this.createAuthResponse(user);
  }

  async getUserFromAccessToken(accessToken) {
    const payload = verifyJwt(accessToken);

    if (payload.tokenUse !== 'access') {
      throw createHttpError(401, 'invalid_token');
    }

    const user = await this.repository.findUserByUserId(payload.sub);

    if (!user || user.deletedAt) {
      throw createHttpError(401, 'invalid_token');
    }

    return user;
  }

  createAuthResponse(user) {
    return {
      session: issueTokenPair(user),
      user: sanitizeUser(user),
    };
  }
}

module.exports = {
  AuthService,
  normalizeEmail,
  sanitizeUser,
};
