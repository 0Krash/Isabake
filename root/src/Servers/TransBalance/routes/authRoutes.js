const express = require('express');

const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.route('/register').post(authController.register);
router.route('/login').post(authController.login);
router.route('/refresh').post(authController.refresh);
router.route('/logout').post(requireAuth, authController.logout);
router.route('/me').get(requireAuth, authController.me);
router
  .route('/sessions')
  .get(requireAuth, authController.listSessions)
  .delete(requireAuth, authController.revokeAllSessions);
router
  .route('/sessions/:sessionId')
  .delete(requireAuth, authController.revokeSession);

module.exports = router;
