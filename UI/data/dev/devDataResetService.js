import { initDatabase } from '../db/database';
import { recoverStaleAutoSyncState } from '../sync/autoSyncService';
import { recoverStaleSyncHistoryRuns } from '../sync/syncHistoryService';

export const DEV_RESET_SCOPES = {
  CONFLICTS_ONLY: 'conflicts_only',
  FULL_LOCAL_DEV_RESET: 'full_local_dev_reset',
  OUTBOX_FAILED_ONLY: 'outbox_failed_only',
  STALE_SYNC_ONLY: 'stale_sync_only',
  TEST_DATA_ONLY: 'test_data_only',
};

export const DEV_TEST_PREFIXES = [
  'smoke_test',
  'rollback_smoke_test',
  'recipe_sale_smoke',
  'phase_',
  'dev_check',
  'auth_workspace_dev',
  'conflict_dev',
];

const DEV_ONLY_ERROR = 'dev_reset_is_dev_only';
const FULL_RESET_CONFIRM_ERROR =
  'full_local_dev_reset requires explicit scope and confirm: true.';
const CONFIRM_ERROR = 'runDevDataReset requires confirm: true.';

const isDevRuntime = () => typeof __DEV__ === 'undefined' || Boolean(__DEV__);

const normalizeScope = (scope) => scope || DEV_RESET_SCOPES.TEST_DATA_ONLY;

const likeParams = (prefixes = DEV_TEST_PREFIXES) =>
  prefixes.map((prefix) => `%${prefix}%`);

const prefixedWhere = (fields, prefixes = DEV_TEST_PREFIXES) =>
  prefixes
    .map(() => fields.map((field) => `${field} LIKE ?`).join(' OR '))
    .map((group) => `(${group})`)
    .join(' OR ');

const prefixedParams = (fields, prefixes = DEV_TEST_PREFIXES) =>
  prefixes.flatMap((prefix) => fields.map(() => `%${prefix}%`));

const getCount = async (db, sql, params = []) => {
  const row = await db.getFirstAsync(sql, params);

  return Number(row?.count || 0);
};

const deleteWhere = async ({ db, dryRun, params = [], table, where }) => {
  const count = await getCount(
    db,
    `SELECT COUNT(*) AS count FROM ${table} WHERE ${where};`,
    params,
  );

  if (!dryRun && count > 0) {
    await db.runAsync(`DELETE FROM ${table} WHERE ${where};`, params);
  }

  return count;
};

const getDevWhere = () => ({
  documents: {
    params: prefixedParams(['id', 'remoteId', 'groupId', 'data']),
    where: prefixedWhere(['id', 'remoteId', 'groupId', 'data']),
  },
  outbox: {
    params: prefixedParams(['id', 'documentId', 'payload', 'lastError']),
    where: prefixedWhere(['id', 'documentId', 'payload', 'lastError']),
  },
  history: {
    params: prefixedParams([
      'runId',
      'groupId',
      'workspaceName',
      'safeErrorMessage',
      'errorCode',
    ]),
    where: prefixedWhere([
      'runId',
      'groupId',
      'workspaceName',
      'safeErrorMessage',
      'errorCode',
    ]),
  },
  syncState: {
    params: likeParams(),
    where: prefixedWhere(['groupId']),
  },
});

const createEmptyResult = ({ dryRun, scope }) => ({
  deleted: false,
  dryRun,
  scope,
  success: true,
});

const runTestDataCleanup = async ({ db, dryRun, scope }) => {
  const where = getDevWhere();
  const documents = await deleteWhere({
    db,
    dryRun,
    params: where.documents.params,
    table: 'documents',
    where: where.documents.where,
  });
  const outbox = await deleteWhere({
    db,
    dryRun,
    params: where.outbox.params,
    table: 'sync_outbox',
    where: where.outbox.where,
  });
  const history = await deleteWhere({
    db,
    dryRun,
    params: where.history.params,
    table: 'sync_history',
    where: where.history.where,
  });
  const syncState = await deleteWhere({
    db,
    dryRun,
    params: where.syncState.params,
    table: 'sync_state',
    where: where.syncState.where,
  });

  return {
    ...createEmptyResult({ dryRun, scope }),
    deleted: !dryRun,
    counts: {
      documents,
      syncHistory: history,
      syncOutbox: outbox,
      syncState,
    },
  };
};

const runFailedOutboxCleanup = async ({ db, dryRun, scope }) => {
  const where = getDevWhere().outbox;
  const failedOutbox = await deleteWhere({
    db,
    dryRun,
    params: where.params,
    table: 'sync_outbox',
    where: `status = 'failed' AND (${where.where})`,
  });

  return {
    ...createEmptyResult({ dryRun, scope }),
    deleted: !dryRun,
    counts: {
      failedOutbox,
    },
  };
};

const runConflictCleanup = async ({ db, dryRun, scope }) => {
  const where = getDevWhere();
  const totalDocumentConflicts = await getCount(
    db,
    "SELECT COUNT(*) AS count FROM documents WHERE syncStatus = 'conflict';",
  );
  const totalOutboxConflicts = await getCount(
    db,
    "SELECT COUNT(*) AS count FROM sync_outbox WHERE status = 'conflict';",
  );
  const devDocumentConflicts = await deleteWhere({
    db,
    dryRun,
    params: where.documents.params,
    table: 'documents',
    where: `syncStatus = 'conflict' AND (${where.documents.where})`,
  });
  const devOutboxConflicts = await deleteWhere({
    db,
    dryRun,
    params: where.outbox.params,
    table: 'sync_outbox',
    where: `status = 'conflict' AND (${where.outbox.where})`,
  });

  return {
    ...createEmptyResult({ dryRun, scope }),
    deleted: !dryRun,
    counts: {
      devDocumentConflicts,
      devOutboxConflicts,
      realDocumentConflicts: Math.max(
        0,
        totalDocumentConflicts - devDocumentConflicts,
      ),
      realOutboxConflicts: Math.max(0, totalOutboxConflicts - devOutboxConflicts),
      totalDocumentConflicts,
      totalOutboxConflicts,
    },
  };
};

const runStaleSyncCleanup = async ({
  dryRun,
  recoverAutoSync = recoverStaleAutoSyncState,
  recoverHistory = recoverStaleSyncHistoryRuns,
  scope,
}) => {
  if (dryRun) {
    return {
      ...createEmptyResult({ dryRun, scope }),
      counts: {
        staleAutoSyncRecovered: 0,
        staleHistoryRecovered: 0,
      },
      note: 'dry_run_does_not_recover_stale_sync_state',
    };
  }

  const [historyRecovery, autoSyncRecovery] = await Promise.all([
    recoverHistory(),
    recoverAutoSync(),
  ]);

  return {
    ...createEmptyResult({ dryRun, scope }),
    counts: {
      staleAutoSyncRecovered: autoSyncRecovery?.staleInFlightRecovered ? 1 : 0,
      staleHistoryRecovered: Number(historyRecovery?.recoveredCount || 0),
    },
    deleted: false,
  };
};

const runFullLocalReset = async ({ db, dryRun, scope }) => {
  const tables = ['sync_outbox', 'sync_history', 'sync_state', 'documents'];
  const counts = {};

  for (const table of tables) {
    counts[table] = await getCount(db, `SELECT COUNT(*) AS count FROM ${table};`);

    if (!dryRun && counts[table] > 0) {
      await db.runAsync(`DELETE FROM ${table};`);
    }
  }

  return {
    ...createEmptyResult({ dryRun, scope }),
    deleted: !dryRun,
    counts,
  };
};

const runScopedReset = async ({
  db,
  dryRun,
  recoverAutoSync,
  recoverHistory,
  scope,
}) => {
  if (scope === DEV_RESET_SCOPES.TEST_DATA_ONLY) {
    return runTestDataCleanup({ db, dryRun, scope });
  }

  if (scope === DEV_RESET_SCOPES.STALE_SYNC_ONLY) {
    return runStaleSyncCleanup({
      dryRun,
      recoverAutoSync,
      recoverHistory,
      scope,
    });
  }

  if (scope === DEV_RESET_SCOPES.CONFLICTS_ONLY) {
    return runConflictCleanup({ db, dryRun, scope });
  }

  if (scope === DEV_RESET_SCOPES.OUTBOX_FAILED_ONLY) {
    return runFailedOutboxCleanup({ db, dryRun, scope });
  }

  if (scope === DEV_RESET_SCOPES.FULL_LOCAL_DEV_RESET) {
    return runFullLocalReset({ db, dryRun, scope });
  }

  return {
    blocked: true,
    error: `Unknown dev reset scope: ${scope}`,
    success: false,
  };
};

export const previewDevDataReset = async ({
  db,
  initDb = initDatabase,
  scope = DEV_RESET_SCOPES.TEST_DATA_ONLY,
  ...options
} = {}) => {
  if (!isDevRuntime()) {
    return {
      blocked: true,
      error: DEV_ONLY_ERROR,
      success: false,
    };
  }

  const database = db || (await initDb());

  return runScopedReset({
    ...options,
    db: database,
    dryRun: true,
    scope: normalizeScope(scope),
  });
};

export const runDevDataReset = async ({
  confirm = false,
  db,
  initDb = initDatabase,
  scope = DEV_RESET_SCOPES.TEST_DATA_ONLY,
  ...options
} = {}) => {
  const normalizedScope = normalizeScope(scope);

  if (!isDevRuntime()) {
    return {
      blocked: true,
      error: DEV_ONLY_ERROR,
      success: false,
    };
  }

  if (!confirm) {
    return {
      blocked: true,
      error:
        normalizedScope === DEV_RESET_SCOPES.FULL_LOCAL_DEV_RESET
          ? FULL_RESET_CONFIRM_ERROR
          : CONFIRM_ERROR,
      success: false,
    };
  }

  if (
    normalizedScope === DEV_RESET_SCOPES.FULL_LOCAL_DEV_RESET &&
    scope !== DEV_RESET_SCOPES.FULL_LOCAL_DEV_RESET
  ) {
    return {
      blocked: true,
      error: FULL_RESET_CONFIRM_ERROR,
      success: false,
    };
  }

  const database = db || (await initDb());

  return runScopedReset({
    ...options,
    db: database,
    dryRun: false,
    scope: normalizedScope,
  });
};

export default {
  DEV_RESET_SCOPES,
  DEV_TEST_PREFIXES,
  previewDevDataReset,
  runDevDataReset,
};
