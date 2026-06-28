const createHttpError = require('../utils/httpError');
const { WorkspaceService } = require('../services/workspaceService');

const workspaceService = new WorkspaceService();

const getBearerToken = (req) => {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || null;
};

const getDevUserId = (req, token) =>
  req.get('x-dev-user-id') || req.get('x-user-id') || token;

const requireAuth = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw createHttpError(401, 'auth_required');
    }

    const userId = getDevUserId(req, token);

    if (!userId) {
      throw createHttpError(401, 'auth_required');
    }

    req.user = await workspaceService.upsertDevUser({
      displayName: req.get('x-dev-user-name') || null,
      email: req.get('x-dev-user-email') || `${userId}@dev.local`,
      userId,
    });
    req.auth = {
      authProvider: 'dev-header',
      temporary: true,
      token,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBearerToken,
  requireAuth,
};
