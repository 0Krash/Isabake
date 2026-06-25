import { initDatabase } from '../db/database';
import {
  getCollection,
  hardDeleteDocument,
} from '../db/documentStore';
import { CATEGORY_COLLECTION } from '../repositories/categoryRepository';
import { INVENTORY_COLLECTION } from '../repositories/inventoryRepository';
import { RECIPE_COLLECTION } from '../repositories/recipeRepository';
import { RECIPE_SECTION_COLLECTION } from '../repositories/recipeSectionRepository';
import { RECIPE_TYPE_COLLECTION } from '../repositories/recipeTypeRepository';
import { STOCK_MOVEMENT_COLLECTION } from '../repositories/stockMovementRepository';
import { STORE_COLLECTION } from '../repositories/storeRepository';
import { TRANSACTION_COLLECTION } from '../repositories/transactionRepository';

const SMOKE_PREFIXES = [
  'smoke_test',
  'rollback_smoke_test',
  'recipe_sale_smoke',
];

const COLLECTIONS = [
  CATEGORY_COLLECTION,
  INVENTORY_COLLECTION,
  RECIPE_COLLECTION,
  RECIPE_SECTION_COLLECTION,
  RECIPE_TYPE_COLLECTION,
  STOCK_MOVEMENT_COLLECTION,
  STORE_COLLECTION,
  TRANSACTION_COLLECTION,
];

const includesSmokePrefix = (value, prefixes = SMOKE_PREFIXES) =>
  prefixes.some((prefix) => String(value || '').includes(prefix));

const getEntityId = (entity) => entity?.id || entity?.localId || '';

const findSmokeRecords = async ({ collections, prefixes }) => {
  const matches = [];

  for (const collection of collections) {
    const records = await getCollection(collection, { includeDeleted: true });

    records.forEach((record) => {
      const serializedRecord = JSON.stringify(record || {});

      if (
        includesSmokePrefix(getEntityId(record), prefixes) ||
        includesSmokePrefix(serializedRecord, prefixes)
      ) {
        matches.push({
          collection,
          id: getEntityId(record),
        });
      }
    });
  }

  return matches;
};

const deleteSmokeOutboxEvents = async ({ db, dryRun, prefixes }) => {
  const where = prefixes
    .map(() => '(documentId LIKE ? OR payload LIKE ?)')
    .join(' OR ');
  const params = prefixes.flatMap((prefix) => [`%${prefix}%`, `%${prefix}%`]);
  const countRow = await db.getFirstAsync(
    `
      SELECT COUNT(*) AS count
      FROM sync_outbox
      WHERE ${where};
    `,
    params,
  );
  const count = Number(countRow?.count || 0);

  if (!dryRun && count > 0) {
    await db.runAsync(
      `
        DELETE FROM sync_outbox
        WHERE ${where};
      `,
      params,
    );
  }

  return count;
};

export const resetLocalDevData = async ({
  collections = COLLECTIONS,
  dryRun = false,
  includeOutbox = true,
  prefixes = SMOKE_PREFIXES,
} = {}) => {
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    return {
      blocked: true,
      error: 'resetLocalDevData is dev-only and cannot run in production builds.',
      success: false,
    };
  }

  const db = await initDatabase();
  const recordsToRemove = await findSmokeRecords({ collections, prefixes });

  if (!dryRun) {
    for (const record of recordsToRemove) {
      await hardDeleteDocument(record.collection, record.id, { db });
    }
  }

  const outboxRemoved = includeOutbox
    ? await deleteSmokeOutboxEvents({ db, dryRun, prefixes })
    : 0;

  const removedByCollection = recordsToRemove.reduce(
    (summary, record) => ({
      ...summary,
      [record.collection]: (summary[record.collection] || 0) + 1,
    }),
    {},
  );

  return {
    dryRun,
    includeOutbox,
    prefixes,
    removedByCollection,
    removedDocumentCount: recordsToRemove.length,
    removedDocuments: recordsToRemove,
    removedOutboxEventCount: outboxRemoved,
    success: true,
  };
};

export default resetLocalDevData;
