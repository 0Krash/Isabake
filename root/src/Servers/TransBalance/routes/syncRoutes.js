const express = require('express');
const syncController = require('../controllers/syncController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.route('/push').post(syncController.pushChanges);
router.route('/pull').get(syncController.pullChanges);
router.route('/verify-documents').post(syncController.verifyDocuments);

module.exports = router;
