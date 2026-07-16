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

const hasGroupScope = (options = {}) =>
  Object.prototype.hasOwnProperty.call(options, 'groupId');

const getOutboxEventsByStatus = async (status, options = {}) => {
  const db = options.db || (await initDatabase());

  if (hasGroupScope(options) && !options.groupId) {
    return [];
  }

  const groupJoin = hasGroupScope(options)
    ? `
      INNER JOIN documents
        ON documents.collection = sync_outbox.collection
       AND documents.id = sync_outbox.documentId
       AND documents.groupId = ?
    `
    : '';
  const params = hasGroupScope(options)
    ? [options.groupId, status]
    : [status];
  const events = await db.getAllAsync(
    `
      SELECT sync_outbox.*
      FROM sync_outbox
      ${groupJoin}
      WHERE sync_outbox.status = ?
      ORDER BY sync_outbox.createdAt ASC;
    `,
    params,
  );

  return events.map(parseOutboxEvent);
};

const getOutboxCountsByStatus = async (status, options = {}) => {
  const db = options.db || (await initDatabase());

  if (hasGroupScope(options) && !options.groupId) {
    return {};
  }

  const groupJoin = hasGroupScope(options)
    ? `
      INNER JOIN documents
        ON documents.collection = sync_outbox.collection
       AND documents.id = sync_outbox.documentId
       AND documents.groupId = ?
    `
    : '';
  const params = hasGroupScope(options)
    ? [options.groupId, status]
    : [status];
  const rows = await db.getAllAsync(
    `
      SELECT sync_outbox.collection, COUNT(*) AS count
      FROM sync_outbox
      ${groupJoin}
      WHERE sync_outbox.status = ?
      GROUP BY sync_outbox.collection
      ORDER BY sync_outbox.collection ASC;
    `,
    params,
  );

  return rows.reduce(
    (summary, row) => ({
      ...summary,
      [row.collection || 'unknown']: Number(row.count || 0),
    }),
    {},
  );
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
  return getOutboxEventsByStatus('pending', options);
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
  return getOutboxCountsByStatus('pending', options);
};

export const getFailedOutboxEvents = async (options = {}) => {
  return getOutboxEventsByStatus('failed', options);
};

export const getFailedOutboxCountsByCollection = async (options = {}) => {
  return getOutboxCountsByStatus('failed', options);
};

export const getConflictOutboxEvents = async (options = {}) => {
  return getOutboxEventsByStatus('conflict', options);
};

export const getConflictOutboxCountsByCollection = async (options = {}) => {
  return getOutboxCountsByStatus('conflict', options);
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

export const deleteOutboxEventsByGroupId = async (groupId, options = {}) => {
  if (!groupId) {
    return 0;
  }

  const db = options.db || (await initDatabase());
  const result = await db.runAsync(
    `
      DELETE FROM sync_outbox
      WHERE EXISTS (
        SELECT 1
        FROM documents
        WHERE documents.collection = sync_outbox.collection
          AND documents.id = sync_outbox.documentId
          AND documents.groupId = ?
      );
    `,
    [groupId],
  );

  return Number(result?.changes || 0);
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
