const mongoose = require('mongoose');

const workspaceInvitationSchema = new mongoose.Schema(
  {
    acceptedAt: {
      type: Date,
      default: null,
    },
    declinedAt: {
      type: Date,
      default: null,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    groupId: {
      type: String,
      required: true,
      index: true,
    },
    invitationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    invitedByUserId: {
      type: String,
      required: true,
      index: true,
    },
    invitedUserId: {
      type: String,
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member',
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined', 'expired', 'revoked'],
      default: 'invited',
      index: true,
    },
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

workspaceInvitationSchema.index({ groupId: 1, email: 1, status: 1 });

module.exports = mongoose.model(
  'WorkspaceInvitation',
  workspaceInvitationSchema,
);
