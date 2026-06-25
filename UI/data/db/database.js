import * as SQLite from 'expo-sqlite';

import { runMigrations } from './migrations';
import { DATABASE_NAME } from './schema';

let databasePromise = null;
let initializationPromise = null;

export const getDatabase = async () => {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
};

export const initDatabase = async () => {
  if (!initializationPromise) {
    initializationPromise = getDatabase().then(async (db) => {
      await runMigrations(db);
      return db;
    });
  }

  return initializationPromise;
};
