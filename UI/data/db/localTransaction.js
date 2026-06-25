import { initDatabase } from './database';

export const runLocalTransaction = async (callback) => {
  const db = await initDatabase();

  if (typeof db.withExclusiveTransactionAsync === 'function') {
    return db.withExclusiveTransactionAsync((transactionDb) =>
      callback(transactionDb),
    );
  }

  if (typeof db.withTransactionAsync === 'function') {
    return db.withTransactionAsync(() => callback(db));
  }

  await db.execAsync('BEGIN TRANSACTION;');

  try {
    const result = await callback(db);
    await db.execAsync('COMMIT;');
    return result;
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
};

export default runLocalTransaction;
