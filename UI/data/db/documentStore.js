import { initDatabase } from './database';
import { getLocalDeviceId } from './localIds';
import { addOutboxEvent } from '../sync/syncOutbox';
import { SHARED_SYNC_COLLECTIONS } from '../sync/syncTypes';

const DEFAULT_COLLECTION_ORDER_BY = 'updatedAt';
const ORDERABLE_DOCUMENT_FIELDS = new Set([
  'collection',
  'createdAt',
  'groupId',
  'id',
  'syncStatus',
  'updatedAt',
]);

const nowIso = () => new Date().toISOString();

const serializeData = (data) => JSON.stringify(data ?? {});

const parseDocument = (row) => {
  if (!row) {
    return null;
  }

  return {
    ...row,
    data: JSON.parse(row.data || '{}'),
  };
};

const normalizeOrderDirection = (order) =>
  String(order || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

const normalizeOrderBy = (orderBy) =>
  ORDERABLE_DOCUMENT_FIELDS.has(orderBy)
    ? orderBy
    : DEFAULT_COLLECTION_ORDER_BY;

const getExistingDocument = async (db, collection, id) =>
  db.getFirstAsync(
    `
      SELECT *
      FROM documents
      WHERE collection = ?
        AND id = ?;
    `,
    [collection, id],
  );

export { initDatabase };

export const saveDocument = async (collection, id, data, options = {}) => {
  const db = options.db || (await initDatabase());
  const existingDocument = await getExistingDocument(db, collection, id);
  const createdAt = existingDocument?.createdAt || options.createdAt || nowIso();
  const updatedAt = options.updatedAt || nowIso();
  const syncStatus = options.syncStatus || 'pending';
  const remoteId =
    options.remoteId !== undefined
      ? options.remoteId
      : existingDocument?.remoteId || null;
  const groupId =
    options.groupId !== undefined
      ? options.groupId
      : existingDocument?.groupId || null;
  const serverVersion =
    options.serverVersion !== undefined
      ? options.serverVersion
      : existingDocument?.serverVersion || null;
  const deviceId =
    options.deviceId !== undefined
      ? options.deviceId
      : existingDocument?.deviceId || (await getLocalDeviceId({ db }));

  await db.runAsync(
    `
      INSERT INTO documents (
        collection,
        id,
        remoteId,
        groupId,
        data,
        createdAt,
        updatedAt,
        deletedAt,
        localVersion,
        serverVersion,
        syncStatus,
        deviceId
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, ?, ?)
      ON CONFLICT(collection, id) DO UPDATE SET
        remoteId = excluded.remoteId,
        groupId = excluded.groupId,
        data = excluded.data,
        updatedAt = excluded.updatedAt,
        deletedAt = NULL,
        localVersion = documents.localVersion + 1,
        serverVersion = excluded.serverVersion,
        syncStatus = excluded.syncStatus,
        deviceId = excluded.deviceId;
    `,
    [
      collection,
      id,
      remoteId,
      groupId,
      serializeData(data),
      createdAt,
      updatedAt,
      serverVersion,
      syncStatus,
      deviceId,
    ],
  );

  if (!options.skipOutbox) {
    await addOutboxEvent(
      collection,
      id,
      existingDocument ? 'update' : 'create',
      {
        data,
        id,
        remoteId,
      },
      { db },
    );
  }

  return getDocument(collection, id, { db, includeDeleted: true });
};

export const getDocument = async (collection, id, options = {}) => {
  const db = options.db || (await initDatabase());
  const includeDeleted = Boolean(options.includeDeleted);
  const row = await db.getFirstAsync(
    `
      SELECT *
      FROM documents
      WHERE collection = ?
        AND id = ?
        ${includeDeleted ? '' : 'AND deletedAt IS NULL'};
    `,
    [collection, id],
  );

  return parseDocument(row);
};

export const getCollection = async (collection, options = {}) => {
  const db = options.db || (await initDatabase());
  const where = ['collection = ?'];
  const params = [collection];

  if (!options.includeDeleted) {
    where.push('deletedAt IS NULL');
  }

  if (options.groupId !== undefined) {
    where.push('groupId = ?');
    params.push(options.groupId);
  }

  if (options.syncStatus !== undefined) {
    where.push('syncStatus = ?');
    params.push(options.syncStatus);
  }

  const orderBy = normalizeOrderBy(options.orderBy);
  const order = normalizeOrderDirection(options.order);
  const limit = Number(options.limit);
  const offset = Number(options.offset);
  const paginationSql = [
    Number.isFinite(limit) && limit > 0 ? `LIMIT ${Math.floor(limit)}` : '',
    Number.isFinite(offset) && offset > 0
      ? `OFFSET ${Math.floor(offset)}`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const rows = await db.getAllAsync(
    `
      SELECT *
      FROM documents
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy} ${order}
      ${paginationSql};
    `,
    params,
  );

  return rows.map(parseDocument);
};

export const softDeleteDocument = async (collection, id, options = {}) => {
  const db = options.db || (await initDatabase());
  const deletedAt = options.deletedAt || nowIso();

  await db.runAsync(
    `
      UPDATE documents
      SET deletedAt = ?,
          updatedAt = ?,
          localVersion = localVersion + 1,
          syncStatus = 'pending'
      WHERE collection = ?
        AND id = ?;
    `,
    [deletedAt, deletedAt, collection, id],
  );

  if (!options.skipOutbox) {
    await addOutboxEvent(collection, id, 'delete', { id }, { db });
  }

  return getDocument(collection, id, { db, includeDeleted: true });
};

export const hardDeleteDocument = async (collection, id, options = {}) => {
  const db = options.db || (await initDatabase());

  await db.runAsync(
    `
      DELETE FROM documents
      WHERE collection = ?
        AND id = ?;
    `,
    [collection, id],
  );
};

export const updateSyncStatus = async (collection, id, syncStatus, options = {}) => {
  const db = options.db || (await initDatabase());

  await db.runAsync(
    `
      UPDATE documents
      SET syncStatus = ?,
          updatedAt = ?
      WHERE collection = ?
        AND id = ?;
    `,
    [syncStatus, nowIso(), collection, id],
  );

  return getDocument(collection, id, { db, includeDeleted: true });
};

export const markDocumentSynced = async (
  collection,
  id,
  { remoteId, serverVersion, syncedAt } = {},
  options = {},
) => {
  const db = options.db || (await initDatabase());

  await db.runAsync(
    `
      UPDATE documents
      SET remoteId = COALESCE(?, remoteId),
          serverVersion = COALESCE(?, serverVersion),
          syncStatus = 'synced',
          updatedAt = COALESCE(?, updatedAt)
      WHERE collection = ?
        AND id = ?;
    `,
    [remoteId ?? null, serverVersion ?? null, syncedAt ?? null, collection, id],
  );

  return getDocument(collection, id, { db, includeDeleted: true });
};

export const markDocumentConflict = async (
  collection,
  id,
  { serverVersion } = {},
  options = {},
) => {
  const db = options.db || (await initDatabase());

  await db.runAsync(
    `
      UPDATE documents
      SET serverVersion = COALESCE(?, serverVersion),
          syncStatus = 'conflict',
          updatedAt = ?
      WHERE collection = ?
        AND id = ?;
    `,
    [serverVersion ?? null, nowIso(), collection, id],
  );

  return getDocument(collection, id, { db, includeDeleted: true });
};

export const getConflictDocuments = async (options = {}) =>
  getDocumentsBySyncStatuses('conflict', options);

export const markConflictResolvedManually = async (
  collection,
  id,
  options = {},
) => updateSyncStatus(collection, id, options.syncStatus || 'pending', options);

export const preferLocalVersion = async (collection, id, options = {}) =>
  updateSyncStatus(collection, id, 'pending', options);

export const preferRemoteVersion = async (
  collection,
  id,
  remoteDocument,
  options = {},
) =>
  saveRemoteDocument(
    collection,
    id,
    {
      data: remoteDocument?.document || remoteDocument?.data || {},
      deletedAt: remoteDocument?.deletedAt || null,
      deviceId: remoteDocument?.document?.deviceId || null,
      groupId: remoteDocument?.document?.groupId || options.groupId || null,
      remoteId: remoteDocument?.remoteId || remoteDocument?.document?.remoteId,
      serverVersion:
        remoteDocument?.serverVersion || remoteDocument?.document?.serverVersion,
      updatedAt: remoteDocument?.updatedAt || nowIso(),
    },
    {
      ...options,
      skipOutbox: true,
    },
  );

export const saveRemoteDocument = async (
  collection,
  localId,
  { data, deletedAt, deviceId, groupId, remoteId, serverVersion, updatedAt } = {},
  options = {},
) => {
  const db = options.db || (await initDatabase());
  const id = String(localId || remoteId);
  const existingDocument = await getExistingDocument(db, collection, id);
  const createdAt = existingDocument?.createdAt || updatedAt || nowIso();
  const nextUpdatedAt = updatedAt || nowIso();

  await db.runAsync(
    `
      INSERT INTO documents (
        collection,
        id,
        remoteId,
        groupId,
        data,
        createdAt,
        updatedAt,
        deletedAt,
        localVersion,
        serverVersion,
        syncStatus,
        deviceId
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'synced', ?)
      ON CONFLICT(collection, id) DO UPDATE SET
        remoteId = excluded.remoteId,
        groupId = excluded.groupId,
        data = excluded.data,
        updatedAt = excluded.updatedAt,
        deletedAt = excluded.deletedAt,
        serverVersion = excluded.serverVersion,
        syncStatus = excluded.syncStatus,
        deviceId = excluded.deviceId;
    `,
    [
      collection,
      id,
      remoteId || existingDocument?.remoteId || null,
      groupId ?? existingDocument?.groupId ?? null,
      serializeData(data),
      createdAt,
      nextUpdatedAt,
      deletedAt || null,
      serverVersion ?? null,
      deviceId ?? existingDocument?.deviceId ?? null,
    ],
  );

  return getDocument(collection, id, { db, includeDeleted: true });
};

export const getDocumentsMissingGroupId = async (options = {}) => {
  const db = options.db || (await initDatabase());
  const sharedCollections = options.sharedCollections || SHARED_SYNC_COLLECTIONS;
  const placeholders = sharedCollections.map(() => '?').join(', ');
  const rows = await db.getAllAsync(
    `
      SELECT *
      FROM documents
      WHERE deletedAt IS NULL
        AND collection IN (${placeholders})
        AND (groupId IS NULL OR groupId = '')
      ORDER BY collection ASC, updatedAt ASC;
    `,
    sharedCollections,
  );

  return rows.map(parseDocument);
};

export const getDocumentsReadyToSync = async (options = {}) => {
  const db = options.db || (await initDatabase());
  const sharedCollections = options.sharedCollections || SHARED_SYNC_COLLECTIONS;
  const placeholders = sharedCollections.map(() => '?').join(', ');
  const rows = await db.getAllAsync(
    `
      SELECT *
      FROM documents
      WHERE collection IN (${placeholders})
        AND groupId IS NOT NULL
        AND groupId != ''
      ORDER BY collection ASC, updatedAt ASC;
    `,
    sharedCollections,
  );

  return rows.map(parseDocument);
};

export const getLocalPrivateDocuments = async (options = {}) => {
  const db = options.db || (await initDatabase());
  const sharedCollections = options.sharedCollections || SHARED_SYNC_COLLECTIONS;
  const placeholders = sharedCollections.map(() => '?').join(', ');
  const rows = await db.getAllAsync(
    `
      SELECT *
      FROM documents
      WHERE collection NOT IN (${placeholders})
      ORDER BY collection ASC, updatedAt ASC;
    `,
    sharedCollections,
  );

  return rows.map(parseDocument);
};

export const assignDocumentGroupId = async (
  collection,
  id,
  groupId,
  options = {},
) => {
  const db = options.db || (await initDatabase());
  const updatedAt = options.updatedAt || nowIso();

  await db.runAsync(
    `
      UPDATE documents
      SET groupId = ?,
          syncStatus = 'pending',
          updatedAt = ?,
          localVersion = localVersion + 1
      WHERE collection = ?
        AND id = ?;
    `,
    [groupId, updatedAt, collection, id],
  );

  if (!options.skipOutbox) {
    await addOutboxEvent(
      collection,
      id,
      'update',
      {
        groupId,
        id,
      },
      { db },
    );
  }

  return getDocument(collection, id, { db, includeDeleted: true });
};

export const getDocumentsBySyncStatuses = async (
  syncStatuses,
  options = {},
) => {
  const db = options.db || (await initDatabase());
  const statuses = Array.isArray(syncStatuses) ? syncStatuses : [syncStatuses];
  const placeholders = statuses.map(() => '?').join(', ');

  if (!statuses.length) {
    return [];
  }

  const rows = await db.getAllAsync(
    `
      SELECT *
      FROM documents
      WHERE syncStatus IN (${placeholders})
      ORDER BY collection ASC, updatedAt ASC;
    `,
    statuses,
  );

  return rows.map(parseDocument);
};

export const getPendingDocuments = async (options = {}) => {
  const db = options.db || (await initDatabase());
  const rows = await db.getAllAsync(
    `
      SELECT *
      FROM documents
      WHERE syncStatus = 'pending'
      ORDER BY updatedAt ASC;
    `,
  );

  return rows.map(parseDocument);
};
