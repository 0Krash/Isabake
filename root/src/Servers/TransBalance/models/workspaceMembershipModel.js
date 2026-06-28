const mongoose = require('mongoose');

const workspaceMembershipSchema = new mongoose.Schema(
  {
    groupId: {
      type: String,
      required: true,
      index: true,
    },
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member',
    },
    status: {
      type: String,
      enum: ['active', 'invited', 'removed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  },
);

workspaceMembershipSchema.index({ groupId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model(
  'WorkspaceMembership',
  workspaceMembershipSchema,
);
