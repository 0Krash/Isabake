const express = require('express');

const devController = require('../controllers/devController');

const router = express.Router();

router.post('/reset-database', devController.resetDatabase);

module.exports = router;
