const Store = require('../models/storeModel');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/httpResponses');

exports.getAllStores = asyncHandler(async (req, res) => {
  const stores = await Store.find();
  sendSuccess(res, {
    data: stores,
    result: stores.length,
  });
});
