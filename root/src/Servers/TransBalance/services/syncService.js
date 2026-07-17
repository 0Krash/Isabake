const { MongooseSyncRepository } = require('./syncRepository');

const VALID_OPERATIONS = new Set(['create', 'update', 'delete']);

const nowIso = () => new Date().toISOString();

const createRemoteId = ({ collection, documentId, eventId }) =>
  `${collection}_${documentId || eventId}_${Date.now()}`;

const normalizeCursor = (cursor) => {
  const numericCursor = Number(cursor || 0);

  return Number.isFinite(numericCursor) && numericCursor > 0
    ? numericCursor
    : 0;
};

const getLocalId = (event) =>
  event.document?.localId ||
  event.document?.id ||
  event.documentId ||
  event.localId;

const getRemoteId = (event) =>
  event.document?.remoteId ||
  event.remoteId ||
  event.document?.remoteID ||
  null;

const makeRejected = (event, reason, extra = {}) => ({
  eventId: event?.eventId || null,
  reason,
  ...extra,
});

const makeAccepted = ({
  collection,
  eventId,
  localId,
  remoteId,
  serverVersion,
  syncedAt,
}) => ({
  collection,
  eventId,
  localId,
  remoteId,
  serverVersion,
  syncedAt,
});

const validatePushRequest = ({ deviceId, events, groupId }) => {
  if (!groupId) {
    return 'groupId_required';
  }

  if (!deviceId) {
    return 'deviceId_required';
  }

  if (!Array.isArray(events)) {
    return 'events_array_required';
  }

  return null;
};

const validateVerifyDocumentsRequest = ({ documents, groupId }) => {
  if (!groupId) {
    return 'groupId_required';
  }

  if (!Array.isArray(documents)) {
    return 'documents_array_required';
  }

  return null;
};

const validateEvent = (event) => {
  if (!event || typeof event !== 'object') {
    return 'invalid_event';
  }

  if (!event.eventId) {
    return 'missing_eventId';
  }

  if (!event.collection) {
    return 'missing_collection';
  }

  if (!event.operation || !VALID_OPERATIONS.has(event.operation)) {
    return 'invalid_operation';
  }

  if (!event.document || typeof event.document !== 'object') {
    return 'missing_document';
  }

  return null;
};

const getOperationForDocument = (document) =>
  document.deletedAt ? 'delete' : 'upsert';

const toPullChange = (document) => ({
  collection: document.collection,
  deletedAt: document.deletedAt || null,
  document: document.document || {},
  operation: getOperationForDocument(document),
  remoteId: document.remoteId,
  serverVersion: document.serverVersion,
  updatedAt: document.updatedAt,
});

class SyncService {
  constructor(repository = new MongooseSyncRepository()) {
    this.repository = repository;
  }

  async pushChanges({ deviceId, events, groupId } = {}) {
    const requestError = validatePushRequest({ deviceId, events, groupId });

    if (requestError) {
      return {
        accepted: [],
        cursor: '0',
        rejected: [makeRejected(null, requestError)],
      };
    }

    const accepted = [];
    const rejected = [];

    for (const event of events) {
      const eventError = validateEvent(event);

      if (eventError) {
        rejected.push(makeRejected(event, eventError));
        continue;
      }

      const existingEvent = await this.repository.findEventByEventId(
        event.eventId,
      );

      if (existingEvent?.response) {
        if (existingEvent.status === 'accepted') {
          accepted.push(existingEvent.response);
        } else {
          rejected.push(existingEvent.response);
        }
        continue;
      }

      const localId = getLocalId(event);
      const remoteId =
        getRemoteId(event) ||
        createRemoteId({
          collection: event.collection,
          documentId: event.documentId || localId,
          eventId: event.eventId,
        });
      const currentDocument = await this.repository.findDocument({
        collection: event.collection,
        groupId,
        remoteId,
      });

      if (
        event.baseServerVersion &&
        currentDocument?.serverVersion &&
        Number(event.baseServerVersion) < Number(currentDocument.serverVersion)
      ) {
        const response = makeRejected(event, 'conflict', {
          conflictDocument: toPullChange(currentDocument),
          currentServerVersion: currentDocument.serverVersion,
          attemptedBaseServerVersion: event.baseServerVersion,
        });

        await this.repository.saveEvent({
          collection: event.collection,
          deviceId,
          documentId: event.documentId || localId || remoteId,
          eventId: event.eventId,
          groupId,
          operation: event.operation,
          response,
          status: 'rejected',
        });
        rejected.push(response);
        continue;
      }

      const syncedAt = nowIso();
      const serverVersion = await this.repository.getNextServerVersion(groupId);
      const deletedAt =
        event.operation === 'delete'
          ? event.document.deletedAt || syncedAt
          : event.document.deletedAt || null;
      const storedDocument = {
        ...event.document,
        groupId,
        localId,
        remoteId,
      };

      await this.repository.upsertDocument({
        collection: event.collection,
        deletedAt,
        document: storedDocument,
        groupId,
        lastEventId: event.eventId,
        remoteId,
        serverVersion,
        updatedByDeviceId: deviceId,
      });

      const response = makeAccepted({
        collection: event.collection,
        eventId: event.eventId,
        localId,
        remoteId,
        serverVersion,
        syncedAt,
      });

      await this.repository.saveEvent({
        collection: event.collection,
        deviceId,
        documentId: event.documentId || localId || remoteId,
        eventId: event.eventId,
        groupId,
        operation: event.operation,
        response,
        status: 'accepted',
      });
      accepted.push(response);
    }

    const cursor = accepted.reduce(
      (latestCursor, event) => Math.max(latestCursor, event.serverVersion || 0),
      0,
    );

    return {
      accepted,
      cursor: String(cursor || normalizeCursor(0)),
      rejected,
    };
  }

  async pullChanges({ cursor, groupId } = {}) {
    if (!groupId) {
      return {
        error: 'groupId_required',
        groupId,
        changes: [],
        cursor: String(normalizeCursor(cursor)),
      };
    }

    const normalizedCursor = normalizeCursor(cursor);
    const documents = await this.repository.findChangesAfterCursor({
      cursor: normalizedCursor,
      groupId,
    });
    const changes = documents.map(toPullChange);
    const nextCursor = changes.reduce(
      (latestCursor, change) =>
        Math.max(latestCursor, Number(change.serverVersion || 0)),
      normalizedCursor,
    );

    return {
      changes,
      cursor: String(nextCursor),
      groupId,
    };
  }

  async verifyDocuments({ documents, groupId } = {}) {
    const requestError = validateVerifyDocumentsRequest({ documents, groupId });

    if (requestError) {
      return {
        error: requestError,
        groupId,
        results: [],
      };
    }

    const requestedDocuments = documents.map((document) => ({
      collection: document?.collection ? String(document.collection) : null,
      remoteId: document?.remoteId ? String(document.remoteId) : null,
      serverVersion:
        document?.serverVersion === null || document?.serverVersion === undefined
          ? null
          : Number(document.serverVersion),
    }));
    const storedDocuments = await this.repository.findDocumentsByRemoteIds({
      documents: requestedDocuments,
      groupId,
    });
    const storedByKey = new Map(
      storedDocuments.map((document) => [
        `${document.collection}:${document.remoteId}`,
        document,
      ]),
    );
    const results = requestedDocuments.map((document) => {
      if (!document.collection || !document.remoteId) {
        return {
          collection: document.collection,
          deleted: false,
          exists: false,
          remoteId: document.remoteId,
          serverVersion: null,
          status: 'unknown',
        };
      }

      const storedDocument = storedByKey.get(
        `${document.collection}:${document.remoteId}`,
      );

      if (!storedDocument) {
        return {
          collection: document.collection,
          deleted: false,
          exists: false,
          remoteId: document.remoteId,
          serverVersion: null,
          status: 'missing',
        };
      }

      if (storedDocument.deletedAt) {
        return {
          collection: document.collection,
          deleted: true,
          exists: true,
          remoteId: document.remoteId,
          serverVersion: storedDocument.serverVersion || null,
          status: 'deleted',
        };
      }

      const storedVersion = Number(storedDocument.serverVersion || 0);
      const requestedVersion = Number(document.serverVersion || 0);

      return {
        collection: document.collection,
        deleted: false,
        exists: true,
        remoteId: document.remoteId,
        serverVersion: storedDocument.serverVersion || null,
        status:
          requestedVersion && storedVersion < requestedVersion
            ? 'stale'
            : 'ok',
      };
    });

    return {
      groupId,
      results,
    };
  }
}

module.exports = {
  SyncService,
  normalizeCursor,
  toPullChange,
  validateEvent,
  validatePushRequest,
  validateVerifyDocumentsRequest,
};
