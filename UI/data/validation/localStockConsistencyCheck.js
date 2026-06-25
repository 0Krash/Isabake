import {
  inventoryRepository,
  stockMovementRepository,
  transactionRepository,
} from '../repositories';
import { STOCK_MOVEMENT_TYPES } from '../repositories/stockMovementRepository';
import { idsMatch, normalizeId } from '../../utils/idUtils';

const hasValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== '';

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const getInventoryId = (item = {}) =>
  normalizeId(item.inventoryId || item.id || item.localId);

const getLotId = (lot = {}) => normalizeId(lot.lotId || lot.id || lot.localId);

const getMovementId = (movement = {}) =>
  normalizeId(movement.movementId || movement.id || movement.localId);

export const runLocalStockConsistencyCheck = async () => {
  const warnings = [];
  const [inventoryItems, stockMovements, transactions] = await Promise.all([
    inventoryRepository.getAll(),
    stockMovementRepository.getAll(),
    transactionRepository.getAll(),
  ]);

  inventoryItems.forEach((item) => {
    const inventoryId = getInventoryId(item);

    if (!Array.isArray(item.lots)) {
      warnings.push({
        code: 'inventory_lots_not_array',
        inventoryId,
        inventoryName: item.name || '',
      });
      return;
    }

    item.lots.forEach((lot, lotIndex) => {
      const lotId = getLotId(lot);

      if (!lotId) {
        warnings.push({
          code: 'inventory_lot_missing_lot_id',
          inventoryId,
          inventoryName: item.name || '',
          lotIndex,
        });
      }

      if (!hasValue(lot.quantity) || !isFiniteNumber(lot.quantity)) {
        warnings.push({
          code: 'inventory_lot_invalid_quantity',
          inventoryId,
          inventoryName: item.name || '',
          lotId,
          quantity: lot.quantity,
        });
      }
    });
  });

  stockMovements.forEach((movement) => {
    const movementId = getMovementId(movement);
    const inventoryId = normalizeId(movement.inventoryId);
    const lotId = normalizeId(movement.lotId);
    const inventoryItem = inventoryItems.find((item) =>
      idsMatch(getInventoryId(item), inventoryId),
    );
    const lotExists = inventoryItem?.lots?.some((lot) =>
      idsMatch(getLotId(lot), lotId),
    );

    if (!inventoryId) {
      warnings.push({
        code: 'stock_movement_missing_inventory_id',
        movementId,
      });
    } else if (!inventoryItem) {
      warnings.push({
        code: 'stock_movement_inventory_not_found',
        inventoryId,
        movementId,
      });
    }

    if (!lotId) {
      warnings.push({
        code: 'stock_movement_missing_lot_id',
        movementId,
      });
    } else if (inventoryItem && !lotExists) {
      warnings.push({
        code: 'stock_movement_lot_not_found',
        inventoryId,
        lotId,
        movementId,
      });
    }

    if (!hasValue(movement.quantityDelta) || !isFiniteNumber(movement.quantityDelta)) {
      warnings.push({
        code: 'stock_movement_invalid_quantity_delta',
        movementId,
        quantityDelta: movement.quantityDelta,
      });
    }

    if (!STOCK_MOVEMENT_TYPES.includes(movement.type)) {
      warnings.push({
        code: 'stock_movement_unknown_type',
        movementId,
        type: movement.type,
      });
    }

    if (movement.type === 'sale_usage') {
      const relatedTransactionId = normalizeId(movement.relatedTransactionId);
      const relatedRecipeId = normalizeId(movement.relatedRecipeId);
      const transactionExists = transactions.some((transaction) =>
        idsMatch(
          transaction.transactionId || transaction.id || transaction.localId,
          relatedTransactionId,
        ),
      );

      if (!relatedTransactionId) {
        warnings.push({
          code: 'sale_usage_missing_related_transaction_id',
          movementId,
        });
      } else if (!transactionExists) {
        warnings.push({
          code: 'sale_usage_transaction_not_found',
          movementId,
          relatedTransactionId,
        });
      }

      if (!relatedRecipeId) {
        warnings.push({
          code: 'sale_usage_missing_related_recipe_id',
          movementId,
        });
      }
    }
  });

  return {
    checkedAt: new Date().toISOString(),
    inventoryItemsChecked: inventoryItems.length,
    ok: warnings.length === 0,
    stockMovementsChecked: stockMovements.length,
    transactionsChecked: transactions.length,
    warningCount: warnings.length,
    warnings,
  };
};

export default runLocalStockConsistencyCheck;
