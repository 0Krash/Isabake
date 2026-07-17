import {
  getDocument,
  getDocumentsBySyncStatuses,
  markDocumentConflict,
  markDocumentSynced,
  saveRemoteDocument,
} from '../db/documentStore';
import { getLocalDeviceId } from '../db/localIds';
import defaultSyncClient from './syncClient';
import {
  getFailedOutboxCountsByCollection,
  getPendingOutboxCountsByCollection,
  getPendingOutboxEvents,
  incrementOutboxAttempt,
  markOutboxEventConflict,
  markOutboxEventFailed,
  markOutboxEventSynced,
} from './syncOutbox';
import {
  getLastSyncCursor,
  storeLastSyncCursor,
} from './syncStateRepository';

const SYNC_DOCUMENT_METADATA_FIELDS = new Set([
  'createdAt',
  'deletedAt',
  'deviceId',
  'groupId',
  'localId',
  'localVersion',
  'remoteId',
  'serverVersion',
  'syncStatus',
  'updatedAt',
]);

const stripSyncMetadata = (document = {}) =>
  Object.entries(document || {}).reduce((data, [key, value]) => {
    if (!SYNC_DOCUMENT_METADATA_FIELDS.has(key)) {
      data[key] = value;
    }

    return data;
  }, {});

const toPushEvent = (event, document) => ({
  baseServerVersion: document?.serverVersion || null,
  collection: event.collection,
  createdAt: event.createdAt,
  document: document
    ? {
        ...document.data,
        createdAt: document.createdAt,
        deletedAt: document.deletedAt,
        deviceId: document.deviceId,
        groupId: document.groupId,
        localId: document.id,
        localVersion: document.localVersion,
        remoteId: document.remoteId,
        serverVersion: document.serverVersion,
        syncStatus: document.syncStatus,
        updatedAt: document.updatedAt,
      }
    : event.payload,
  documentId: event.documentId,
  eventId: event.id,
  localVersion: document?.localVersion || null,
  operation: event.operation,
});

const resolveRejectedReason = (rejection) =>
  rejection?.reason || rejection?.message || 'sync_event_rejected';

const normalizeAcceptedLocalId = (accepted) =>
  accepted?.localId || accepted?.documentId || accepted?.id;

const isConflictRejection = (rejection) => rejection?.reason === 'conflict';

const buildConflictMetadata = ({
  localDocument,
  originalEvent,
  rejectedEvent,
}) => ({
  attemptedBaseServerVersion:
    rejectedEvent?.attemptedBaseServerVersion ??
    originalEvent?.payload?.baseServerVersion ??
    localDocument?.serverVersion ??
    null,
  conflictDocument: rejectedEvent?.conflictDocument || null,
  currentServerVersion:
    rejectedEvent?.currentServerVersion ??
    rejectedEvent?.conflictDocument?.serverVersion ??
    null,
  eventId: rejectedEvent?.eventId || originalEvent?.event?.id || null,
  localDocument: localDocument || null,
  reason: rejectedEvent?.reason || 'conflict',
  rejectedAt: new Date().toISOString(),
});

export const markOutboxEventSyncedById = markOutboxEventSynced;
export const markOutboxEventFailedById = markOutboxEventFailed;
export const markOutboxEventConflictById = markOutboxEventConflict;
export { storeLastSyncCursor };

export const pushPendingChanges = async ({
  client = defaultSyncClient,
  groupId,
  documentIds,
  eventIds,
  includeDebug = false,
  limit = 50,
} = {}) => {
  if (!groupId) {
    return {
      accepted: [],
      error: 'groupId_required',
      ok: false,
      rejected: [],
      skipped: [],
    };
  }

  const eventIdSet = eventIds ? new Set(eventIds) : null;
  const documentIdSet = documentIds ? new Set(documentIds) : null;
  const pendingEvents = (await getPendingOutboxEvents())
    .filter((event) => !eventIdSet || eventIdSet.has(event.id))
    .filter((event) => !documentIdSet || documentIdSet.has(event.documentId))
    .slice(0, limit);
  const preparedEvents = [];
  const skipped = [];

  for (const event of pendingEvents) {
    const document = await getDocument(event.collection, event.documentId, {
      includeDeleted: true,
    });

    if (!document?.groupId) {
      skipped.push({
        eventId: event.id,
        reason: 'document_missing_groupId',
      });
      continue;
    }

    if (document.groupId !== groupId) {
      skipped.push({
        eventId: event.id,
        reason: 'document_groupId_mismatch',
      });
      continue;
    }

    preparedEvents.push({
      event,
      payload: toPushEvent(event, document),
    });
  }

  if (!preparedEvents.length) {
    return {
      accepted: [],
      ...(includeDebug
        ? {
            debug: {
              pendingEvents,
              preparedEvents: [],
              pushRequestPayload: null,
            },
          }
        : {}),
      ok: true,
      rejected: [],
      skipped,
    };
  }

  try {
    const pushRequestPayload = {
      deviceId: await getLocalDeviceId(),
      events: preparedEvents.map((event) => event.payload),
      groupId,
    };
    const response = await client.pushChanges(pushRequestPayload);
    const accepted = Array.isArray(response.accepted) ? response.accepted : [];
    const rejected = Array.isArray(response.rejected) ? response.rejected : [];

    for (const acceptedEvent of accepted) {
      const eventId = acceptedEvent.eventId;
      const originalEvent = preparedEvents.find(
        (event) => event.event.id === eventId,
      );
      const localId = normalizeAcceptedLocalId(acceptedEvent);

      if (!originalEvent || !localId) {
        continue;
      }

      await markDocumentSynced(originalEvent.event.collection, localId, {
        remoteId: acceptedEvent.remoteId,
        serverVersion: acceptedEvent.serverVersion,
        syncedAt: acceptedEvent.syncedAt,
      });
      await markOutboxEventSynced(eventId);
    }

    for (const rejectedEvent of rejected) {
      const originalEvent = preparedEvents.find(
        (event) => event.event.id === rejectedEvent.eventId,
      );

      if (!originalEvent) {
        continue;
      }

      if (isConflictRejection(rejectedEvent)) {
        const localDocument = await getDocument(
          originalEvent.event.collection,
          originalEvent.event.documentId,
          {
            includeDeleted: true,
          },
        );
        const conflictMetadata = buildConflictMetadata({
          localDocument,
          originalEvent,
          rejectedEvent,
        });

        await markDocumentConflict(
          originalEvent.event.collection,
          originalEvent.event.documentId,
          {
            serverVersion: conflictMetadata.currentServerVersion,
          },
        );
        await markOutboxEventConflict(rejectedEvent.eventId, conflictMetadata);
        continue;
      }

      await markOutboxEventFailed(
        rejectedEvent.eventId,
        resolveRejectedReason(rejectedEvent),
      );
    }

    return {
      accepted,
      cursor: response.cursor || null,
      ...(includeDebug
        ? {
            debug: {
              backendResponseRaw: response,
              pendingEvents,
              preparedEvents,
              pushRequestPayload,
            },
          }
        : {}),
      ok: rejected.length === 0,
      rejected,
      skipped,
    };
  } catch (error) {
    await Promise.all(
      preparedEvents.map((event) => incrementOutboxAttempt(event.event.id, error)),
    );

    return {
      accepted: [],
      ...(includeDebug
        ? {
            debug: {
              pendingEvents,
              preparedEvents,
              pushRequestPayload: {
                events: preparedEvents.map((event) => event.payload),
                groupId,
              },
            },
          }
        : {}),
      error: String(error?.message || error),
      ok: false,
      rejected: [],
      skipped,
    };
  }
};

export const pullRemoteChanges = async ({
  client = defaultSyncClient,
  groupId,
} = {}) => {
  if (!groupId) {
    return {
      applied: [],
      conflicts: [],
      error: 'groupId_required',
      ok: false,
    };
  }

  try {
    const cursor = await getLastSyncCursor(groupId);
    const response = await client.pullChanges({ cursor, groupId });

    if (response.groupId && response.groupId !== groupId) {
      return {
        applied: [],
        conflicts: [],
        error: 'response_groupId_mismatch',
        ok: false,
        skipped: [],
      };
    }

    const changes = Array.isArray(response.changes) ? response.changes : [];
    const applied = [];
    const conflicts = [];
    const skipped = [];

    for (const change of changes) {
      const remoteDocument = change.document || {};

      if (remoteDocument.groupId && remoteDocument.groupId !== groupId) {
        skipped.push({
          collection: change.collection,
          reason: 'change_groupId_mismatch',
          remoteId: change.remoteId,
        });
        continue;
      }

      const localId =
        remoteDocument.localId ||
        remoteDocument.id ||
        change.localId ||
        change.remoteId;
      const existingDocument = await getDocument(change.collection, localId, {
        includeDeleted: true,
      });
      const hasLocalConflict =
        existingDocument &&
        ['pending', 'conflict'].includes(existingDocument.syncStatus) &&
        existingDocument.serverVersion !== change.serverVersion;

      if (hasLocalConflict) {
        await markDocumentConflict(change.collection, localId, {
          serverVersion: change.serverVersion,
        });
        conflicts.push({
          collection: change.collection,
          conflictDocument: change,
          localId,
          localDocument: existingDocument,
          remoteId: change.remoteId,
          reason: 'local_pending_or_conflict',
        });
        continue;
      }

      await saveRemoteDocument(change.collection, localId, {
        data: stripSyncMetadata(remoteDocument),
        deletedAt: change.deletedAt || remoteDocument.deletedAt || null,
        deviceId: remoteDocument.deviceId || null,
        groupId,
        remoteId: change.remoteId || remoteDocument.remoteId || null,
        serverVersion: change.serverVersion || remoteDocument.serverVersion,
        updatedAt: change.updatedAt || remoteDocument.updatedAt,
      });
      applied.push({
        collection: change.collection,
        localId,
        remoteId: change.remoteId,
      });
    }

    if (response.cursor) {
      await storeLastSyncCursor(groupId, response.cursor);
    }

    return {
      applied,
      conflicts,
      cursor: response.cursor || cursor || null,
      ok: conflicts.length === 0,
      skipped,
    };
  } catch (error) {
    return {
      applied: [],
      conflicts: [],
      error: String(error?.message || error),
      ok: false,
      skipped: [],
    };
  }
};

export const runSync = async ({ client = defaultSyncClient, groupId } = {}) => {
  const push = await pushPendingChanges({ client, groupId });
  const pull = await pullRemoteChanges({ client, groupId });

  return {
    ok: push.ok && pull.ok,
    pull,
    push,
  };
};

export const getSyncStatus = async () => {
  const [pendingOutboxByCollection, failedOutboxByCollection, syncDocuments] =
    await Promise.all([
      getPendingOutboxCountsByCollection(),
      getFailedOutboxCountsByCollection(),
      getDocumentsBySyncStatuses(['pending', 'failed', 'conflict']),
    ]);

  return {
    documentsByStatus: syncDocuments.reduce((summary, document) => {
      const status = document.syncStatus || 'unknown';
      summary[status] = (summary[status] || 0) + 1;
      return summary;
    }, {}),
    failedOutboxByCollection,
    pendingOutboxByCollection,
  };
};

export default {
  getSyncStatus,
  markOutboxEventFailed: markOutboxEventFailedById,
  markOutboxEventConflict: markOutboxEventConflictById,
  markOutboxEventSynced: markOutboxEventSyncedById,
  pullRemoteChanges,
  pushPendingChanges,
  runSync,
  storeLastSyncCursor,
};
