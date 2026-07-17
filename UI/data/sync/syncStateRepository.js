import { initDatabase } from '../db/database';

const nowIso = () => new Date().toISOString();

const parseSyncState = (row) =>
  row
    ? {
        groupId: row.groupId,
        lastSyncCursor: row.lastSyncCursor || null,
        lastSyncedAt: row.lastSyncedAt || null,
        updatedAt: row.updatedAt,
      }
    : null;

export const getSyncState = async (groupId, options = {}) => {
  const db = options.db || (await initDatabase());
  const row = await db.getFirstAsync(
    `
      SELECT *
      FROM sync_state
      WHERE groupId = ?;
    `,
    [groupId],
  );

  return parseSyncState(row);
};

export const getLastSyncCursor = async (groupId, options = {}) => {
  const syncState = await getSyncState(groupId, options);

  return syncState?.lastSyncCursor || null;
};

export const storeLastSyncCursor = async (groupId, cursor, options = {}) => {
  const db = options.db || (await initDatabase());
  const updatedAt = nowIso();

  await db.runAsync(
    `
      INSERT INTO sync_state (
        groupId,
        lastSyncCursor,
        lastSyncedAt,
        updatedAt
      )
      VALUES (?, ?, ?, ?)
      ON CONFLICT(groupId) DO UPDATE SET
        lastSyncCursor = excluded.lastSyncCursor,
        lastSyncedAt = excluded.lastSyncedAt,
        updatedAt = excluded.updatedAt;
    `,
    [groupId, cursor || null, updatedAt, updatedAt],
  );

  return getSyncState(groupId, { db });
};

export const getAllSyncStates = async (options = {}) => {
  const db = options.db || (await initDatabase());
  const rows = await db.getAllAsync(
    `
      SELECT *
      FROM sync_state
      ORDER BY groupId ASC;
    `,
  );

  return rows.map(parseSyncState);
};

export default {
  getAllSyncStates,
  getLastSyncCursor,
  getSyncState,
  storeLastSyncCursor,
};
