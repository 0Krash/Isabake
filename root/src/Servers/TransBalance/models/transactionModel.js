const mongoose = require('mongoose');

const Category = require('./categoryModel');
const Store = require('./storeModel');

function getTransactionId() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const hours = String(currentDate.getHours()).padStart(2, '0');
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');
  const seconds = String(currentDate.getSeconds()).padStart(2, '0');
  const milliseconds = String(currentDate.getMilliseconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
}

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    default: getTransactionId,
  },
  selectedDate: {
    type: Date,
  },
  transactionType: {
    type: String,
  },
  category: {
    categoryId: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    shortDescription: {
      type: String,
      default: '',
    },
  },
  description: {
    type: String,
    required: [true, 'La transaccion debe tener una descripcion'],
  },
  amount: {
    type: Number,
    required: [true, 'La transaccion debe tener monto'],
  },
  store: {
    storeId: {
      type: Number,
      default: '',
    },
    name: {
      type: String,
      default: '',
    },
    alias: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
  },
  quantity: {
    type: String,
    required: [true, 'La transaccion debe tener una cantidad'],
  },
  uomId: {
    type: String,
  },
  itemQuantity: {
    type: String,
  },
});

transactionSchema.pre('save', async function (next) {
  try {
    if (!this.category || !this.category.categoryId) {
      return next();
    }
    const category = await mongoose.model('Category').findOne({
      categoryId: this.category.categoryId,
    });

    if (!category) {
      throw new Error('Categoría no encontrada');
    }
    this.category = category;
    next();
  } catch (error) {
    next(error);
  }
});

transactionSchema.pre('save', async function (next) {
  try {
    if (!this.store || !this.store.storeId) {
      return next();
    }
    const store = await mongoose.model('Store').findOne({
      storeId: this.store.storeId,
    });
    if (!store) {
      throw new Error('Tienda no encontrada');
    }
    this.store = store;
    next();
  } catch (error) {
    next(error);
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
