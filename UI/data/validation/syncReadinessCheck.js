import {
  getDocumentsBySyncStatuses,
  getDocumentsReadyToSync,
  getLocalPrivateDocuments,
  getDocumentsMissingGroupId,
} from '../db/documentStore';
import {
  getConflictOutboxCountsByCollection,
  getConflictOutboxEvents,
  getFailedOutboxCountsByCollection,
  getFailedOutboxEvents,
  getPendingOutboxCountsByCollection,
  getPendingOutboxEvents,
} from '../sync/syncOutbox';
import { getAllSyncStates } from '../sync/syncStateRepository';

const summarizeDocument = (document) => ({
  collection: document.collection,
  deletedAt: document.deletedAt || null,
  groupId: document.groupId || null,
  localId: document.id,
  remoteId: document.remoteId || null,
  syncStatus: document.syncStatus,
  updatedAt: document.updatedAt,
});

const summarizeByCollection = (documents = []) =>
  documents.reduce((summary, document) => {
    summary[document.collection] = (summary[document.collection] || 0) + 1;
    return summary;
  }, {});

export const runSyncReadinessCheck = async () => {
  const checkedAt = new Date().toISOString();
  const [
    blockedMissingGroupIdDocuments,
    conflictOutboxByCollection,
    conflictOutboxEvents,
    failedOutboxByCollection,
    failedOutboxEvents,
    localPrivateDocuments,
    pendingOutboxByCollection,
    pendingOutboxEvents,
    readyToSyncDocuments,
    syncProblemDocuments,
    syncStates,
  ] = await Promise.all([
    getDocumentsMissingGroupId(),
    getConflictOutboxCountsByCollection(),
    getConflictOutboxEvents(),
    getFailedOutboxCountsByCollection(),
    getFailedOutboxEvents(),
    getLocalPrivateDocuments(),
    getPendingOutboxCountsByCollection(),
    getPendingOutboxEvents(),
    getDocumentsReadyToSync(),
    getDocumentsBySyncStatuses(['pending', 'failed', 'conflict']),
    getAllSyncStates(),
  ]);
  const documentsBySyncStatus = syncProblemDocuments.reduce(
    (summary, document) => {
      const status = document.syncStatus || 'unknown';
      summary[status] = (summary[status] || 0) + 1;
      return summary;
    },
    {},
  );
  const warnings = [];

  if (blockedMissingGroupIdDocuments.length > 0) {
    warnings.push({
      code: 'shared_documents_missing_groupId',
      count: blockedMissingGroupIdDocuments.length,
      message:
        'Shared records without groupId are blocked from sync until assigned to a workspace.',
    });
  }

  if ((documentsBySyncStatus.conflict || 0) > 0) {
    warnings.push({
      code: 'sync_conflicts_present',
      count: documentsBySyncStatus.conflict,
      message: 'Some local records are marked as sync conflicts.',
    });
  }

  if (failedOutboxEvents.length > 0) {
    warnings.push({
      code: 'failed_outbox_events_present',
      count: failedOutboxEvents.length,
      message: 'Some outbox events failed and need retry or inspection.',
    });
  }

  if (conflictOutboxEvents.length > 0) {
    warnings.push({
      code: 'conflict_outbox_events_present',
      count: conflictOutboxEvents.length,
      message: 'Some outbox events are marked as sync conflicts.',
    });
  }

  return {
    checkedAt,
    blockedFromSyncBecauseGroupIdMissing: blockedMissingGroupIdDocuments.map(
      summarizeDocument,
    ),
    blockedFromSyncBecauseGroupIdMissingByCollection: summarizeByCollection(
      blockedMissingGroupIdDocuments,
    ),
    blockedFromSyncBecauseGroupIdMissingCount: blockedMissingGroupIdDocuments.length,
    conflictDocuments: syncProblemDocuments
      .filter((document) => document.syncStatus === 'conflict')
      .map(summarizeDocument),
    conflictDocumentsByCollection: summarizeByCollection(
      syncProblemDocuments.filter((document) => document.syncStatus === 'conflict'),
    ),
    conflictDocumentCount: documentsBySyncStatus.conflict || 0,
    conflictOutboxByCollection,
    conflictOutboxCount: conflictOutboxEvents.length,
    conflictOutboxEvents: conflictOutboxEvents.map((event) => ({
      attempts: event.attempts,
      collection: event.collection,
      documentId: event.documentId,
      eventId: event.id,
      lastError: event.lastError,
      operation: event.operation,
      status: event.status,
    })),
    documentsMissingGroupId: blockedMissingGroupIdDocuments.map(summarizeDocument),
    documentsMissingGroupIdCount: blockedMissingGroupIdDocuments.length,
    failedOutboxByCollection,
    failedOutboxCount: failedOutboxEvents.length,
    failedOutboxEvents: failedOutboxEvents.map((event) => ({
      attempts: event.attempts,
      collection: event.collection,
      documentId: event.documentId,
      eventId: event.id,
      lastError: event.lastError,
      operation: event.operation,
      status: event.status,
    })),
    lastSyncByGroup: syncStates.reduce((summary, syncState) => {
      summary[syncState.groupId] = {
        lastSyncCursor: syncState.lastSyncCursor,
        lastSyncedAt: syncState.lastSyncedAt,
        updatedAt: syncState.updatedAt,
      };
      return summary;
    }, {}),
    localPrivateDocumentsByCollection: summarizeByCollection(localPrivateDocuments),
    localPrivateDocumentsCount: localPrivateDocuments.length,
    ok: warnings.length === 0,
    pendingOutboxByCollection,
    pendingOutboxCount: pendingOutboxEvents.length,
    pendingOutboxEvents: pendingOutboxEvents.map((event) => ({
      attempts: event.attempts,
      collection: event.collection,
      documentId: event.documentId,
      eventId: event.id,
      lastError: event.lastError,
      operation: event.operation,
      status: event.status,
    })),
    readyToSyncByCollection: summarizeByCollection(readyToSyncDocuments),
    readyToSyncCount: readyToSyncDocuments.length,
    resolvableConflictCount: documentsBySyncStatus.conflict || 0,
    syncDocumentsByStatus: documentsBySyncStatus,
    syncProblemDocuments: syncProblemDocuments.map(summarizeDocument),
    warningCount: warnings.length,
    warnings,
  };
};

export default runSyncReadinessCheck;
