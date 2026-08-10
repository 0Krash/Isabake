const SQLITE_LOCK_RETRY_DELAYS_MS = [80, 160, 320, 640, 1000];
let sqliteWriteQueue = Promise.resolve();

const wait = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

export const isSqliteLockedError = (error) =>
  String(error?.message || error || '')
    .toLowerCase()
    .includes('database is locked');

export const runSqliteWriteWithRetry = async (operation) => {
  let lastError = null;

  for (let attempt = 0; attempt <= SQLITE_LOCK_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isSqliteLockedError(error) || attempt === SQLITE_LOCK_RETRY_DELAYS_MS.length) {
        throw error;
      }

      await wait(SQLITE_LOCK_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError;
};

export const queueSqliteWrite = (operation) => {
  const queuedOperation = sqliteWriteQueue.then(() =>
    runSqliteWriteWithRetry(operation),
  );

  sqliteWriteQueue = queuedOperation.catch(() => {});

  return queuedOperation;
};
