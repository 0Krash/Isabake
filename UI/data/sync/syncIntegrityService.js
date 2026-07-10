import {
  assignDocumentGroupId,
  getDocument,
} from '../db/documentStore';
import defaultSyncClient from './syncClient';
import {
  addOutboxEvent,
  markOutboxEventAsFailed,
  requeueOutboxEvent,
} from './syncOutbox';
import {
  finishSyncHistoryRun,
  safelyRecordSyncHistory,
  startSyncHistoryRun,
} from './syncHistoryService';
import {
  getIntegrityDocuments,
  getIntegrityOutboxEvents,
  getStaleOutboxCutoffIso,
  markDocumentPendingForRepair,
} from './syncIntegrityRepository';
import { SHARED_SYNC_COLLECTIONS, SYNC_STATUS } from './syncTypes';
import { getCurrentWorkspace } from '../workspace/workspaceRepository';

export const SYNC_REPAIR_SCOPES = {
  FULL: 'full_sync_repair',
  MISSING_BACKEND: 'missing_backend_only',
  OUTBOX: 'outbox_only',
  UNGROUPED: 'ungrouped_local_only',
};

const MINIMUM_COLLECTIONS = ['recipes', 'inventory', 'transactions'];
const REPAIRABLE_CODES_BY_SCOPE = {
  [SYNC_REPAIR_SCOPES.OUTBOX]: new Set([
    'deleted_doc_missing_delete_outbox',
    'failed_recoverable_outbox',
    'outbox_missing_document',
    'pending_doc_missing_outbox',
    'synced_doc_without_remote_id',
  ]),
  [SYNC_REPAIR_SCOPES.MISSING_BACKEND]: new Set([
    'backend_stale_version',
    'synced_doc_missing_backend',
  ]),
  [SYNC_REPAIR_SCOPES.UNGROUPED]: new Set(['local_doc_missing_groupId']),
};

REPAIRABLE_CODES_BY_SCOPE[SYNC_REPAIR_SCOPES.FULL] = new Set(
  Object.values(REPAIRABLE_CODES_BY_SCOPE).flatMap((codes) => [...codes]),
);

const nowIso = () => new Date().toISOString();

const normalizeCollections = (collections) =>
  Array.from(new Set(collections?.length ? collections : MINIMUM_COLLECTIONS));

const getDocumentKey = (collection, id) => `${collection}:${id}`;

const getOutboxKey = (event) =>
  getDocumentKey(event.collection, event.documentId);

const hasPendingOutbox = (events = [], document, operation = null) =>
  events.some(
    (event) =>
      event.status === 'pending' &&
      event.collection === document.collection &&
      event.documentId === document.id &&
      (!operation || event.operation === operation),
  );

const isConflictDocument = (document) =>
  document?.syncStatus === SYNC_STATUS.CONFLICT;

const createIssue = ({
  code,
  collection,
  localId,
  remoteId = null,
  repairable = false,
  severity = 'warning',
  safeMessage,
}) => ({
  code,
  collection,
  localId,
  remoteId,
  repairable,
  safeMessage,
  severity,
});

const getOperationForDocument = (document) => {
  if (document.deletedAt) {
    return 'delete';
  }

  return document.remoteId ? 'update' : 'create';
};

const resolveGroupId = async ({ groupId, workspace } = {}) => {
  if (groupId) {
    return groupId;
  }

  const currentWorkspace = workspace || (await getCurrentWorkspace());
  return currentWorkspace?.isRemote ? currentWorkspace.groupId : null;
};

const buildRemoteVerifyDocuments = (documents) =>
  documents
    .filter(
      (document) =>
        document.groupId &&
        document.remoteId &&
        document.syncStatus === SYNC_STATUS.SYNCED,
    )
    .map((document) => ({
      collection: document.collection,
      remoteId: document.remoteId,
      serverVersion: document.serverVersion || null,
    }));

const addRemoteVerificationIssues = async ({
  client,
  documents,
  groupId,
  issues,
  verifyRemote,
}) => {
  const documentsByRemoteKey = new Map(
    documents
      .filter((document) => document.remoteId)
      .map((document) => [
        getDocumentKey(document.collection, document.remoteId),
        document,
      ]),
  );
  const remoteDocuments = buildRemoteVerifyDocuments(documents);

  if (!verifyRemote || !remoteDocuments.length) {
    return {
      remoteCheckedCount: 0,
      remoteVerifyError: null,
    };
  }

  try {
    const response = await client.verifyRemoteDocuments({
      documents: remoteDocuments,
      groupId,
    });
    const results = Array.isArray(response.results) ? response.results : [];

    for (const result of results) {
      const document = documentsByRemoteKey.get(
        getDocumentKey(result.collection, result.remoteId),
      );

      if (!document || isConflictDocument(document)) {
        continue;
      }

      if (result.status === 'missing') {
        issues.push(
          createIssue({
            code: 'synced_doc_missing_backend',
            collection: document.collection,
            localId: document.id,
            remoteId: document.remoteId,
            repairable: true,
            safeMessage: 'El registro local esta marcado como respaldado, pero no existe en el backend.',
            severity: 'error',
          }),
        );
      } else if (result.status === 'deleted') {
        issues.push(
          createIssue({
            code: 'backend_tombstone_exists',
            collection: document.collection,
            localId: document.id,
            remoteId: document.remoteId,
            repairable: false,
            safeMessage: 'El backend tiene una eliminacion sincronizada; no se repara automaticamente.',
            severity: 'warning',
          }),
        );
      } else if (result.status === 'stale') {
        issues.push(
          createIssue({
            code: 'backend_stale_version',
            collection: document.collection,
            localId: document.id,
            remoteId: document.remoteId,
            repairable: true,
            safeMessage: 'El backend tiene una version anterior a la metadata local.',
            severity: 'warning',
          }),
        );
      }
    }

    return {
      remoteCheckedCount: remoteDocuments.length,
      remoteVerifyError: null,
    };
  } catch (error) {
    return {
      remoteCheckedCount: remoteDocuments.length,
      remoteVerifyError: String(error?.code || error?.message || 'remote_verify_failed'),
    };
  }
};

const inspectLocalState = ({
  activeGroupId,
  documents,
  outboxEvents,
  staleOutboxCutoffIso,
}) => {
  const issues = [];
  const documentsByKey = new Map(
    documents.map((document) => [getDocumentKey(document.collection, document.id), document]),
  );

  for (const document of documents) {
    const localId = document.id;

    if (!document.groupId) {
      issues.push(
        createIssue({
          code: 'local_doc_missing_groupId',
          collection: document.collection,
          localId,
          repairable: Boolean(activeGroupId) && !isConflictDocument(document),
          safeMessage: 'El registro local no tiene grupo compartido.',
          severity: activeGroupId ? 'error' : 'warning',
        }),
      );
    } else if (activeGroupId && document.groupId !== activeGroupId) {
      issues.push(
        createIssue({
          code: 'local_doc_groupId_mismatch',
          collection: document.collection,
          localId,
          repairable: false,
          safeMessage: 'El registro pertenece a otro workspace compartido.',
          severity: 'error',
        }),
      );
    }

    if (
      ['pending', 'failed'].includes(document.syncStatus) &&
      !hasPendingOutbox(outboxEvents, document)
    ) {
      issues.push(
        createIssue({
          code: 'pending_doc_missing_outbox',
          collection: document.collection,
          localId,
          remoteId: document.remoteId,
          repairable: !isConflictDocument(document),
          safeMessage: 'El registro tiene cambios locales sin evento pendiente de outbox.',
          severity: 'error',
        }),
      );
    }

    if (document.syncStatus === SYNC_STATUS.SYNCED && !document.remoteId) {
      issues.push(
        createIssue({
          code: 'synced_doc_without_remote_id',
          collection: document.collection,
          localId,
          repairable: !isConflictDocument(document),
          safeMessage: 'El registro esta marcado como respaldado pero no tiene remoteId.',
          severity: 'error',
        }),
      );
    }

    if (document.remoteId && !document.serverVersion && !document.deletedAt) {
      issues.push(
        createIssue({
          code: 'remote_doc_without_server_version',
          collection: document.collection,
          localId,
          remoteId: document.remoteId,
          repairable: false,
          safeMessage: 'El registro tiene remoteId pero no version de servidor.',
          severity: 'warning',
        }),
      );
    }

    if (
      document.deletedAt &&
      document.syncStatus === SYNC_STATUS.PENDING &&
      !hasPendingOutbox(outboxEvents, document, 'delete')
    ) {
      issues.push(
        createIssue({
          code: 'deleted_doc_missing_delete_outbox',
          collection: document.collection,
          localId,
          remoteId: document.remoteId,
          repairable: true,
          safeMessage: 'El registro eliminado localmente no tiene evento delete pendiente.',
          severity: 'error',
        }),
      );
    }
  }

  for (const event of outboxEvents) {
    const document = documentsByKey.get(getOutboxKey(event));

    if (!document) {
      issues.push(
        createIssue({
          code: 'outbox_missing_document',
          collection: event.collection,
          localId: event.documentId,
          repairable: event.status === 'pending',
          safeMessage: 'El outbox referencia un registro local inexistente.',
          severity: 'error',
        }),
      );
    }

    if (event.status === 'pending' && event.createdAt < staleOutboxCutoffIso) {
      issues.push(
        createIssue({
          code: 'pending_outbox_stale',
          collection: event.collection,
          localId: event.documentId,
          repairable: false,
          safeMessage: 'Hay un evento de outbox pendiente desde hace demasiado tiempo.',
          severity: 'warning',
        }),
      );
    }

    if (event.status === 'failed') {
      issues.push(
        createIssue({
          code: 'failed_recoverable_outbox',
          collection: event.collection,
          localId: event.documentId,
          repairable: Boolean(document) && !isConflictDocument(document),
          safeMessage: 'Hay un evento de outbox fallido que puede reintentarse.',
          severity: 'warning',
        }),
      );
    }
  }

  return issues;
};

const recordIntegrityHistory = async ({
  actionType,
  groupId,
  result,
  status = null,
}) =>
  safelyRecordSyncHistory(async () => {
    const run = await startSyncHistoryRun({
      actionType,
      groupId,
      triggerSource: 'manual',
    });

    await finishSyncHistoryRun({
      result,
      run,
      status: status || (result.ok ? 'success' : 'partial'),
    });
  });

export const checkSyncIntegrity = async ({
  client = defaultSyncClient,
  collections,
  db,
  groupId,
  recordHistory = true,
  staleOutboxMs,
  verifyRemote = false,
  workspace,
} = {}) => {
  const activeGroupId = await resolveGroupId({ groupId, workspace });
  const checkedCollections = normalizeCollections(collections);
  const [documents, outboxEvents] = await Promise.all([
    getIntegrityDocuments({
      collections: checkedCollections,
      db,
      groupId: activeGroupId,
      includeUngrouped: true,
    }),
    getIntegrityOutboxEvents({
      collections: checkedCollections,
      db,
    }),
  ]);
  const staleOutboxCutoffIso = getStaleOutboxCutoffIso({
    staleMs: staleOutboxMs,
  });
  const relevantOutbox = activeGroupId
    ? outboxEvents.filter((event) => {
        const document = documents.find(
          (item) =>
            item.collection === event.collection && item.id === event.documentId,
        );
        return !document || !document.groupId || document.groupId === activeGroupId;
      })
    : outboxEvents;
  const issues = inspectLocalState({
    activeGroupId,
    documents,
    outboxEvents: relevantOutbox,
    staleOutboxCutoffIso,
  });
  const remoteVerification = await addRemoteVerificationIssues({
    client,
    documents: documents.filter((document) => !activeGroupId || document.groupId === activeGroupId),
    groupId: activeGroupId,
    issues,
    verifyRemote: Boolean(verifyRemote && activeGroupId),
  });
  const report = {
    checkedCollections,
    groupId: activeGroupId,
    issues,
    localDocumentCount: documents.length,
    ok: issues.filter((issue) => issue.severity === 'error').length === 0,
    pendingOutboxCount: relevantOutbox.filter((event) => event.status === 'pending').length,
    remoteCheckedCount: remoteVerification.remoteCheckedCount,
    remoteVerifyError: remoteVerification.remoteVerifyError,
    repairableCount: issues.filter((issue) => issue.repairable).length,
  };

  if (recordHistory) {
    await recordIntegrityHistory({
      actionType: 'integrity_check',
      groupId: activeGroupId,
      result: report,
    });
  }

  return report;
};

const getRepairableIssues = (report, scope) => {
  const repairableCodes =
    REPAIRABLE_CODES_BY_SCOPE[scope] ||
    REPAIRABLE_CODES_BY_SCOPE[SYNC_REPAIR_SCOPES.OUTBOX];

  return report.issues.filter(
    (issue) => issue.repairable && repairableCodes.has(issue.code),
  );
};

const requeueDocumentForUpload = async (issue, options = {}) => {
  const document = await getDocument(issue.collection, issue.localId, {
    db: options.db,
    includeDeleted: true,
  });

  if (!document || isConflictDocument(document)) {
    return null;
  }

  await markDocumentPendingForRepair(issue.collection, issue.localId, options);
  return addOutboxEvent(
    issue.collection,
    issue.localId,
    getOperationForDocument(document),
    {
      id: issue.localId,
      remoteId: document.remoteId || null,
    },
    options,
  );
};

export const previewSyncRepair = async ({
  scope = SYNC_REPAIR_SCOPES.OUTBOX,
  ...options
} = {}) => {
  const report = await checkSyncIntegrity({
    ...options,
    recordHistory: false,
    verifyRemote:
      options.verifyRemote ?? [SYNC_REPAIR_SCOPES.MISSING_BACKEND, SYNC_REPAIR_SCOPES.FULL].includes(scope),
  });
  const repairableIssues = getRepairableIssues(report, scope);
  const preview = {
    groupId: report.groupId,
    issueCount: report.issues.length,
    ok: true,
    plannedActions: repairableIssues.map((issue) => ({
      code: issue.code,
      collection: issue.collection,
      localId: issue.localId,
      remoteId: issue.remoteId,
    })),
    repairableCount: repairableIssues.length,
    scope,
  };

  await recordIntegrityHistory({
    actionType: 'repair_preview',
    groupId: report.groupId,
    result: preview,
  });

  return preview;
};

export const runSyncRepair = async ({
  confirm = false,
  scope = SYNC_REPAIR_SCOPES.OUTBOX,
  ...options
} = {}) => {
  if (!confirm) {
    return {
      error: 'confirm_required',
      ok: false,
      repairedCount: 0,
      scope,
    };
  }

  const report = await checkSyncIntegrity({
    ...options,
    recordHistory: false,
    verifyRemote:
      options.verifyRemote ?? [SYNC_REPAIR_SCOPES.MISSING_BACKEND, SYNC_REPAIR_SCOPES.FULL].includes(scope),
  });
  const issues = getRepairableIssues(report, scope);
  const repaired = [];
  const failed = [];

  for (const issue of issues) {
    try {
      if (
        [
          'backend_stale_version',
          'deleted_doc_missing_delete_outbox',
          'pending_doc_missing_outbox',
          'synced_doc_missing_backend',
          'synced_doc_without_remote_id',
        ].includes(issue.code)
      ) {
        await requeueDocumentForUpload(issue, options);
      } else if (issue.code === 'failed_recoverable_outbox') {
        const events = await getIntegrityOutboxEvents({
          collections: [issue.collection],
          db: options.db,
        });
        const failedEvents = events.filter(
          (event) =>
            event.documentId === issue.localId && event.status === 'failed',
        );

        for (const event of failedEvents) {
          await requeueOutboxEvent(event.id, options);
        }
      } else if (issue.code === 'outbox_missing_document') {
        const events = await getIntegrityOutboxEvents({
          collections: [issue.collection],
          db: options.db,
        });
        const orphanedEvents = events.filter(
          (event) =>
            event.documentId === issue.localId && event.status === 'pending',
        );

        for (const event of orphanedEvents) {
          await markOutboxEventAsFailed(event.id, 'orphaned_outbox_event', options);
        }
      } else if (issue.code === 'local_doc_missing_groupId' && report.groupId) {
        await assignDocumentGroupId(
          issue.collection,
          issue.localId,
          report.groupId,
          options,
        );
      }

      repaired.push(issue);
    } catch (error) {
      failed.push({
        code: issue.code,
        collection: issue.collection,
        localId: issue.localId,
        reason: String(error?.message || 'repair_failed'),
      });
    }
  }

  const result = {
    failedCount: failed.length,
    groupId: report.groupId,
    ok: failed.length === 0,
    repairedCount: repaired.length,
    scope,
  };

  await recordIntegrityHistory({
    actionType: 'repair_run',
    groupId: report.groupId,
    result,
    status: result.ok ? 'success' : 'partial',
  });

  return {
    ...result,
    failed,
  };
};

export const repairMissingBackendDocuments = (options = {}) =>
  runSyncRepair({
    ...options,
    scope: SYNC_REPAIR_SCOPES.MISSING_BACKEND,
    verifyRemote: true,
  });

export default {
  checkSyncIntegrity,
  previewSyncRepair,
  repairMissingBackendDocuments,
  runSyncRepair,
  SYNC_REPAIR_SCOPES,
};
