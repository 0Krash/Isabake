const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  storeId: {
    type: Number,
    required: true,
    unique: true,
  },
  Name: {
    type: String,
    required: true,
  },
  Alias: {
    type: String,
    required: true,
  },
  Address: {
    type: String,
    required: true,
  },
});

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;
