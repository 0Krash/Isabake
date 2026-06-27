const express = require('express');
const syncController = require('../controllers/syncController');

const router = express.Router();

router.route('/push').post(syncController.pushChanges);
router.route('/pull').get(syncController.pullChanges);

module.exports = router;
