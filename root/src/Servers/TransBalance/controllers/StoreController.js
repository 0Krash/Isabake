const Store = require('../models/storeModel');

exports.getAllStores = async (req, res) => {
  try {
    const stores = await Store.find();
    res.status(200).json({
      status: 'success',
      result: stores.length,
      data: stores,
    });
  } catch (err) {
    res.status(400).json({
      status: 'failed',
      message: err,
    });
  }
};
