const Store = require('../models/storeModel');
const asyncHandler = require('../utils/asyncHandler');
const { sendFail, sendSuccess } = require('../utils/httpResponses');

exports.getAllStores = asyncHandler(async (req, res) => {
  const stores = await Store.find().sort({ storeId: 1 });
  sendSuccess(res, {
    data: stores,
    result: stores.length,
  });
});

exports.createStore = asyncHandler(async (req, res) => {
  const lastStore = await Store.findOne().sort({ storeId: -1 });
  const nextStoreId = (lastStore?.storeId || 0) + 1;
  const store = await Store.create({
    ...req.body,
    storeId: req.body.storeId || nextStoreId,
  });

  sendSuccess(res, {
    statusCode: 201,
    data: {
      store,
    },
  });
});

exports.updateStoreById = asyncHandler(async (req, res) => {
  const store = await Store.findOneAndUpdate(
    { storeId: Number(req.params.storeId) },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!store) {
    return sendFail(res, {
      statusCode: 404,
      message: 'Tienda no encontrada',
    });
  }

  sendSuccess(res, {
    data: {
      store,
    },
  });
});

exports.deleteStoreById = asyncHandler(async (req, res) => {
  const result = await Store.deleteOne({
    storeId: Number(req.params.storeId),
  });

  if (result.deletedCount === 0) {
    return sendFail(res, {
      statusCode: 404,
      message: 'Tienda no encontrada',
    });
  }

  sendSuccess(res);
});
