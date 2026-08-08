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

exports.updateWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.updateWorkspace({
    groupId: req.params.groupId,
    name: req.body?.name,
    requesterUserId: req.user.userId,
  });

  res.status(200).json({
    status: 'success',
    workspace,
  });
});

exports.deleteWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.deleteWorkspace({
    groupId: req.params.groupId,
    requesterUserId: req.user.userId,
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

exports.createInvitation = asyncHandler(async (req, res) => {
  const invitation = await workspaceService.createInvitation({
    email: req.body?.email,
    expiresAt: req.body?.expiresAt,
    groupId: req.params.groupId,
    requesterUserId: req.user.userId,
    role: req.body?.role,
  });

  res.status(201).json({
    invitation,
    status: 'success',
  });
});

exports.listWorkspaceInvitations = asyncHandler(async (req, res) => {
  const invitations = await workspaceService.listWorkspaceInvitations({
    groupId: req.params.groupId,
    requesterUserId: req.user.userId,
  });

  res.status(200).json({
    invitations,
    status: 'success',
  });
});

exports.listMyInvitations = asyncHandler(async (req, res) => {
  const invitations = await workspaceService.listMyInvitations({
    email: req.user.email,
    userId: req.user.userId,
  });

  res.status(200).json({
    invitations,
    status: 'success',
  });
});

exports.acceptInvitation = asyncHandler(async (req, res) => {
  const invitation = await workspaceService.acceptInvitation({
    email: req.user.email,
    invitationId: req.params.invitationId,
    userId: req.user.userId,
  });

  res.status(200).json({
    invitation,
    status: 'success',
  });
});

exports.declineInvitation = asyncHandler(async (req, res) => {
  const invitation = await workspaceService.declineInvitation({
    email: req.user.email,
    invitationId: req.params.invitationId,
    userId: req.user.userId,
  });

  res.status(200).json({
    invitation,
    status: 'success',
  });
});

exports.revokeInvitation = asyncHandler(async (req, res) => {
  const invitation = await workspaceService.revokeInvitation({
    groupId: req.params.groupId,
    invitationId: req.params.invitationId,
    requesterUserId: req.user.userId,
  });

  res.status(200).json({
    invitation,
    status: 'success',
  });
});

exports.regenerateInvitationLink = asyncHandler(async (req, res) => {
  const invitation = await workspaceService.regenerateInvitationLink({
    groupId: req.params.groupId,
    invitationId: req.params.invitationId,
    requesterUserId: req.user.userId,
  });

  res.status(200).json({
    invitation,
    status: 'success',
  });
});

exports.getInvitationPreviewByToken = asyncHandler(async (req, res) => {
  const invitation = await workspaceService.getInvitationPreviewByToken(
    req.params.token,
  );

  res.status(200).json({
    invitation,
    status: 'success',
  });
});

exports.acceptInvitationByToken = asyncHandler(async (req, res) => {
  const invitation = await workspaceService.acceptInvitationByToken({
    email: req.user.email,
    token: req.params.token,
    userId: req.user.userId,
  });

  res.status(200).json({
    invitation,
    status: 'success',
  });
});

exports.declineInvitationByToken = asyncHandler(async (req, res) => {
  const invitation = await workspaceService.declineInvitationByToken({
    email: req.user.email,
    token: req.params.token,
    userId: req.user.userId,
  });

  res.status(200).json({
    invitation,
    status: 'success',
  });
});
