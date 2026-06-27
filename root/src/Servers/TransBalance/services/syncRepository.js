const SyncDocument = require('../models/syncDocumentModel');
const SyncEvent = require('../models/syncEventModel');

const toPlainObject = (document) =>
  typeof document?.toObject === 'function' ? document.toObject() : document;

class MongooseSyncRepository {
  async findEventByEventId(eventId) {
    return toPlainObject(await SyncEvent.findOne({ eventId }));
  }

  async saveEvent(event) {
    return toPlainObject(await SyncEvent.create(event));
  }

  async findDocument({ collection, groupId, remoteId }) {
    return toPlainObject(
      await SyncDocument.findOne({
        collection,
        groupId,
        remoteId,
      }),
    );
  }

  async getNextServerVersion(groupId) {
    const latestDocument = await SyncDocument.findOne({ groupId }).sort({
      serverVersion: -1,
    });

    return Number(latestDocument?.serverVersion || 0) + 1;
  }

  async upsertDocument({
    collection,
    deletedAt,
    document,
    groupId,
    lastEventId,
    remoteId,
    serverVersion,
    updatedByDeviceId,
  }) {
    return toPlainObject(
      await SyncDocument.findOneAndUpdate(
        {
          collection,
          groupId,
          remoteId,
        },
        {
          collection,
          deletedAt,
          document,
          groupId,
          lastEventId,
          remoteId,
          serverVersion,
          updatedByDeviceId,
        },
        {
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          upsert: true,
        },
      ),
    );
  }

  async findChangesAfterCursor({ cursor = 0, groupId }) {
    return (
      await SyncDocument.find({
        groupId,
        serverVersion: {
          $gt: Number(cursor || 0),
        },
      }).sort({
        serverVersion: 1,
      })
    ).map(toPlainObject);
  }
}

module.exports = {
  MongooseSyncRepository,
};
