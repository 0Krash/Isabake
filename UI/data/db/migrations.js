import {
  CREATE_DOCUMENTS_TABLE_SQL,
  CREATE_SCHEMA_VERSION_TABLE_SQL,
  CREATE_SYNC_STATE_TABLE_SQL,
  CREATE_SYNC_OUTBOX_TABLE_SQL,
  DATABASE_SCHEMA_VERSION,
  DOCUMENT_INDEX_SQL,
  SYNC_OUTBOX_INDEX_SQL,
} from './schema';

const nowIso = () => new Date().toISOString();

const getCurrentSchemaVersion = async (db) => {
  await db.execAsync(CREATE_SCHEMA_VERSION_TABLE_SQL);

  const row = await db.getFirstAsync(
    'SELECT version FROM schema_version WHERE id = 1;',
  );

  return Number(row?.version || 0);
};

const setSchemaVersion = async (db, version) => {
  await db.runAsync(
    `
      INSERT INTO schema_version (id, version, updatedAt)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        version = excluded.version,
        updatedAt = excluded.updatedAt;
    `,
    [version, nowIso()],
  );
};

const runVersionOneMigration = async (db) => {
  await db.execAsync(CREATE_DOCUMENTS_TABLE_SQL);
  await db.execAsync(CREATE_SYNC_OUTBOX_TABLE_SQL);

  for (const indexSql of DOCUMENT_INDEX_SQL) {
    await db.execAsync(indexSql);
  }

  for (const indexSql of SYNC_OUTBOX_INDEX_SQL) {
    await db.execAsync(indexSql);
  }

  await setSchemaVersion(db, 1);
};

const runVersionTwoMigration = async (db) => {
  await db.execAsync(CREATE_SYNC_STATE_TABLE_SQL);
  await setSchemaVersion(db, 2);
};

export const runMigrations = async (db) => {
  let currentVersion = await getCurrentSchemaVersion(db);

  if (currentVersion < 1) {
    await runVersionOneMigration(db);
    currentVersion = 1;
  }

  if (currentVersion < 2) {
    await runVersionTwoMigration(db);
    currentVersion = 2;
  }

  const finalVersion = await getCurrentSchemaVersion(db);

  if (finalVersion > DATABASE_SCHEMA_VERSION) {
    throw new Error(
      `La base local usa schema ${finalVersion}, pero la app soporta ${DATABASE_SCHEMA_VERSION}.`,
    );
  }

  return finalVersion;
};
