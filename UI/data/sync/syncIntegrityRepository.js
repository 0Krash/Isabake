import { initDatabase } from '../db/database';
import { SHARED_SYNC_COLLECTIONS } from './syncTypes';

const DEFAULT_STALE_OUTBOX_MS = 24 * 60 * 60 * 1000;

const parseDocument = (row) =>
  row
    ? {
        ...row,
        data: JSON.parse(row.data || '{}'),
      }
    : null;

const parseOutbox = (row) =>
  row
    ? {
        ...row,
        payload: JSON.parse(row.payload || '{}'),
      }
    : null;

const placeholdersFor = (items) => items.map(() => '?').join(', ');

export const getIntegrityDocuments = async ({
  collections = SHARED_SYNC_COLLECTIONS,
  db,
  groupId,
  includeUngrouped = true,
} = {}) => {
  const database = db || (await initDatabase());
  const sharedCollections = collections.length ? collections : SHARED_SYNC_COLLECTIONS;
  const placeholders = placeholdersFor(sharedCollections);
  const where = [`collection IN (${placeholders})`];
  const params = [...sharedCollections];

  if (groupId) {
    where.push(
      includeUngrouped
        ? '(groupId = ? OR groupId IS NULL OR groupId = "")'
        : 'groupId = ?',
    );
    params.push(groupId);
  }

  const rows = await database.getAllAsync(
    `
      SELECT *
      FROM documents
      WHERE ${where.join(' AND ')}
      ORDER BY collection ASC, updatedAt ASC;
    `,
    params,
  );

  return rows.map(parseDocument);
};

export const getIntegrityOutboxEvents = async ({
  collections = SHARED_SYNC_COLLECTIONS,
  db,
} = {}) => {
  const database = db || (await initDatabase());
  const sharedCollections = collections.length ? collections : SHARED_SYNC_COLLECTIONS;
  const rows = await database.getAllAsync(
    `
      SELECT *
      FROM sync_outbox
      WHERE collection IN (${placeholdersFor(sharedCollections)})
      ORDER BY createdAt ASC;
    `,
    sharedCollections,
  );

  return rows.map(parseOutbox);
};

export const markDocumentPendingForRepair = async (
  collection,
  id,
  options = {},
) => {
  const database = options.db || (await initDatabase());
  const updatedAt = options.updatedAt || new Date().toISOString();

  await database.runAsync(
    `
      UPDATE documents
      SET syncStatus = 'pending',
          updatedAt = ?,
          localVersion = localVersion + 1
      WHERE collection = ?
        AND id = ?;
    `,
    [updatedAt, collection, id],
  );
};

export const getStaleOutboxCutoffIso = ({
  now = Date.now(),
  staleMs = DEFAULT_STALE_OUTBOX_MS,
} = {}) => new Date(now - staleMs).toISOString();

export default {
  getIntegrityDocuments,
  getIntegrityOutboxEvents,
  getStaleOutboxCutoffIso,
  markDocumentPendingForRepair,
};
