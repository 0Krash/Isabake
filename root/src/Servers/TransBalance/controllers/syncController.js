const asyncHandler = require('../utils/asyncHandler');
const { SyncService } = require('../services/syncService');

const syncService = new SyncService();

const getDeviceId = (req) =>
  req.body?.deviceId || req.get('x-device-id') || req.get('x-dev-user-id');

const sendBadRequest = (res, message, payload = {}) =>
  res.status(400).json({
    message,
    status: 'failed',
    ...payload,
  });

exports.pushChanges = asyncHandler(async (req, res) => {
  const groupId = req.body?.groupId;
  const deviceId = getDeviceId(req);

  // TODO: replace this dev boundary with real auth/group membership checks.
  // Every operation below is still scoped by groupId to avoid cross-group sync.
  if (!groupId) {
    return sendBadRequest(res, 'groupId_required');
  }

  if (!deviceId) {
    return sendBadRequest(res, 'deviceId_required');
  }

  if (!Array.isArray(req.body?.events)) {
    return sendBadRequest(res, 'events_array_required');
  }

  const result = await syncService.pushChanges({
    deviceId,
    events: req.body.events,
    groupId,
  });

  res.status(200).json(result);
});

exports.pullChanges = asyncHandler(async (req, res) => {
  const groupId = req.query?.groupId;

  // TODO: replace this dev boundary with real auth/group membership checks.
  // Pulls are restricted to the requested groupId only.
  if (!groupId) {
    return sendBadRequest(res, 'groupId_required');
  }

  const result = await syncService.pullChanges({
    cursor: req.query?.cursor,
    groupId,
  });

  res.status(200).json(result);
});
