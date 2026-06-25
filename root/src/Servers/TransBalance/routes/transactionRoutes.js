const express = require('express');
const transactionController = require('../controllers/transactionController');

const router = express.Router();

router
  .route('/')
  .get(transactionController.getAllTransactions)
  .post(transactionController.createTransaction);

router
  .route('/:transactionId')
  .delete(transactionController.deleteTransactionById);

router
  .route('/totalAmountByCategory')
  .get(transactionController.getTotalAmountByCategory);

router
  .route('/totalAmountByDateCategory')
  .get(transactionController.getTotalAmountByDateCategory);

module.exports = router;
