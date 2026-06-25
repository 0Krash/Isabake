import { initDatabase } from '../db/database';
import {
  inventoryRepository,
  recipeRepository,
  stockMovementRepository,
  storeRepository,
  transactionRepository,
} from '../repositories';
import { getPendingOutboxCountsByCollection } from '../sync/syncOutbox';
import { runLocalDataConsistencyCheck } from './localDataConsistencyCheck';
import { runLocalStockConsistencyCheck } from './localStockConsistencyCheck';
import { runLocalTransactionConsistencyCheck } from './localTransactionConsistencyCheck';
import { idsMatch, normalizeId } from '../../utils/idUtils';

const getEntityId = (entity, idField) => {
  if (!entity || typeof entity !== 'object') {
    return '';
  }

  return normalizeId(entity[idField] || entity.id || entity.localId);
};

const collectWarnings = (...results) =>
  results.flatMap((result) => (Array.isArray(result?.warnings) ? result.warnings : []));

const getRecipeSaleConsistency = async ({ stockMovements, transactions }) => {
  const warnings = [];
  const recipeSaleTransactions = transactions.filter(
    (transaction) =>
      transaction.transactionType === 'Ventas' &&
      String(transaction.category?.description || '').trim() === 'Recetas',
  );

  recipeSaleTransactions.forEach((transaction) => {
    const transactionId = getEntityId(transaction, 'transactionId');
    const relatedMovements = stockMovements.filter((movement) =>
      idsMatch(movement.relatedTransactionId, transactionId),
    );

    if (!transactionId) {
      warnings.push({
        code: 'recipe_sale_transaction_missing_id',
        description: transaction.description || '',
      });
      return;
    }

    if (!relatedMovements.length) {
      warnings.push({
        code: 'recipe_sale_transaction_missing_stock_movement',
        transactionId,
      });
    }

    relatedMovements.forEach((movement) => {
      if (movement.type !== 'sale_usage') {
        warnings.push({
          code: 'recipe_sale_stock_movement_unexpected_type',
          movementId: getEntityId(movement, 'movementId'),
          transactionId,
          type: movement.type,
        });
      }
    });
  });

  return {
    ok: warnings.length === 0,
    recipeSaleTransactionsChecked: recipeSaleTransactions.length,
    warningCount: warnings.length,
    warnings,
  };
};

export const runLocalOnlyReadinessCheck = async () => {
  const errors = [];
  const checkedAt = new Date().toISOString();
  let localDbInitialized = false;

  try {
    await initDatabase();
    localDbInitialized = true;

    const [
      stores,
      recipes,
      inventoryItems,
      stockMovements,
      transactions,
      dataConsistency,
      stockConsistency,
      transactionConsistency,
      pendingOutboxByCollection,
    ] = await Promise.all([
      storeRepository.getAll(),
      recipeRepository.getAll(),
      inventoryRepository.getAll(),
      stockMovementRepository.getAll(),
      transactionRepository.getAll(),
      runLocalDataConsistencyCheck(),
      runLocalStockConsistencyCheck(),
      runLocalTransactionConsistencyCheck(),
      getPendingOutboxCountsByCollection(),
    ]);
    const recipeSaleConsistency = await getRecipeSaleConsistency({
      stockMovements,
      transactions,
    });
    const warnings = collectWarnings(
      dataConsistency,
      stockConsistency,
      transactionConsistency,
      recipeSaleConsistency,
    );

    return {
      checkedAt,
      errors,
      inventory: {
        count: inventoryItems.length,
        ok: dataConsistency.ok && stockConsistency.ok,
      },
      localDbInitialized,
      ok:
        localDbInitialized &&
        errors.length === 0 &&
        warnings.length === 0,
      outbox: {
        pendingByCollection: pendingOutboxByCollection,
      },
      recipeSaleConsistency,
      recipes: {
        count: recipes.length,
        ok: dataConsistency.ok,
      },
      stockMovements: {
        count: stockMovements.length,
        ok: stockConsistency.ok,
      },
      stores: {
        count: stores.length,
        ok: true,
      },
      transactions: {
        count: transactions.length,
        ok: transactionConsistency.ok,
      },
      validation: {
        dataConsistency,
        stockConsistency,
        transactionConsistency,
      },
      warningCount: warnings.length,
      warnings,
    };
  } catch (error) {
    errors.push({
      code: 'local_only_readiness_check_failed',
      message: String(error?.message || error),
    });

    return {
      checkedAt,
      errors,
      localDbInitialized,
      ok: false,
      warningCount: 0,
      warnings: [],
    };
  }
};

export default runLocalOnlyReadinessCheck;
