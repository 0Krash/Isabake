const express = require('express');

const workspaceController = require('../controllers/workspaceController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router
  .route('/')
  .get(workspaceController.listWorkspaces)
  .post(workspaceController.createWorkspace);

router.route('/:groupId').get(workspaceController.getWorkspace);

router
  .route('/:groupId/members')
  .get(workspaceController.getMembers)
  .post(workspaceController.addMember);

router.route('/:groupId/leave').post(workspaceController.leaveWorkspace);

router
  .route('/:groupId/members/:userId')
  .patch(workspaceController.updateMember)
  .delete(workspaceController.removeMember);

module.exports = router;
