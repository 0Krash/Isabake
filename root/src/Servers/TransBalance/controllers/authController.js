const asyncHandler = require('../utils/asyncHandler');
const { AuthService, sanitizeUser } = require('../services/authService');

const authService = new AuthService();

exports.register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body || {});

  res.status(201).json(result);
});

exports.login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body || {});

  res.status(200).json(result);
});

exports.refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body?.refreshToken);

  res.status(200).json(result);
});

exports.logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    ok: true,
  });
});

exports.me = asyncHandler(async (req, res) => {
  res.status(200).json({
    user: sanitizeUser(req.user),
  });
});
