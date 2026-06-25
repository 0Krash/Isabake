const express = require('express');
const inventoryController = require('../controllers/inventoryController');

const router = express.Router();

router
  .route('/')
  .get(inventoryController.getAllInventoryItems)
  .post(inventoryController.createInventoryItem);

router
  .route('/:inventoryId')
  .patch(inventoryController.updateInventoryItemById)
  .delete(inventoryController.deleteInventoryItemById);

module.exports = router;
