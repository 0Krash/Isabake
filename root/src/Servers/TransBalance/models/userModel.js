const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: null,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    authProvider: {
      type: String,
      default: 'dev-header',
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index(
  { email: 1 },
  {
    partialFilterExpression: {
      deletedAt: null,
      email: { $type: 'string' },
    },
    unique: true,
  },
);

module.exports = mongoose.model('User', userSchema);
