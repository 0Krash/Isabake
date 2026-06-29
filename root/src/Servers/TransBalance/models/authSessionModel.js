const mongoose = require('mongoose');

const authSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
    },
    refreshTokenFamilyId: {
      type: String,
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      default: null,
    },
    deviceName: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedReason: {
      type: String,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    replacedBySessionId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

authSessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AuthSession', authSessionSchema);
