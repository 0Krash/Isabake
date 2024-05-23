const Transaction = require('../models/transactionModel');

exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find();
    res.status(200).json({
      status: 'success',
      result: transactions.length,
      data: transactions,
    });
  } catch (err) {
    res.status(400).json({
      status: 'failed',
      message: err,
    });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const newTransaction = await Transaction.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        transaction: newTransaction,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'failed',
      message: err,
    });
  }
};

exports.deleteTransactionById = async (req, res) => {
  const { transactionId } = req.params;
  try {
    const result = await Transaction.deleteOne({
      transactionId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: 'failed',
        message: 'No se encontró la transacción',
      });
    }

    res.status(200).json({
      status: 'success',
    });
  } catch (err) {
    res.status(400).json({
      status: 'failed',
      message: err,
    });
  }
};
