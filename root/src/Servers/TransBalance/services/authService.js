const { randomUUID } = require('crypto');

const createHttpError = require('../utils/httpError');
const { MongooseWorkspaceRepository } = require('./workspaceRepository');
const { hashPassword, verifyPassword } = require('./passwordService');
const {
  getRefreshTokenExpiresAt,
  hashRefreshToken,
  issueTokenPair,
  verifyJwt,
} = require('./authTokenService');

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

const sanitizeSession = (session) => {
  if (!session) {
    return null;
  }

  return {
    createdAt: session.createdAt,
    deviceId: session.deviceId || null,
    deviceName: session.deviceName || null,
    expiresAt: session.expiresAt,
    ipAddress: session.ipAddress || null,
    lastUsedAt: session.lastUsedAt || null,
    replacedBySessionId: session.replacedBySessionId || null,
    revokedAt: session.revokedAt || null,
    revokedReason: session.revokedReason || null,
    sessionId: session.sessionId,
    updatedAt: session.updatedAt,
    userAgent: session.userAgent || null,
    userId: session.userId,
  };
};

class AuthService {
  constructor(repository = new MongooseWorkspaceRepository()) {
    this.repository = repository;
  }

  async register({ displayName, email, password, ...sessionMetadata }) {
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

    return this.createAuthResponse(user, sessionMetadata);
  }

  async login({ email, password, ...sessionMetadata }) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.repository.findUserByEmail(normalizedEmail);

    if (!user || user.deletedAt) {
      throw createHttpError(401, 'invalid_credentials');
    }

    const validPassword = await verifyPassword(password, user.passwordHash);

    if (!validPassword) {
      throw createHttpError(401, 'invalid_credentials');
    }

    return this.createAuthResponse(user, sessionMetadata);
  }

  async refresh(refreshToken) {
    const payload = verifyJwt(refreshToken);

    if (payload.tokenUse !== 'refresh') {
      throw createHttpError(401, 'invalid_token');
    }

    const session = await this.repository.findAuthSessionBySessionId(
      payload.sessionId,
    );

    if (!session) {
      throw createHttpError(401, 'invalid_token');
    }

    if (
      session.revokedAt ||
      new Date(session.expiresAt).getTime() <= Date.now() ||
      session.refreshTokenHash !== hashRefreshToken(refreshToken)
    ) {
      throw createHttpError(401, 'invalid_token');
    }

    const user = await this.repository.findUserByUserId(payload.sub);

    if (!user || user.deletedAt) {
      throw createHttpError(401, 'invalid_token');
    }

    const result = await this.createAuthResponse(user, {
      deviceId: session.deviceId,
      deviceName: session.deviceName,
      ipAddress: session.ipAddress,
      refreshTokenFamilyId: session.refreshTokenFamilyId,
      userAgent: session.userAgent,
    });

    await this.repository.updateAuthSession(session.sessionId, {
      ...session,
      lastUsedAt: new Date(),
      replacedBySessionId: result.session.sessionId,
      revokedAt: new Date(),
      revokedReason: 'rotated',
    });

    return result;
  }

  async authenticateAccessToken(accessToken) {
    const payload = verifyJwt(accessToken);

    if (payload.tokenUse !== 'access') {
      throw createHttpError(401, 'invalid_token');
    }

    const user = await this.repository.findUserByUserId(payload.sub);

    if (!user || user.deletedAt) {
      throw createHttpError(401, 'invalid_token');
    }

    return { payload, user };
  }

  async getUserFromAccessToken(accessToken) {
    const { user } = await this.authenticateAccessToken(accessToken);

    return user;
  }

  async logout({ refreshToken, sessionId, userId }) {
    let targetSessionId = sessionId;

    if (refreshToken) {
      const payload = verifyJwt(refreshToken);

      if (payload.tokenUse !== 'refresh') {
        throw createHttpError(401, 'invalid_token');
      }

      targetSessionId = payload.sessionId;
    }

    if (!targetSessionId) {
      return { ok: true, revoked: false };
    }

    const session = await this.repository.findAuthSessionBySessionId(
      targetSessionId,
    );

    if (!session || session.userId !== userId) {
      throw createHttpError(404, 'auth_session_not_found');
    }

    await this.repository.updateAuthSession(session.sessionId, {
      ...session,
      revokedAt: session.revokedAt || new Date(),
      revokedReason: session.revokedReason || 'logout',
    });

    return { ok: true, revoked: true, sessionId: session.sessionId };
  }

  async listSessions(userId) {
    const sessions = await this.repository.findAuthSessionsByUserId(userId);

    return sessions.map(sanitizeSession);
  }

  async revokeSession({ requesterUserId, sessionId }) {
    const session = await this.repository.findAuthSessionBySessionId(sessionId);

    if (!session || session.userId !== requesterUserId) {
      throw createHttpError(404, 'auth_session_not_found');
    }

    const revokedSession = await this.repository.updateAuthSession(sessionId, {
      ...session,
      revokedAt: session.revokedAt || new Date(),
      revokedReason: session.revokedReason || 'revoked_by_user',
    });

    return sanitizeSession(revokedSession);
  }

  async revokeAllSessions(userId) {
    await this.repository.revokeAuthSessionsByUserId(userId, {
      revokedAt: new Date(),
      revokedReason: 'revoked_all_by_user',
    });

    return { ok: true };
  }

  async createAuthResponse(user, sessionMetadata = {}) {
    const sessionId = `session_${randomUUID()}`;
    const refreshTokenFamilyId =
      sessionMetadata.refreshTokenFamilyId || `family_${randomUUID()}`;
    const tokens = issueTokenPair(user, {
      refreshTokenFamilyId,
      sessionId,
    });
    const authSession = await this.repository.createAuthSession({
      deviceId: sessionMetadata.deviceId || null,
      deviceName: sessionMetadata.deviceName || null,
      expiresAt: getRefreshTokenExpiresAt(),
      ipAddress: sessionMetadata.ipAddress || null,
      refreshTokenFamilyId,
      refreshTokenHash: hashRefreshToken(tokens.refreshToken),
      sessionId,
      userAgent: sessionMetadata.userAgent || null,
      userId: user.userId,
    });

    return {
      session: {
        ...tokens,
        sessionId,
      },
      sessionMetadata: sanitizeSession(authSession),
      user: sanitizeUser(user),
    };
  }
}

module.exports = {
  AuthService,
  normalizeEmail,
  sanitizeSession,
  sanitizeUser,
};
