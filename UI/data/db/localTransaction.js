import { initDatabase } from './database';

export const runLocalTransaction = async (callback) => {
  const db = await initDatabase();

  if (typeof db.withExclusiveTransactionAsync === 'function') {
    let result;

    await db.withExclusiveTransactionAsync(async (transactionDb) => {
      result = await callback(transactionDb);
    });

    return result;
  }

  if (typeof db.withTransactionAsync === 'function') {
    let result;

    await db.withTransactionAsync(async () => {
      result = await callback(db);
    });

    return result;
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
