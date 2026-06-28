const express = require('express');

const workspaceController = require('../controllers/workspaceController');
const { requireAuth } = require('../middleware/devAuth');

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

module.exports = router;
