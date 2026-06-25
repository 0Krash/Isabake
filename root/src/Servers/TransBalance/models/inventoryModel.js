const mongoose = require('mongoose');

const inventoryLotSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiryDate: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    lotId: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    purchaseDate: {
      type: String,
      default: '',
      trim: true,
    },
    quality: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator(value) {
          const numericValue = Number(value);
          return (
            (!Number.isNaN(numericValue) && numericValue >= 1 && numericValue <= 5) ||
            ['Baja', 'Media', 'Alta', 'Premium'].includes(value)
          );
        },
        message: 'La calidad debe estar entre 1 y 5',
      },
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    supplier: {
      type: String,
      default: '',
      trim: true,
    },
    supplierId: {
      type: Number,
      default: null,
    },
    taxApplies: {
      type: Boolean,
      default: false,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      enum: ['g', 'kg', 'ml', 'l', 'pza', 'cda', 'cdta'],
      required: true,
    },
  },
  { _id: false }
);

const inventorySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      default: '',
      trim: true,
    },
    inventoryId: {
      type: Number,
      required: true,
      unique: true,
    },
    lots: {
      type: [inventoryLotSchema],
      default: [],
    },
    minimumStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    storage: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;
