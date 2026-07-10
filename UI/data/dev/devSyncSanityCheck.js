import { getFreshAuthSession } from '../auth/authService';
import {
  getDocument,
  saveDocument,
} from '../db/documentStore';
import { createLocalId } from '../db/localIds';
import inventoryRepository from '../repositories/inventoryRepository';
import recipeRepository from '../repositories/recipeRepository';
import transactionRepository from '../repositories/transactionRepository';
import { getCurrentWorkspace } from '../workspace/workspaceRepository';
import {
  getOutboxEventById,
  getPendingOutboxEventsForDocument,
} from '../sync/syncOutbox';
import defaultSyncClient from '../sync/syncClient';
import {
  getAutoSyncDecisionTrace,
  getAutoSyncDiagnostics,
  notifyAutoSyncNeeded,
  startAutoSync,
  setAutoSyncEnabled,
} from '../sync/autoSyncService';
import { AUTO_SYNC_DEFAULTS } from '../sync/autoSyncConfig';
import { runSync } from '../sync/syncService';
import {
  finishSyncHistoryRun,
  getLatestSyncHistory,
  getSyncHistoryWorkspaceName,
  safelyRecordSyncHistory,
  startSyncHistoryRun,
} from '../sync/syncHistoryService';

const SANITY_COLLECTION = 'recipes';
const SANITY_PREFIX = 'dev_check_sync_sanity';
const BUSINESS_SANITY_PREFIX = 'dev_check_business_sync';
const AUTO_SYNC_BUSINESS_PREFIX = 'dev_check_auto_sync_business';

const nowIso = () => new Date().toISOString();

const makeResult = ({
  details = {},
  error = null,
  failedStep = null,
  name = 'syncSanityCheck',
  ok,
  skipped = false,
} = {}) => ({
  checkedAt: nowIso(),
  details,
  error,
  failedStep,
  name,
  ok: Boolean(ok),
  skipped,
});

const getSafeSessionState = (session = {}) => ({
  hasSession: Boolean(session),
  sessionState: session?.sessionState || null,
  userId: session?.userId || null,
});

export const runSyncSanityCheck = async ({
  client,
  collection = SANITY_COLLECTION,
  createId = createLocalId,
  getDoc = getDocument,
  getLatestHistory = getLatestSyncHistory,
  getOutboxById = getOutboxEventById,
  getOutboxForDocument = getPendingOutboxEventsForDocument,
  getSession = getFreshAuthSession,
  getWorkspace = getCurrentWorkspace,
  groupId,
  runSyncFn = runSync,
  saveDoc = saveDocument,
  startHistory = startSyncHistoryRun,
  finishHistory = finishSyncHistoryRun,
} = {}) => {
  let session = null;

  try {
    session = await getSession();
  } catch (error) {
    return makeResult({
      details: {
        session: getSafeSessionState(null),
      },
      error: 'auth_required',
      failedStep: 'auth_required',
      ok: false,
    });
  }

  const workspace = await getWorkspace().catch(() => null);
  const resolvedGroupId = groupId || workspace?.groupId;

  if (!workspace?.isRemote || !resolvedGroupId) {
    return makeResult({
      details: {
        session: getSafeSessionState(session),
        workspaceMode: workspace?.isRemote ? 'shared' : 'local',
      },
      error: 'shared_workspace_required',
      failedStep: 'shared_workspace_required',
      ok: false,
    });
  }

  const localId = createId(SANITY_PREFIX);
  const data = {
    cost: 0,
    ingredients: [],
    localId,
    name: `${SANITY_PREFIX}_${Date.now()}`,
    recipeId: localId,
    servings: 1,
    steps: [],
    type: 'Dev check',
  };

  const createdDocument = await saveDoc(collection, localId, data, {
    groupId: resolvedGroupId,
  });
  const outboxBefore = await getOutboxForDocument(collection, localId);
  const outboxEventIds = outboxBefore.map((event) => event.id);

  if (!createdDocument?.groupId || !outboxBefore.length) {
    return makeResult({
      details: {
        groupId: resolvedGroupId,
        hasGroupId: Boolean(createdDocument?.groupId),
        localId,
        outboxEventCount: outboxBefore.length,
      },
      error: 'local_setup_failed',
      failedStep: 'local_setup',
      ok: false,
    });
  }

  const historyRun = await safelyRecordSyncHistory(() =>
    startHistory({
      actionType: 'full_sync',
      authState: 'authenticated',
      groupId: resolvedGroupId,
      pendingBefore: outboxBefore.length,
      triggerSource: 'dev_check',
      workspaceName: getSyncHistoryWorkspaceName(workspace),
    }),
  );
  const syncResult = await runSyncFn({
    client,
    groupId: resolvedGroupId,
  });
  const syncedDocument = await getDoc(collection, localId, {
    includeDeleted: true,
  });
  const outboxAfter = await Promise.all(
    outboxEventIds.map((eventId) => getOutboxById(eventId)),
  );
  const historyStatus = syncResult?.ok ? 'success' : 'failed';

  await safelyRecordSyncHistory(() =>
    finishHistory({
      authState: 'authenticated',
      pendingAfter: outboxAfter.filter((event) => event?.status === 'pending')
        .length,
      result: syncResult,
      run: historyRun,
      status: historyStatus,
    }),
  );
  const latestHistory = await Promise.resolve(getLatestHistory()).catch(
    () => null,
  );

  const outboxDone = outboxAfter.every((event) => event?.status === 'done');
  const documentSynced =
    syncedDocument?.syncStatus === 'synced' &&
    Boolean(syncedDocument.remoteId) &&
    Boolean(syncedDocument.serverVersion);
  const ok = Boolean(syncResult?.ok && outboxDone && documentSynced);

  return makeResult({
    details: {
      backendVerification: 'manual_check_mongodb_syncdocuments',
      collection,
      documentSynced,
      groupId: resolvedGroupId,
      historyStatus: historyStatus,
      latestHistoryStatus: latestHistory?.status || null,
      localId,
      outboxDone,
      outboxEventCount: outboxBefore.length,
      remoteIdPresent: Boolean(syncedDocument?.remoteId),
      serverVersionPresent: Boolean(syncedDocument?.serverVersion),
      syncAcceptedCount: Number(syncResult?.push?.accepted?.length || 0),
      syncOk: Boolean(syncResult?.ok),
    },
    error: ok ? null : 'sync_sanity_check_failed',
    failedStep: ok ? null : 'sync_verification',
    ok,
  });
};

const getRequiredSharedContext = async ({ getSession, getWorkspace, groupId }) => {
  let session = null;

  try {
    session = await getSession();
  } catch (error) {
    return {
      error: 'auth_required',
      failedStep: 'auth_required',
      session: null,
    };
  }

  const workspace = await getWorkspace().catch(() => null);
  const resolvedGroupId = groupId || workspace?.groupId;

  if (!workspace?.isRemote || !resolvedGroupId) {
    return {
      error: 'shared_workspace_required',
      failedStep: 'shared_workspace_required',
      session,
      workspace,
    };
  }

  return {
    groupId: resolvedGroupId,
    session,
    workspace,
  };
};

const createBusinessSanityRecords = async ({
  createId,
  groupId,
  inventoryRepo,
  prefix = BUSINESS_SANITY_PREFIX,
  recipeRepo,
  transactionRepo,
}) => {
  const timestamp = Date.now();
  const recipeId = createId(`${prefix}_recipe`);
  const inventoryId = createId(`${prefix}_inventory`);
  const transactionId = createId(`${prefix}_transaction`);
  const recipe = await recipeRepo.create(
    {
      cost: 0,
      ingredients: [],
      name: `${prefix}_recipe_${timestamp}`,
      recipeId,
      servings: 1,
      steps: [],
      type: 'Dev check',
    },
    {
      groupId,
      id: recipeId,
    },
  );
  const inventory = await inventoryRepo.create(
    {
      category: 'Dev check',
      inventoryId,
      lots: [],
      minimumStock: 0,
      name: `${prefix}_inventory_${timestamp}`,
      notes: '',
      storage: 'Dev',
    },
    {
      groupId,
      id: inventoryId,
    },
  );
  const transaction = await transactionRepo.create(
    {
      amount: 1,
      category: 'Dev check',
      description: `${prefix}_transaction_${timestamp}`,
      selectedDate: nowIso(),
      transactionId,
      transactionType: 'income',
    },
    {
      groupId,
      id: transactionId,
    },
  );

  return [
    {
      collection: 'recipes',
      document: recipe,
      localId: recipeId,
    },
    {
      collection: 'inventory',
      document: inventory,
      localId: inventoryId,
    },
    {
      collection: 'transactions',
      document: transaction,
      localId: transactionId,
    },
  ];
};

export const runBusinessSyncSanityCheck = async ({
  client = defaultSyncClient,
  createId = createLocalId,
  getDoc = getDocument,
  getOutboxById = getOutboxEventById,
  getOutboxForDocument = getPendingOutboxEventsForDocument,
  getSession = getFreshAuthSession,
  getWorkspace = getCurrentWorkspace,
  groupId,
  inventoryRepo = inventoryRepository,
  recipeRepo = recipeRepository,
  runSyncFn = runSync,
  transactionRepo = transactionRepository,
} = {}) => {
  const context = await getRequiredSharedContext({
    getSession,
    getWorkspace,
    groupId,
  });

  if (context.error) {
    return makeResult({
      details: {
        session: getSafeSessionState(context.session),
        workspaceMode: context.workspace?.isRemote ? 'shared' : 'local',
      },
      error: context.error,
      failedStep: context.failedStep,
      name: 'businessSyncSanityCheck',
      ok: false,
    });
  }

  const records = await createBusinessSanityRecords({
    createId,
    groupId: context.groupId,
    inventoryRepo,
    recipeRepo,
    transactionRepo,
  });
  const outboxBefore = [];

  for (const record of records) {
    const outbox = await getOutboxForDocument(record.collection, record.localId);
    outboxBefore.push(...outbox);

    if (!record.document?.groupId || !outbox.length) {
      return makeResult({
        details: {
          collection: record.collection,
          groupId: context.groupId,
          hasGroupId: Boolean(record.document?.groupId),
          localId: record.localId,
          outboxEventCount: outbox.length,
        },
        error: 'business_local_setup_failed',
        failedStep: 'business_local_setup',
        name: 'businessSyncSanityCheck',
        ok: false,
      });
    }
  }

  const syncResult = await runSyncFn({
    client,
    groupId: context.groupId,
  });
  const outboxAfter = await Promise.all(
    outboxBefore.map((event) => getOutboxById(event.id)),
  );
  const syncedDocuments = await Promise.all(
    records.map((record) =>
      getDoc(record.collection, record.localId, {
        includeDeleted: true,
      }),
    ),
  );
  const verifyDocuments = syncedDocuments.map((document) => ({
    collection: document.collection,
    remoteId: document.remoteId,
    serverVersion: document.serverVersion,
  }));
  let backendVerification;

  try {
    if (!client?.verifyRemoteDocuments) {
      throw new Error('verify_remote_documents_unavailable');
    }

    backendVerification = await client.verifyRemoteDocuments({
      documents: verifyDocuments,
      groupId: context.groupId,
    });
  } catch (error) {
    return makeResult({
      details: {
        groupId: context.groupId,
        outboxEventCount: outboxBefore.length,
        syncOk: Boolean(syncResult?.ok),
      },
      error: 'backend_verify_unavailable',
      failedStep: 'backend_verify',
      name: 'businessSyncSanityCheck',
      ok: false,
    });
  }
  const backendOk = (backendVerification.results || []).every(
    (result) => result.status === 'ok',
  );
  const outboxDone = outboxAfter.every((event) => event?.status === 'done');
  const documentsSynced = syncedDocuments.every(
    (document) =>
      document?.groupId === context.groupId &&
      document.syncStatus === 'synced' &&
      Boolean(document.remoteId) &&
      Boolean(document.serverVersion),
  );
  const ok = Boolean(syncResult?.ok && outboxDone && documentsSynced && backendOk);

  return makeResult({
    details: {
      backendOk,
      collections: records.map((record) => record.collection),
      documentsSynced,
      groupId: context.groupId,
      localIds: records.map((record) => record.localId),
      outboxDone,
      outboxEventCount: outboxBefore.length,
      syncAcceptedCount: Number(syncResult?.push?.accepted?.length || 0),
      syncOk: Boolean(syncResult?.ok),
    },
    error: ok ? null : 'business_sync_sanity_check_failed',
    failedStep: ok ? null : 'business_sync_verification',
    name: 'businessSyncSanityCheck',
    ok,
  });
};

const defaultWaitForAutoSync = () =>
  new Promise((resolve) => {
    setTimeout(resolve, AUTO_SYNC_DEFAULTS.debounceMs + 250);
  });

export const runAutoSyncBusinessWriteCheck = async ({
  client = defaultSyncClient,
  createId = createLocalId,
  getDiagnostics = getAutoSyncDiagnostics,
  getDoc = getDocument,
  getLatestHistory = getLatestSyncHistory,
  getOutboxById = getOutboxEventById,
  getOutboxForDocument = getPendingOutboxEventsForDocument,
  getSession = getFreshAuthSession,
  getWorkspace = getCurrentWorkspace,
  groupId,
  inventoryRepo = inventoryRepository,
  recipeRepo = recipeRepository,
  setAutoSync = setAutoSyncEnabled,
  transactionRepo = transactionRepository,
  waitForAutoSync = defaultWaitForAutoSync,
} = {}) => {
  const context = await getRequiredSharedContext({
    getSession,
    getWorkspace,
    groupId,
  });

  if (context.error) {
    return makeResult({
      details: {
        session: getSafeSessionState(context.session),
        workspaceMode: context.workspace?.isRemote ? 'shared' : 'local',
      },
      error: context.error,
      failedStep: context.failedStep,
      name: 'autoSyncBusinessWriteCheck',
      ok: false,
    });
  }

  await setAutoSync(true);

  const records = await createBusinessSanityRecords({
    createId,
    groupId: context.groupId,
    inventoryRepo,
    prefix: AUTO_SYNC_BUSINESS_PREFIX,
    recipeRepo,
    transactionRepo,
  });
  const outboxBefore = [];

  for (const record of records) {
    const outbox = await getOutboxForDocument(record.collection, record.localId);
    outboxBefore.push(...outbox);

    if (!record.document?.groupId || !outbox.length) {
      return makeResult({
        details: {
          collection: record.collection,
          groupId: context.groupId,
          hasGroupId: Boolean(record.document?.groupId),
          localId: record.localId,
          outboxEventCount: outbox.length,
        },
        error: 'no_outbox',
        failedStep: 'outbox_pending',
        name: 'autoSyncBusinessWriteCheck',
        ok: false,
      });
    }
  }

  const outboxEventIds = outboxBefore.map((event) => event.id);

  const scheduledDiagnostics = await getDiagnostics().catch(() => null);
  const notified =
    scheduledDiagnostics?.lastNotifyReason === 'local_change' ||
    scheduledDiagnostics?.lastAutoSyncReason === 'local_change';
  const scheduledOrRunning = Boolean(
    scheduledDiagnostics?.scheduled ||
      scheduledDiagnostics?.inFlight ||
      scheduledDiagnostics?.lastRunStartedAt,
  );

  if (!notified) {
    return makeResult({
      details: {
        autoSyncState: scheduledDiagnostics?.autoSyncState || null,
        localIds: records.map((record) => record.localId),
        outboxEventCount: outboxBefore.length,
      },
      error: 'no_autoSync_notification',
      failedStep: 'auto_sync_notification',
      name: 'autoSyncBusinessWriteCheck',
      ok: false,
    });
  }

  if (!scheduledOrRunning) {
    return makeResult({
      details: {
        autoSyncState: scheduledDiagnostics?.autoSyncState || null,
        lastSkippedReason: scheduledDiagnostics?.lastSkippedReason || null,
        localIds: records.map((record) => record.localId),
        pendingOutboxCount: scheduledDiagnostics?.pendingOutboxCount ?? null,
      },
      error: 'no_autoSync_schedule',
      failedStep: 'auto_sync_schedule',
      name: 'autoSyncBusinessWriteCheck',
      ok: false,
    });
  }

  await waitForAutoSync();

  const diagnosticsAfterRun = await getDiagnostics().catch(() => null);

  if (diagnosticsAfterRun?.lastSkippedReason) {
    return makeResult({
      details: {
        autoSyncState: diagnosticsAfterRun.autoSyncState || null,
        lastSkippedReason: diagnosticsAfterRun.lastSkippedReason,
        networkState: diagnosticsAfterRun.networkState || null,
      },
      error: 'skipped_by_guard',
      failedStep: 'auto_sync_guard',
      name: 'autoSyncBusinessWriteCheck',
      ok: false,
    });
  }

  if (
    diagnosticsAfterRun?.lastSyncHistoryStatus &&
    !['success', 'syncing', 'scheduled'].includes(
      diagnosticsAfterRun.lastSyncHistoryStatus,
    )
  ) {
    return makeResult({
      details: {
        autoSyncState: diagnosticsAfterRun.autoSyncState || null,
        lastErrorCode: diagnosticsAfterRun.lastErrorCode || null,
        lastSyncHistoryStatus: diagnosticsAfterRun.lastSyncHistoryStatus,
      },
      error: 'runSync_failed',
      failedStep: 'auto_sync_run',
      name: 'autoSyncBusinessWriteCheck',
      ok: false,
    });
  }

  if (!diagnosticsAfterRun?.lastRunStartedAt && !diagnosticsAfterRun?.inFlight) {
    return makeResult({
      details: {
        autoSyncState: diagnosticsAfterRun?.autoSyncState || null,
        localIds: records.map((record) => record.localId),
      },
      error: 'autoSync_run_missing',
      failedStep: 'auto_sync_run',
      name: 'autoSyncBusinessWriteCheck',
      ok: false,
    });
  }

  const outboxAfter = await Promise.all(
    outboxEventIds.map((eventId) => getOutboxById(eventId)),
  );
  const syncedDocuments = await Promise.all(
    records.map((record) =>
      getDoc(record.collection, record.localId, {
        includeDeleted: true,
      }),
    ),
  );
  const latestHistory = await Promise.resolve(getLatestHistory()).catch(
    () => null,
  );
  const outboxDone = outboxAfter.every((event) => event?.status === 'done');
  const documentsSynced = syncedDocuments.every(
    (document) =>
      document?.groupId === context.groupId &&
      document?.syncStatus === 'synced' &&
      Boolean(document.remoteId) &&
      Boolean(document.serverVersion),
  );

  if (!outboxDone) {
    return makeResult({
      details: {
        localIds: records.map((record) => record.localId),
        outboxStatuses: outboxAfter.map((event) => event?.status || 'missing'),
      },
      error: 'outbox_not_done',
      failedStep: 'outbox_done',
      name: 'autoSyncBusinessWriteCheck',
      ok: false,
    });
  }

  if (!documentsSynced) {
    return makeResult({
      details: {
        localIds: records.map((record) => record.localId),
        syncedCount: syncedDocuments.filter(
          (document) => document?.syncStatus === 'synced',
        ).length,
      },
      error: 'local_doc_not_synced',
      failedStep: 'local_doc_synced',
      name: 'autoSyncBusinessWriteCheck',
      ok: false,
    });
  }

  let backendOk = null;

  if (client?.verifyRemoteDocuments) {
    const backendVerification = await client
      .verifyRemoteDocuments({
        documents: syncedDocuments.map((document, index) => ({
          collection: document.collection || records[index]?.collection,
          remoteId: document.remoteId,
          serverVersion: document.serverVersion,
        })),
        groupId: context.groupId,
      })
      .catch(() => null);

    backendOk = (backendVerification?.results || []).every(
      (result) => result.status === 'ok',
    );

    if (!backendOk) {
      return makeResult({
        details: {
          backendOk: false,
          localIds: records.map((record) => record.localId),
        },
        error: 'backend_verify_missing',
        failedStep: 'backend_verify',
        name: 'autoSyncBusinessWriteCheck',
        ok: false,
      });
    }
  }

  const ok = Boolean(outboxDone && documentsSynced);

  return makeResult({
    details: {
      backendOk,
      collections: records.map((record) => record.collection),
      documentsSynced,
      groupId: context.groupId,
      historyStatus: latestHistory?.status || diagnosticsAfterRun?.lastSyncHistoryStatus || null,
      lastRunFinishedAt: diagnosticsAfterRun?.lastRunFinishedAt || null,
      lastRunStartedAt: diagnosticsAfterRun?.lastRunStartedAt || null,
      localIds: records.map((record) => record.localId),
      outboxDone,
      outboxEventCount: outboxBefore.length,
    },
    error: ok ? null : 'auto_sync_business_write_check_failed',
    failedStep: ok ? null : 'auto_sync_verification',
    name: 'autoSyncBusinessWriteCheck',
    ok,
  });
};

export const runBusinessWriteAutoSyncCheck = runAutoSyncBusinessWriteCheck;

const mapTraceSkipFailure = (reason) => {
  if (reason === 'auto_sync_disabled') {
    return 'skipped_auto_sync_disabled';
  }

  if (reason === 'no_auth' || reason === 'auth_required') {
    return 'skipped_no_auth';
  }

  if (
    reason === 'no_shared_workspace' ||
    reason === 'workspace_required' ||
    reason === 'local_only_mode'
  ) {
    return 'skipped_no_shared_workspace';
  }

  if (reason === 'conflicts_pending') {
    return 'skipped_conflicts_pending';
  }

  if (reason === 'backend_unreachable') {
    return 'skipped_backend_unreachable';
  }

  return reason ? `skipped_${reason}` : 'guard_not_evaluated';
};

export const runAutoSyncDecisionTraceCheck = async ({
  createId = createLocalId,
  getLatestHistory = getLatestSyncHistory,
  getOutboxForDocument = getPendingOutboxEventsForDocument,
  getSession = getFreshAuthSession,
  getTrace = getAutoSyncDecisionTrace,
  getWorkspace = getCurrentWorkspace,
  notifyAutoSync = notifyAutoSyncNeeded,
  recipeRepo = recipeRepository,
  setAutoSync = setAutoSyncEnabled,
  startAutoSyncService = startAutoSync,
  waitForAutoSync = defaultWaitForAutoSync,
} = {}) => {
  const context = await getRequiredSharedContext({
    getSession,
    getWorkspace,
  });

  if (context.error) {
    return makeResult({
      details: {
        session: getSafeSessionState(context.session),
        workspaceMode: context.workspace?.isRemote ? 'shared' : 'local',
      },
      error:
        context.error === 'auth_required'
          ? 'skipped_no_auth'
          : 'skipped_no_shared_workspace',
      failedStep: context.failedStep,
      name: 'autoSyncDecisionTraceCheck',
      ok: false,
    });
  }

  await setAutoSync(true);
  startAutoSyncService({ appState: 'active' });

  const localId = createId('dev_check_auto_sync_trace');
  await recipeRepo.create(
    {
      cost: 0,
      ingredients: [],
      name: `dev_check_auto_sync_trace_${Date.now()}`,
      recipeId: localId,
      servings: 1,
      steps: [],
      type: 'Dev check',
    },
    {
      groupId: context.groupId,
      id: localId,
    },
  );

  const outbox = await getOutboxForDocument('recipes', localId);

  if (!outbox.length) {
    return makeResult({
      details: {
        localId,
      },
      error: 'no_pending_outbox',
      failedStep: 'pending_outbox',
      name: 'autoSyncDecisionTraceCheck',
      ok: false,
    });
  }

  const schedule = notifyAutoSync('local_change');
  const scheduledTrace = getTrace();

  if (scheduledTrace.serviceInitialized !== true) {
    return makeResult({
      error: 'notifier_not_initialized',
      failedStep: 'service_initialized',
      name: 'autoSyncDecisionTraceCheck',
      ok: false,
    });
  }

  if (scheduledTrace.lastNotifyReason !== 'local_change') {
    return makeResult({
      error: 'notification_not_recorded',
      failedStep: 'notification',
      name: 'autoSyncDecisionTraceCheck',
      ok: false,
    });
  }

  if (!schedule?.scheduled && !schedule?.pending) {
    return makeResult({
      details: {
        lastSkippedReason: scheduledTrace.lastSkippedReason || null,
      },
      error: 'debounce_not_scheduled',
      failedStep: 'debounce_schedule',
      name: 'autoSyncDecisionTraceCheck',
      ok: false,
    });
  }

  await waitForAutoSync();

  const trace = getTrace();
  const latestHistory = await Promise.resolve(getLatestHistory()).catch(
    () => null,
  );

  if (!trace.lastDebounceFiredAt) {
    return makeResult({
      error: 'debounce_not_fired',
      failedStep: 'debounce_fire',
      name: 'autoSyncDecisionTraceCheck',
      ok: false,
    });
  }

  if (!trace.lastGuardEvaluationAt) {
    return makeResult({
      error: 'guard_not_evaluated',
      failedStep: 'guard_evaluation',
      name: 'autoSyncDecisionTraceCheck',
      ok: false,
    });
  }

  if (trace.lastDecision === 'skipped') {
    return makeResult({
      details: {
        historyStatus: latestHistory?.status || null,
        lastSkippedReason: trace.lastSkippedReason,
        trace,
      },
      error: mapTraceSkipFailure(trace.lastSkippedReason),
      failedStep: 'guard_decision',
      name: 'autoSyncDecisionTraceCheck',
      ok: false,
      skipped: true,
    });
  }

  if (!trace.lastRunStartedAt) {
    return makeResult({
      details: {
        trace,
      },
      error: 'sync_not_called',
      failedStep: 'sync_call',
      name: 'autoSyncDecisionTraceCheck',
      ok: false,
    });
  }

  const ok = trace.lastRunStatus === 'success';

  return makeResult({
    details: {
      historyStatus: latestHistory?.status || null,
      localId,
      outboxEventCount: outbox.length,
      trace,
    },
    error: ok ? null : 'sync_failed',
    failedStep: ok ? null : 'sync_result',
    name: 'autoSyncDecisionTraceCheck',
    ok,
  });
};

export default {
  runAutoSyncBusinessWriteCheck,
  runAutoSyncDecisionTraceCheck,
  runBusinessWriteAutoSyncCheck,
  runBusinessSyncSanityCheck,
  runSyncSanityCheck,
};
