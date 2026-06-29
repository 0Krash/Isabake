const asyncHandler = require('../utils/asyncHandler');
const { AuthService, sanitizeUser } = require('../services/authService');

const authService = new AuthService();

exports.register = asyncHandler(async (req, res) => {
  const result = await authService.register({
    ...(req.body || {}),
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  });

  res.status(201).json(result);
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login({
    ...(req.body || {}),
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  });

  res.status(200).json(result);
});

exports.refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body?.refreshToken);

  res.status(200).json(result);
});

exports.logout = asyncHandler(async (req, res) => {
  const result = await authService.logout({
    refreshToken: req.body?.refreshToken,
    sessionId: req.body?.sessionId || req.auth?.sessionId,
    userId: req.user.userId,
  });

  res.status(200).json(result);
});

exports.me = asyncHandler(async (req, res) => {
  res.status(200).json({
    user: sanitizeUser(req.user),
  });
});

exports.listSessions = asyncHandler(async (req, res) => {
  res.status(200).json({
    sessions: await authService.listSessions(req.user.userId),
  });
});

exports.revokeSession = asyncHandler(async (req, res) => {
  res.status(200).json({
    session: await authService.revokeSession({
      requesterUserId: req.user.userId,
      sessionId: req.params.sessionId,
    }),
  });
});

exports.revokeAllSessions = asyncHandler(async (req, res) => {
  res.status(200).json(await authService.revokeAllSessions(req.user.userId));
});
