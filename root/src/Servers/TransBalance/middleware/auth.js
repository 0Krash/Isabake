const createHttpError = require('../utils/httpError');
const { AuthService } = require('../services/authService');
const { WorkspaceService } = require('../services/workspaceService');

const authService = new AuthService();
const workspaceService = new WorkspaceService();

const getBearerToken = (req) => {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || null;
};

const isDevAuthAllowed = () =>
  process.env.NODE_ENV !== 'production' ||
  String(process.env.ENABLE_DEV_AUTH || '').toLowerCase() === 'true';

const getDevUserId = (req, token) =>
  req.get('x-dev-user-id') || req.get('x-user-id') || token;

const tryDevAuth = async (req, token) => {
  if (!isDevAuthAllowed() || !req.get('x-dev-user-id')) {
    return null;
  }

  const userId = getDevUserId(req, token);

  if (!userId) {
    return null;
  }

  const user = await workspaceService.upsertDevUser({
    displayName: req.get('x-dev-user-name') || null,
    email: req.get('x-dev-user-email') || `${userId}@dev.local`,
    userId,
  });

  return {
    auth: {
      authProvider: 'dev-header',
      temporary: true,
      token,
    },
    user,
  };
};

const requireAuth = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw createHttpError(401, 'auth_required');
    }

    try {
      const authResult = await authService.authenticateAccessToken(token);
      req.user = authResult.user;
      req.auth = {
        authProvider: 'password',
        sessionId: authResult.payload.sessionId || null,
        temporary: false,
      };
      return next();
    } catch (jwtError) {
      const devAuth = await tryDevAuth(req, token);

      if (devAuth) {
        req.user = devAuth.user;
        req.auth = devAuth.auth;
        return next();
      }

      throw jwtError.statusCode ? jwtError : createHttpError(401, 'invalid_token');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBearerToken,
  isDevAuthAllowed,
  requireAuth,
};
