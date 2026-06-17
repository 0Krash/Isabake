const Transaction = require('../models/transactionModel');
const Querys = require('../data/query/summaryQuery');
const asyncHandler = require('../utils/asyncHandler');
const { sendFail, sendSuccess } = require('../utils/httpResponses');

exports.getAllTransactions = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const filter = req.query.transactionType
    ? { transactionType: req.query.transactionType }
    : {};

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ selectedDate: -1, transactionId: -1, _id: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  sendSuccess(res, {
    data: transactions,
    pagination: {
      hasMore: skip + transactions.length < total,
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    },
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
