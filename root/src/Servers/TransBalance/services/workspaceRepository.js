const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const WorkspaceMembership = require('../models/workspaceMembershipModel');

const toPlainObject = (document) =>
  typeof document?.toObject === 'function' ? document.toObject() : document;

class MongooseWorkspaceRepository {
  async createUser(user) {
    return toPlainObject(await User.create(user));
  }

  async upsertUser(user) {
    return toPlainObject(
      await User.findOneAndUpdate(
        { userId: user.userId },
        user,
        {
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          upsert: true,
        },
      ),
    );
  }

  async findUserByUserId(userId) {
    return toPlainObject(await User.findOne({ userId, deletedAt: null }));
  }

  async findUserByEmail(email) {
    return toPlainObject(await User.findOne({ email, deletedAt: null }));
  }

  async createWorkspace(workspace) {
    return toPlainObject(await Workspace.create(workspace));
  }

  async findWorkspaceByGroupId(groupId) {
    return toPlainObject(await Workspace.findOne({ groupId, deletedAt: null }));
  }

  async findWorkspaceByWorkspaceId(workspaceId) {
    return toPlainObject(
      await Workspace.findOne({ workspaceId, deletedAt: null }),
    );
  }

  async upsertMembership(membership) {
    return toPlainObject(
      await WorkspaceMembership.findOneAndUpdate(
        {
          groupId: membership.groupId,
          userId: membership.userId,
        },
        membership,
        {
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          upsert: true,
        },
      ),
    );
  }

  async findMembership({ groupId, userId }) {
    return toPlainObject(
      await WorkspaceMembership.findOne({
        groupId,
        userId,
      }),
    );
  }

  async findMembershipsByGroupId(groupId) {
    return (
      await WorkspaceMembership.find({
        groupId,
      }).sort({ createdAt: 1 })
    ).map(toPlainObject);
  }

  async findActiveMembershipsByUserId(userId) {
    return (
      await WorkspaceMembership.find({
        status: 'active',
        userId,
      }).sort({ createdAt: 1 })
    ).map(toPlainObject);
  }
}

module.exports = {
  MongooseWorkspaceRepository,
};
