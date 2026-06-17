const express = require('express');
const storeController = require('../controllers/StoreController');

const router = express.Router();

router
  .route('/')
  .get(storeController.getAllStores)
  .post(storeController.createStore);

router
  .route('/:storeId')
  .patch(storeController.updateStoreById)
  .delete(storeController.deleteStoreById);

module.exports = router;
