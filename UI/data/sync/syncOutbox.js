import { initDatabase } from '../db/database';
import { createLocalId } from '../db/localIds';

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
