const express = require('express');

const workspaceController = require('../controllers/workspaceController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router
  .route('/invitations/by-token/:token')
  .get(workspaceController.getInvitationPreviewByToken);

router.use(requireAuth);

router
  .route('/')
  .get(workspaceController.listWorkspaces)
  .post(workspaceController.createWorkspace);

router
  .route('/invitations/mine')
  .get(workspaceController.listMyInvitations);

router
  .route('/invitations/:invitationId/accept')
  .post(workspaceController.acceptInvitation);

router
  .route('/invitations/:invitationId/decline')
  .post(workspaceController.declineInvitation);

router
  .route('/invitations/by-token/:token/accept')
  .post(workspaceController.acceptInvitationByToken);

router
  .route('/invitations/by-token/:token/decline')
  .post(workspaceController.declineInvitationByToken);

router.route('/:groupId').get(workspaceController.getWorkspace);

router
  .route('/:groupId/members')
  .get(workspaceController.getMembers)
  .post(workspaceController.addMember);

router
  .route('/:groupId/invitations')
  .get(workspaceController.listWorkspaceInvitations)
  .post(workspaceController.createInvitation);

router
  .route('/:groupId/invitations/:invitationId')
  .delete(workspaceController.revokeInvitation);

router.route('/:groupId/leave').post(workspaceController.leaveWorkspace);

router
  .route('/:groupId/members/:userId')
  .patch(workspaceController.updateMember)
  .delete(workspaceController.removeMember);

module.exports = router;
