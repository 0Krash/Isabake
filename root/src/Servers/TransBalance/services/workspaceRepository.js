const User = require('../models/userModel');
const AuthSession = require('../models/authSessionModel');
const Workspace = require('../models/workspaceModel');
const WorkspaceInvitation = require('../models/workspaceInvitationModel');
const WorkspaceMembership = require('../models/workspaceMembershipModel');
const SyncDocument = require('../models/syncDocumentModel');
const SyncEvent = require('../models/syncEventModel');

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

  async createAuthSession(session) {
    return toPlainObject(await AuthSession.create(session));
  }

  async findAuthSessionBySessionId(sessionId) {
    return toPlainObject(await AuthSession.findOne({ sessionId }));
  }

  async findAuthSessionsByUserId(userId) {
    return (
      await AuthSession.find({
        userId,
      }).sort({ createdAt: -1 })
    ).map(toPlainObject);
  }

  async updateAuthSession(sessionId, update) {
    return toPlainObject(
      await AuthSession.findOneAndUpdate(
        { sessionId },
        update,
        {
          new: true,
          runValidators: true,
        },
      ),
    );
  }

  async revokeAuthSessionsByUserId(userId, update) {
    return AuthSession.updateMany(
      {
        revokedAt: null,
        userId,
      },
      update,
    );
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

  async updateWorkspace(groupId, update) {
    return toPlainObject(
      await Workspace.findOneAndUpdate(
        { groupId, deletedAt: null },
        update,
        {
          new: true,
          runValidators: true,
        },
      ),
    );
  }

  async softDeleteWorkspace(groupId, update) {
    return toPlainObject(
      await Workspace.findOneAndUpdate(
        { groupId, deletedAt: null },
        update,
        {
          new: true,
          runValidators: true,
        },
      ),
    );
  }

  async hardDeleteWorkspaceData(groupId) {
    const workspace = await Workspace.findOne({ groupId, deletedAt: null });

    if (!workspace) {
      return null;
    }

    await Promise.all([
      Workspace.deleteOne({ groupId }),
      WorkspaceMembership.deleteMany({ groupId }),
      WorkspaceInvitation.deleteMany({ groupId }),
      SyncDocument.deleteMany({ groupId }),
      SyncEvent.deleteMany({ groupId }),
    ]);

    return toPlainObject(workspace);
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

  async updateMembership({ groupId, userId }, update) {
    return toPlainObject(
      await WorkspaceMembership.findOneAndUpdate(
        {
          groupId,
          userId,
        },
        update,
        {
          new: true,
          runValidators: true,
        },
      ),
    );
  }

  async updateMembershipsByGroupId(groupId, update) {
    return WorkspaceMembership.updateMany({ groupId }, update);
  }

  async findActiveMembershipsByUserId(userId) {
    return (
      await WorkspaceMembership.find({
        status: 'active',
        userId,
      }).sort({ createdAt: 1 })
    ).map(toPlainObject);
  }

  async createInvitation(invitation) {
    return toPlainObject(await WorkspaceInvitation.create(invitation));
  }

  async findInvitationById(invitationId) {
    return toPlainObject(await WorkspaceInvitation.findOne({ invitationId }));
  }

  async findInvitationByTokenHash(inviteTokenHash) {
    return toPlainObject(await WorkspaceInvitation.findOne({ inviteTokenHash }));
  }

  async findInvitationsByGroupId(groupId) {
    return (
      await WorkspaceInvitation.find({
        groupId,
      }).sort({ createdAt: -1 })
    ).map(toPlainObject);
  }

  async findInvitationsByEmail(email) {
    return (
      await WorkspaceInvitation.find({
        email,
      }).sort({ createdAt: -1 })
    ).map(toPlainObject);
  }

  async findActiveInvitationByEmail({ email, groupId }) {
    return toPlainObject(
      await WorkspaceInvitation.findOne({
        email,
        groupId,
        status: 'invited',
      }),
    );
  }

  async updateInvitation(invitationId, update) {
    return toPlainObject(
      await WorkspaceInvitation.findOneAndUpdate(
        { invitationId },
        update,
        {
          new: true,
          runValidators: true,
        },
      ),
    );
  }

  async updateInvitationsByGroupId(groupId, update) {
    return WorkspaceInvitation.updateMany({ groupId }, update);
  }
}

module.exports = {
  MongooseWorkspaceRepository,
};
