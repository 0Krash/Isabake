const express = require('express');
const storeController = require('../controllers/StoreController');

const router = express.Router();

router.route('/').get(storeController.getAllStores);

module.exports = router;
