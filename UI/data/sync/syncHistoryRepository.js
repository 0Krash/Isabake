import { initDatabase } from '../db/database';
import { createLocalId } from '../db/localIds';

const DEFAULT_HISTORY_LIMIT = 100;
const nowIso = () => new Date().toISOString();

const nullableNumber = (value) =>
  value === null || value === undefined ? null : Number(value || 0);

const normalizeLimit = (limit = DEFAULT_HISTORY_LIMIT) =>
  Math.max(1, Math.min(500, Number(limit || DEFAULT_HISTORY_LIMIT)));

const mapHistoryRow = (row) =>
  row
    ? {
        ...row,
        acceptedCount: Number(row.acceptedCount || 0),
        conflictCount: Number(row.conflictCount || 0),
        durationMs: nullableNumber(row.durationMs),
        failedCount: Number(row.failedCount || 0),
        pendingAfter: nullableNumber(row.pendingAfter),
        pendingBefore: nullableNumber(row.pendingBefore),
        pulledCount: Number(row.pulledCount || 0),
        pushedCount: Number(row.pushedCount || 0),
        rejectedCount: Number(row.rejectedCount || 0),
        skippedCount: Number(row.skippedCount || 0),
      }
    : null;

export const insertSyncHistoryRecord = async (record, options = {}) => {
  const db = options.db || (await initDatabase());
  const timestamp = record.createdAt || nowIso();
  const id = record.id || createLocalId('sync_history');

  await db.runAsync(
    `
      INSERT INTO sync_history (
        id,
        runId,
        groupId,
        workspaceName,
        actionType,
        triggerSource,
        status,
        startedAt,
        finishedAt,
        durationMs,
        pushedCount,
        pulledCount,
        acceptedCount,
        rejectedCount,
        conflictCount,
        failedCount,
        skippedCount,
        pendingBefore,
        pendingAfter,
        errorCode,
        safeErrorMessage,
        authState,
        networkState,
        createdAt,
        updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      id,
      record.runId,
      record.groupId || null,
      record.workspaceName || null,
      record.actionType,
      record.triggerSource,
      record.status,
      record.startedAt,
      record.finishedAt || null,
      nullableNumber(record.durationMs),
      Number(record.pushedCount || 0),
      Number(record.pulledCount || 0),
      Number(record.acceptedCount || 0),
      Number(record.rejectedCount || 0),
      Number(record.conflictCount || 0),
      Number(record.failedCount || 0),
      Number(record.skippedCount || 0),
      nullableNumber(record.pendingBefore),
      nullableNumber(record.pendingAfter),
      record.errorCode || null,
      record.safeErrorMessage || null,
      record.authState || 'unknown',
      record.networkState || 'unknown',
      timestamp,
      record.updatedAt || timestamp,
    ],
  );

  return {
    ...record,
    createdAt: timestamp,
    id,
    updatedAt: record.updatedAt || timestamp,
  };
};

export const updateSyncHistoryRecord = async (runId, updates, options = {}) => {
  const db = options.db || (await initDatabase());
  const updatedAt = updates.updatedAt || nowIso();

  await db.runAsync(
    `
      UPDATE sync_history
      SET status = ?,
          finishedAt = ?,
          durationMs = ?,
          pushedCount = ?,
          pulledCount = ?,
          acceptedCount = ?,
          rejectedCount = ?,
          conflictCount = ?,
          failedCount = ?,
          skippedCount = ?,
          pendingAfter = ?,
          errorCode = ?,
          safeErrorMessage = ?,
          authState = ?,
          networkState = ?,
          updatedAt = ?
      WHERE runId = ?;
    `,
    [
      updates.status,
      updates.finishedAt || null,
      nullableNumber(updates.durationMs),
      Number(updates.pushedCount || 0),
      Number(updates.pulledCount || 0),
      Number(updates.acceptedCount || 0),
      Number(updates.rejectedCount || 0),
      Number(updates.conflictCount || 0),
      Number(updates.failedCount || 0),
      Number(updates.skippedCount || 0),
      nullableNumber(updates.pendingAfter),
      updates.errorCode || null,
      updates.safeErrorMessage || null,
      updates.authState || 'unknown',
      updates.networkState || 'unknown',
      updatedAt,
      runId,
    ],
  );
};

export const getRecentSyncHistory = async ({ limit = 25, db } = {}) => {
  const database = db || (await initDatabase());
  const rows = await database.getAllAsync(
    `
      SELECT *
      FROM sync_history
      ORDER BY startedAt DESC, createdAt DESC
      LIMIT ?;
    `,
    [normalizeLimit(limit)],
  );

  return rows.map(mapHistoryRow).filter(Boolean);
};

export const getLatestSyncHistory = async (options = {}) => {
  const [latest] = await getRecentSyncHistory({ ...options, limit: 1 });
  return latest || null;
};

export const getSyncHistoryCount = async (options = {}) => {
  const db = options.db || (await initDatabase());
  const row = await db.getFirstAsync('SELECT COUNT(*) AS count FROM sync_history;');
  return Number(row?.count || 0);
};

export const recoverStartedSyncHistoryOlderThan = async ({
  errorCode = 'sync_timeout',
  finishedAt = nowIso(),
  olderThanIso,
  safeErrorMessage = 'La sincronizacion tardo demasiado.',
  db,
} = {}) => {
  if (!olderThanIso) {
    return {
      recoveredCount: 0,
    };
  }

  const database = db || (await initDatabase());
  const result = await database.runAsync(
    `
      UPDATE sync_history
      SET status = 'failed',
          finishedAt = ?,
          durationMs = MAX(0, strftime('%s', ?) * 1000 - strftime('%s', startedAt) * 1000),
          errorCode = ?,
          safeErrorMessage = ?,
          updatedAt = ?
      WHERE status = 'started'
        AND startedAt < ?;
    `,
    [
      finishedAt,
      finishedAt,
      errorCode,
      safeErrorMessage,
      finishedAt,
      olderThanIso,
    ],
  );

  return {
    recoveredCount: Number(result?.changes || 0),
  };
};

export const clearOldSyncHistory = async ({ keepLatest = DEFAULT_HISTORY_LIMIT, db } = {}) => {
  const database = db || (await initDatabase());

  await database.runAsync(
    `
      DELETE FROM sync_history
      WHERE id NOT IN (
        SELECT id
        FROM sync_history
        ORDER BY startedAt DESC, createdAt DESC
        LIMIT ?
      );
    `,
    [normalizeLimit(keepLatest)],
  );
};

export default {
  clearOldSyncHistory,
  getLatestSyncHistory,
  getRecentSyncHistory,
  getSyncHistoryCount,
  insertSyncHistoryRecord,
  recoverStartedSyncHistoryOlderThan,
  updateSyncHistoryRecord,
};
