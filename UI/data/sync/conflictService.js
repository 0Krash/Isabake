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

const getConflictRemoteDocument = (conflict = {}) =>
  conflict.remoteDocument ||
  conflict.conflictDocument ||
  conflict.conflictMetadata?.remoteDocument ||
  conflict.conflictMetadata?.conflictDocument ||
  null;

const hasObjectPayload = (value) =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const hasRemotePayload = (remoteDocument) =>
  hasObjectPayload(remoteDocument) &&
  (hasObjectPayload(remoteDocument.document) ||
    hasObjectPayload(remoteDocument.data) ||
    Boolean(remoteDocument.deletedAt) ||
    Boolean(remoteDocument.remoteId) ||
    Boolean(remoteDocument.serverVersion));

export const isConflictResolvablePreferRemote = (conflict = {}) =>
  hasRemotePayload(getConflictRemoteDocument(conflict));

export const isConflictResolvablePreferLocal = (conflict = {}) => {
  if (conflict.localDocument) {
    return conflict.localData !== null && conflict.localData !== undefined;
  }

  return Boolean(conflict.hasLocalDocument && conflict.hasLocalData);
};

export const getConflictResolutionCapabilities = (conflict = {}) => {
  const resolvablePreferLocal = isConflictResolvablePreferLocal(conflict);
  const resolvablePreferRemote = isConflictResolvablePreferRemote(conflict);

  return {
    missingLocalDocument: !resolvablePreferLocal,
    missingRemoteDocument: !resolvablePreferRemote,
    resolvablePreferLocal,
    resolvablePreferRemote,
  };
};

const getUnresolvableReason = (conflict, resolutionType) => {
  if (resolutionType === 'preferRemote') {
    return isConflictResolvablePreferRemote(conflict)
      ? null
      : 'missing_remote_document';
  }

  if (resolutionType === 'preferLocal') {
    return isConflictResolvablePreferLocal(conflict)
      ? null
      : 'missing_local_document';
  }

  return 'unknown_resolution_type';
};

const sortLatestFirst = (conflicts = []) =>
  [...conflicts].sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt || left.detectedAt || '') || 0;
    const rightTime = Date.parse(right.updatedAt || right.detectedAt || '') || 0;

    return rightTime - leftTime;
  });

const toConflictSummaryItem = (document, outboxEvents = []) => {
  const outboxEvent =
    outboxEvents.find(
      (event) =>
        event.collection === document.collection &&
        event.documentId === document.id,
    ) || null;
  const conflictMetadata = parseMaybeJson(outboxEvent?.lastError) || {};
  const conflictDocument = conflictMetadata.conflictDocument || null;
  const item = {
    collection: document.collection,
    conflictDocument,
    conflictMetadata,
    groupId: document.groupId || null,
    hasLocalData: document.data !== null && document.data !== undefined,
    hasLocalDocument: true,
    localId: document.id,
    localVersion: document.localVersion,
    remoteDocument: conflictDocument,
    remoteId: document.remoteId || conflictDocument?.remoteId || null,
    serverVersion: document.serverVersion,
    syncStatus: document.syncStatus,
    updatedAt: document.updatedAt,
  };

  return {
    ...item,
    ...getConflictResolutionCapabilities(item),
  };
};

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
    documents: sortLatestFirst(
      documents.map((document) => toConflictSummaryItem(document, outboxEvents)),
    ),
    outboxByCollection: summarizeByCollection(outboxEvents),
    preferLocalResolvableCount: documents.filter((document) =>
      isConflictResolvablePreferLocal({
        hasLocalData: document.data !== null && document.data !== undefined,
        hasLocalDocument: true,
      }),
    ).length,
    preferRemoteResolvableCount: documents.filter((document) => {
      const item = toConflictSummaryItem(document, outboxEvents);
      return isConflictResolvablePreferRemote(item);
    }).length,
    resolvableConflictCount: documents.length,
    totalConflicts: documents.length,
    unresolvedMissingRemoteCount: documents.filter((document) => {
      const item = toConflictSummaryItem(document, outboxEvents);
      return !isConflictResolvablePreferRemote(item);
    }).length,
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

  const details = {
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
    localId: localDocument?.id || documentId,
    localVersion: localDocument?.localVersion || null,
    outboxEvent,
    outboxEvents,
    rejectedAt: conflictMetadata.rejectedAt || null,
    remoteDocument: conflictDocument,
    serverVersion: localDocument?.serverVersion || null,
    updatedAt: localDocument?.updatedAt || null,
  };

  return {
    ...details,
    ...getConflictResolutionCapabilities(details),
  };
};

export const getResolvableConflicts = async ({
  resolutionType = 'preferRemote',
} = {}) => {
  const summary = await getConflictSummary();
  const detailsList = await Promise.all(
    (summary.documents || []).map((conflict) =>
      getConflictDetails({
        collection: conflict.collection,
        documentId: conflict.localId,
      }),
    ),
  );

  return sortLatestFirst(
    detailsList.filter((conflict) => !getUnresolvableReason(conflict, resolutionType)),
  );
};

export const getResolvableConflictReport = async ({
  resolutionType = 'preferRemote',
} = {}) => {
  const summary = await getConflictSummary();
  const detailsList = await Promise.all(
    (summary.documents || []).map((conflict) =>
      getConflictDetails({
        collection: conflict.collection,
        documentId: conflict.localId,
      }),
    ),
  );
  const skippedConflicts = [];
  const resolvableConflicts = [];

  detailsList.forEach((conflict) => {
    const reason = getUnresolvableReason(conflict, resolutionType);

    if (reason) {
      skippedConflicts.push({
        collection: conflict.collection,
        localId: conflict.localDocument?.id || conflict.localId || null,
        reason,
      });
      return;
    }

    resolvableConflicts.push(conflict);
  });

  return {
    conflicts: sortLatestFirst(resolvableConflicts),
    skippedConflicts,
    summary,
  };
};

export const getLatestResolvableConflict = async ({
  resolutionType = 'preferRemote',
} = {}) => {
  const report = await getResolvableConflictReport({ resolutionType });

  return {
    conflict: report.conflicts[0] || null,
    report,
    summary: report.summary,
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
  getConflictResolutionCapabilities,
  getConflictDetails,
  getConflictDocuments,
  getConflictOutboxEvents: getConflictOutboxEventList,
  getConflictSummary,
  getConflictsByCollection,
  getLatestResolvableConflict,
  getResolvableConflictReport,
  getResolvableConflicts,
  isConflictResolvablePreferLocal,
  isConflictResolvablePreferRemote,
  markConflictResolvedManually,
  resolveConflictPreferLocal,
  resolveConflictPreferRemote,
};
