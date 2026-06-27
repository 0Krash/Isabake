const mongoose = require('mongoose');

const syncDocumentSchema = new mongoose.Schema(
  {
    remoteId: {
      type: String,
      required: true,
    },
    collection: {
      type: String,
      required: true,
    },
    groupId: {
      type: String,
      required: true,
    },
    document: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    serverVersion: {
      type: Number,
      required: true,
      default: 1,
    },
    updatedByDeviceId: {
      type: String,
      required: true,
    },
    lastEventId: {
      type: String,
      default: null,
    },
  },
  {
    suppressReservedKeysWarning: true,
    timestamps: true,
  },
);

syncDocumentSchema.index(
  { groupId: 1, collection: 1, remoteId: 1 },
  { unique: true },
);
syncDocumentSchema.index({ groupId: 1, serverVersion: 1 });
syncDocumentSchema.index({ groupId: 1, updatedAt: 1 });

module.exports = mongoose.model('SyncDocument', syncDocumentSchema);
