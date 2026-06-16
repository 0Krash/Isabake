const Transaction = require('../models/transactionModel');
const Querys = require('../data/query/summaryQuery');
const asyncHandler = require('../utils/asyncHandler');
const { sendFail, sendSuccess } = require('../utils/httpResponses');

exports.getAllTransactions = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find();
  sendSuccess(res, {
    data: transactions,
    result: transactions.length,
  });
});

exports.createTransaction = asyncHandler(async (req, res) => {
  const newTransaction = await Transaction.create(req.body);

  sendSuccess(res, {
    statusCode: 201,
    data: {
      transaction: newTransaction,
    },
  });
});

exports.deleteTransactionById = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const result = await Transaction.deleteOne({
    transactionId,
  });

  if (result.deletedCount === 0) {
    return sendFail(res, {
      statusCode: 404,
      message: 'No se encontró la transacción',
    });
  }

  sendSuccess(res);
});

exports.getTotalAmountByCategory = asyncHandler(async (req, res) => {
  const summary = await Transaction.aggregate(Querys.totalAmountByCategory());

  res.json(summary);
}, 500);

exports.getTotalAmountByDateCategory = asyncHandler(async (req, res) => {
  const summary = await Transaction.aggregate(
    Querys.totalAmountByDateCategory()
  );

  res.json(summary);
}, 500);
