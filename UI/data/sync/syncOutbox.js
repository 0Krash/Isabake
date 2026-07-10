import { initDatabase } from '../db/database';
import { createLocalId } from '../db/localIds';
import { notifyAutoSyncFromLocalChange } from './autoSyncNotifier';

const nowIso = () => new Date().toISOString();

const serializePayload = (payload) => JSON.stringify(payload ?? {});

const parseOutboxEvent = (event) => {
  if (!event) {
    return null;
  }

  return {
    ...event,
    payload: JSON.parse(event.payload || '{}'),
  };
};

const notifyAutoSyncAfterOutboxWrite = (options = {}) => {
  if (options.notifyAutoSyncNeeded) {
    options.notifyAutoSyncNeeded('local_change');
    return;
  }

  notifyAutoSyncFromLocalChange('local_change');
};

export const addOutboxEvent = async (
  collection,
  documentId,
  operation,
  payload,
  options = {},
) => {
  const db = options.db || (await initDatabase());
  const id = createLocalId('outbox');

  await db.runAsync(
    `
      INSERT INTO sync_outbox (
        id,
        collection,
        documentId,
        operation,
        payload,
        createdAt,
        attempts,
        lastError,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, NULL, 'pending');
    `,
    [id, collection, documentId, operation, serializePayload(payload), nowIso()],
  );

  notifyAutoSyncAfterOutboxWrite(options);

  return id;
};

export const getPendingOutboxEvents = async (options = {}) => {
  const db = options.db || (await initDatabase());
  const events = await db.getAllAsync(
    `
      SELECT *
      FROM sync_outbox
      WHERE status = 'pending'
      ORDER BY createdAt ASC;
    `,
  );

  return events.map(parseOutboxEvent);
};

export const getPendingOutboxEventsForDocument = async (
  collection,
  documentId,
  options = {},
) => {
  const db = options.db || (await initDatabase());
  const events = await db.getAllAsync(
    `
      SELECT *
      FROM sync_outbox
      WHERE status = 'pending'
        AND collection = ?
        AND documentId = ?
      ORDER BY createdAt ASC;
    `,
    [collection, documentId],
  );

  return events.map(parseOutboxEvent);
};

export const getOutboxEventById = async (id, options = {}) => {
  const db = options.db || (await initDatabase());
  const event = await db.getFirstAsync(
    `
      SELECT *
      FROM sync_outbox
      WHERE id = ?;
    `,
    [id],
  );

  return parseOutboxEvent(event);
};

export const getPendingOutboxCountsByCollection = async (options = {}) => {
  const db = options.db || (await initDatabase());
  const rows = await db.getAllAsync(
    `
      SELECT collection, COUNT(*) AS count
      FROM sync_outbox
      WHERE status = 'pending'
      GROUP BY collection
      ORDER BY collection ASC;
    `,
  );

  return rows.reduce(
    (summary, row) => ({
      ...summary,
      [row.collection || 'unknown']: Number(row.count || 0),
    }),
    {},
  );
};

export const getFailedOutboxEvents = async (options = {}) => {
  const db = options.db || (await initDatabase());
  const events = await db.getAllAsync(
    `
      SELECT *
      FROM sync_outbox
      WHERE status = 'failed'
      ORDER BY createdAt ASC;
    `,
  );

  return events.map(parseOutboxEvent);
};

export const getFailedOutboxCountsByCollection = async (options = {}) => {
  const db = options.db || (await initDatabase());
  const rows = await db.getAllAsync(
    `
      SELECT collection, COUNT(*) AS count
      FROM sync_outbox
      WHERE status = 'failed'
      GROUP BY collection
      ORDER BY collection ASC;
    `,
  );

  return rows.reduce(
    (summary, row) => ({
      ...summary,
      [row.collection || 'unknown']: Number(row.count || 0),
    }),
    {},
  );
};

export const getConflictOutboxEvents = async (options = {}) => {
  const db = options.db || (await initDatabase());
  const events = await db.getAllAsync(
    `
      SELECT *
      FROM sync_outbox
      WHERE status = 'conflict'
      ORDER BY createdAt ASC;
    `,
  );

  return events.map(parseOutboxEvent);
};

export const getConflictOutboxCountsByCollection = async (options = {}) => {
  const db = options.db || (await initDatabase());
  const rows = await db.getAllAsync(
    `
      SELECT collection, COUNT(*) AS count
      FROM sync_outbox
      WHERE status = 'conflict'
      GROUP BY collection
      ORDER BY collection ASC;
    `,
  );

  return rows.reduce(
    (summary, row) => ({
      ...summary,
      [row.collection || 'unknown']: Number(row.count || 0),
    }),
    {},
  );
};

export const markOutboxEventAsDone = async (id, options = {}) => {
  const db = options.db || (await initDatabase());

  await db.runAsync(
    `
      UPDATE sync_outbox
      SET status = 'done',
          lastError = NULL
      WHERE id = ?;
    `,
    [id],
  );
};

export const markOutboxEventSynced = markOutboxEventAsDone;

export const markOutboxEventAsFailed = async (id, error, options = {}) => {
  const db = options.db || (await initDatabase());

  await db.runAsync(
    `
      UPDATE sync_outbox
      SET status = 'failed',
          lastError = ?
      WHERE id = ?;
    `,
    [String(error?.message || error || ''), id],
  );
};

export const markOutboxEventFailed = markOutboxEventAsFailed;

export const requeueOutboxEvent = async (id, options = {}) => {
  const db = options.db || (await initDatabase());

  await db.runAsync(
    `
      UPDATE sync_outbox
      SET status = 'pending',
          lastError = NULL
      WHERE id = ?;
    `,
    [id],
  );
};

export const markOutboxEventConflict = async (id, conflict, options = {}) => {
  const db = options.db || (await initDatabase());

  await db.runAsync(
    `
      UPDATE sync_outbox
      SET status = 'conflict',
          lastError = ?
      WHERE id = ?;
    `,
    [serializePayload(conflict), id],
  );
};

export const markOutboxEventResolved = async (
  id,
  resolution = {},
  options = {},
) => {
  const db = options.db || (await initDatabase());

  await db.runAsync(
    `
      UPDATE sync_outbox
      SET status = 'done',
          lastError = ?
      WHERE id = ?;
    `,
    [
      serializePayload({
        ...resolution,
        resolvedAt: resolution.resolvedAt || nowIso(),
      }),
      id,
    ],
  );
};

export const incrementOutboxAttempt = async (id, error, options = {}) => {
  const db = options.db || (await initDatabase());

  await db.runAsync(
    `
      UPDATE sync_outbox
      SET attempts = attempts + 1,
          lastError = ?,
          status = 'pending'
      WHERE id = ?;
    `,
    [String(error?.message || error || ''), id],
  );
};
