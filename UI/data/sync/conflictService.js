import {
  getConflictDocuments as getConflictDocumentRows,
  getDocument,
  preferRemoteVersion,
  saveDocument,
  updateSyncStatus,
} from '../db/documentStore';
import {
  addOutboxEvent,
  getConflictOutboxEvents,
  getPendingOutboxEventsForDocument,
  markOutboxEventResolved,
} from './syncOutbox';

const nowIso = () => new Date().toISOString();

const parseMaybeJson = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return {
      raw: value,
    };
  }
};

const summarizeByCollection = (items = []) =>
  items.reduce((summary, item) => {
    const collection = item.collection || 'unknown';
    summary[collection] = (summary[collection] || 0) + 1;
    return summary;
  }, {});

const findConflictOutboxForDocument = async ({ collection, documentId }) => {
  const events = await getConflictOutboxEvents();

  return events.filter(
    (event) => event.collection === collection && event.documentId === documentId,
  );
};

const toConflictSummaryItem = (document) => ({
  collection: document.collection,
  groupId: document.groupId || null,
  localId: document.id,
  localVersion: document.localVersion,
  remoteId: document.remoteId || null,
  serverVersion: document.serverVersion,
  syncStatus: document.syncStatus,
  updatedAt: document.updatedAt,
});

export const getConflictDocuments = async (options = {}) =>
  getConflictDocumentRows(options);

export const getConflictOutboxEventList = async (options = {}) =>
  getConflictOutboxEvents(options);

export const getConflictsByCollection = async (options = {}) => {
  const [documents, outboxEvents] = await Promise.all([
    getConflictDocuments(options),
    getConflictOutboxEventList(options),
  ]);

  return {
    documents: summarizeByCollection(documents),
    outboxEvents: summarizeByCollection(outboxEvents),
  };
};

export const getConflictSummary = async (options = {}) => {
  const [documents, outboxEvents] = await Promise.all([
    getConflictDocuments(options),
    getConflictOutboxEventList(options),
  ]);

  return {
    conflictDocumentCount: documents.length,
    conflictOutboxCount: outboxEvents.length,
    conflictsByCollection: summarizeByCollection(documents),
    documents: documents.map(toConflictSummaryItem),
    outboxByCollection: summarizeByCollection(outboxEvents),
    resolvableConflictCount: documents.length,
  };
};

export const getConflictDetails = async ({ collection, documentId } = {}) => {
  if (!collection || !documentId) {
    throw new Error('collection y documentId requeridos');
  }

  const [localDocument, outboxEvents] = await Promise.all([
    getDocument(collection, documentId, { includeDeleted: true }),
    findConflictOutboxForDocument({ collection, documentId }),
  ]);
  const outboxEvent = outboxEvents[0] || null;
  const conflictMetadata = parseMaybeJson(outboxEvent?.lastError) || {};
  const conflictDocument = conflictMetadata.conflictDocument || null;

  return {
    attemptedBaseServerVersion:
      conflictMetadata.attemptedBaseServerVersion || null,
    collection,
    conflictDocument,
    conflictMetadata,
    currentServerVersion: conflictMetadata.currentServerVersion || null,
    detectedAt: conflictMetadata.rejectedAt || conflictMetadata.detectedAt || null,
    groupId: localDocument?.groupId || conflictDocument?.document?.groupId || null,
    localData: localDocument?.data || null,
    localDocument,
    localVersion: localDocument?.localVersion || null,
    outboxEvent,
    outboxEvents,
    rejectedAt: conflictMetadata.rejectedAt || null,
    remoteDocument: conflictDocument,
    serverVersion: localDocument?.serverVersion || null,
  };
};

const resolveConflictOutboxEvents = async ({
  collection,
  documentId,
  resolution,
}) => {
  const events = await findConflictOutboxForDocument({ collection, documentId });

  for (const event of events) {
    await markOutboxEventResolved(event.id, resolution);
  }

  return events.length;
};

export const resolveConflictPreferLocal = async ({
  collection,
  documentId,
} = {}) => {
  const details = await getConflictDetails({ collection, documentId });

  if (!details.localDocument) {
    throw new Error('Documento local no encontrado');
  }

  const pendingEvents = await getPendingOutboxEventsForDocument(
    collection,
    documentId,
  );

  if (!pendingEvents.length) {
    await addOutboxEvent(
      collection,
      documentId,
      details.localDocument.deletedAt ? 'delete' : 'update',
      {
        data: details.localDocument.data,
        id: documentId,
        remoteId: details.localDocument.remoteId,
      },
    );
  }

  const resolvedOutboxCount = await resolveConflictOutboxEvents({
    collection,
    documentId,
    resolution: {
      notes: 'Resolved by preferring local version.',
      resolution: 'preferLocal',
    },
  });
  const document = await updateSyncStatus(collection, documentId, 'pending');

  return {
    document,
    pendingOutboxCreated: pendingEvents.length === 0,
    resolution: 'preferLocal',
    resolvedOutboxCount,
  };
};

export const resolveConflictPreferRemote = async ({
  collection,
  documentId,
} = {}) => {
  const details = await getConflictDetails({ collection, documentId });
  const remoteDocument = details.remoteDocument;

  if (!remoteDocument) {
    throw new Error('Documento remoto de conflicto no disponible');
  }

  const document = await preferRemoteVersion(
    collection,
    documentId,
    remoteDocument,
    {
      groupId: details.groupId,
    },
  );
  const resolvedOutboxCount = await resolveConflictOutboxEvents({
    collection,
    documentId,
    resolution: {
      notes: 'Resolved by preferring remote version.',
      resolution: 'preferRemote',
    },
  });

  return {
    document,
    resolution: 'preferRemote',
    resolvedOutboxCount,
  };
};

export const markConflictResolvedManually = async ({
  collection,
  documentId,
  finalDocument,
  notes,
} = {}) => {
  if (!notes && !finalDocument) {
    throw new Error('notes o finalDocument requerido');
  }

  let document;

  if (finalDocument) {
    document = await saveDocument(collection, documentId, finalDocument, {
      groupId: finalDocument.groupId,
      syncStatus: 'pending',
    });
  } else {
    document = await updateSyncStatus(collection, documentId, 'pending');
  }

  const resolvedOutboxCount = await resolveConflictOutboxEvents({
    collection,
    documentId,
    resolution: {
      notes,
      resolution: 'manual',
      resolvedAt: nowIso(),
    },
  });

  return {
    document,
    resolution: 'manual',
    resolvedOutboxCount,
  };
};

export default {
  getConflictDetails,
  getConflictDocuments,
  getConflictOutboxEvents: getConflictOutboxEventList,
  getConflictSummary,
  getConflictsByCollection,
  markConflictResolvedManually,
  resolveConflictPreferLocal,
  resolveConflictPreferRemote,
};
