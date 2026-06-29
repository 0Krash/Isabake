const asyncHandler = require('../utils/asyncHandler');
const { WorkspaceService } = require('../services/workspaceService');

const workspaceService = new WorkspaceService();

exports.createWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.createWorkspace({
    groupId: req.body?.groupId,
    name: req.body?.name,
    ownerUserId: req.user.userId,
    workspaceId: req.body?.workspaceId,
  });

  res.status(201).json({
    status: 'success',
    workspace,
  });
});

exports.listWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await workspaceService.listWorkspacesForUser(
    req.user.userId,
  );

  res.status(200).json({
    status: 'success',
    workspaces,
  });
});

exports.getWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.getWorkspaceForUser({
    groupId: req.params.groupId,
    userId: req.user.userId,
  });

  res.status(200).json({
    status: 'success',
    workspace,
  });
});

exports.getMembers = asyncHandler(async (req, res) => {
  const members = await workspaceService.getMembers({
    groupId: req.params.groupId,
    requesterUserId: req.user.userId,
  });

  res.status(200).json({
    members,
    status: 'success',
  });
});

exports.addMember = asyncHandler(async (req, res) => {
  const membership = await workspaceService.addMember({
    displayName: req.body?.displayName,
    email: req.body?.email,
    groupId: req.params.groupId,
    requesterUserId: req.user.userId,
    role: req.body?.role,
    status: req.body?.status,
    userId: req.body?.userId,
  });

  res.status(201).json({
    membership,
    status: 'success',
  });
});

exports.updateMember = asyncHandler(async (req, res) => {
  const membership = await workspaceService.updateMember({
    groupId: req.params.groupId,
    requesterUserId: req.user.userId,
    role: req.body?.role,
    status: req.body?.status,
    userId: req.params.userId,
  });

  res.status(200).json({
    membership,
    status: 'success',
  });
});

exports.removeMember = asyncHandler(async (req, res) => {
  const membership = await workspaceService.removeMember({
    groupId: req.params.groupId,
    requesterUserId: req.user.userId,
    userId: req.params.userId,
  });

  res.status(200).json({
    membership,
    status: 'success',
  });
});

exports.leaveWorkspace = asyncHandler(async (req, res) => {
  const membership = await workspaceService.leaveWorkspace({
    groupId: req.params.groupId,
    userId: req.user.userId,
  });

  res.status(200).json({
    membership,
    status: 'success',
  });
});
