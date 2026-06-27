const mongoose = require('mongoose');

const syncEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
    },
    collection: {
      type: String,
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    documentId: {
      type: String,
      required: true,
    },
    groupId: {
      type: String,
      required: true,
    },
    operation: {
      type: String,
      enum: ['create', 'update', 'delete'],
      required: true,
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    status: {
      type: String,
      enum: ['accepted', 'rejected'],
      required: true,
    },
  },
  {
    suppressReservedKeysWarning: true,
    timestamps: true,
  },
);

syncEventSchema.index({ groupId: 1, eventId: 1 });
syncEventSchema.index({ groupId: 1, createdAt: 1 });

module.exports = mongoose.model('SyncEvent', syncEventSchema);
