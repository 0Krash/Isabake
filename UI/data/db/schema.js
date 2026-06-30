export const DATABASE_NAME = 'isabake_local.db';
export const DATABASE_SCHEMA_VERSION = 3;

export const CREATE_SCHEMA_VERSION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_version (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version INTEGER NOT NULL,
    updatedAt TEXT NOT NULL
  );
`;

export const CREATE_DOCUMENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS documents (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    remoteId TEXT NULL,
    groupId TEXT NULL,
    data TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    deletedAt TEXT NULL,
    localVersion INTEGER NOT NULL DEFAULT 1,
    serverVersion INTEGER NULL,
    syncStatus TEXT NOT NULL DEFAULT 'pending',
    deviceId TEXT NULL,
    PRIMARY KEY(collection, id)
  );
`;

export const CREATE_SYNC_OUTBOX_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS sync_outbox (
    id TEXT PRIMARY KEY,
    collection TEXT NOT NULL,
    documentId TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    lastError TEXT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
  );
`;

export const CREATE_SYNC_STATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS sync_state (
    groupId TEXT PRIMARY KEY,
    lastSyncCursor TEXT NULL,
    lastSyncedAt TEXT NULL,
    updatedAt TEXT NOT NULL
  );
`;

export const CREATE_SYNC_HISTORY_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS sync_history (
    id TEXT PRIMARY KEY,
    runId TEXT NOT NULL,
    groupId TEXT NULL,
    workspaceName TEXT NULL,
    actionType TEXT NOT NULL,
    triggerSource TEXT NOT NULL,
    status TEXT NOT NULL,
    startedAt TEXT NOT NULL,
    finishedAt TEXT NULL,
    durationMs INTEGER NULL,
    pushedCount INTEGER NOT NULL DEFAULT 0,
    pulledCount INTEGER NOT NULL DEFAULT 0,
    acceptedCount INTEGER NOT NULL DEFAULT 0,
    rejectedCount INTEGER NOT NULL DEFAULT 0,
    conflictCount INTEGER NOT NULL DEFAULT 0,
    failedCount INTEGER NOT NULL DEFAULT 0,
    skippedCount INTEGER NOT NULL DEFAULT 0,
    pendingBefore INTEGER NULL,
    pendingAfter INTEGER NULL,
    errorCode TEXT NULL,
    safeErrorMessage TEXT NULL,
    authState TEXT NOT NULL DEFAULT 'unknown',
    networkState TEXT NOT NULL DEFAULT 'unknown',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`;

export const DOCUMENT_INDEX_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection);',
  'CREATE INDEX IF NOT EXISTS idx_documents_groupId ON documents(groupId);',
  'CREATE INDEX IF NOT EXISTS idx_documents_syncStatus ON documents(syncStatus);',
  'CREATE INDEX IF NOT EXISTS idx_documents_updatedAt ON documents(updatedAt);',
];

export const SYNC_OUTBOX_INDEX_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON sync_outbox(status);',
  'CREATE INDEX IF NOT EXISTS idx_sync_outbox_createdAt ON sync_outbox(createdAt);',
  'CREATE INDEX IF NOT EXISTS idx_sync_outbox_collection_documentId ON sync_outbox(collection, documentId);',
];

export const SYNC_HISTORY_INDEX_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_sync_history_startedAt ON sync_history(startedAt);',
  'CREATE INDEX IF NOT EXISTS idx_sync_history_runId ON sync_history(runId);',
  'CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status);',
];
