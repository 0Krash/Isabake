import { runLocalTransaction } from '../db/localTransaction';
import {
  inventoryRepository,
  stockMovementRepository,
} from '../repositories';
import { idsMatch } from '../../utils/idUtils';

const asNumber = (value) => Number(value);

const assertFiniteQuantity = (value, label) => {
  const quantity = asNumber(value);

  if (!Number.isFinite(quantity)) {
    throw new Error(`${label} inválida`);
  }

  return quantity;
};

const runWithOptionalTransaction = async (options, callback) => {
  if (options.db) {
    // Reuse the caller's transaction context; starting another transaction here
    // would break future recipe sale atomic operations.
    return callback(options.db);
  }

  return runLocalTransaction(callback);
};

export const createStockMovement = async (data, options = {}) =>
  stockMovementRepository.create(data, options);

export const getStockMovementsForInventory = async (inventoryId, options = {}) =>
  stockMovementRepository.getByInventoryId(inventoryId, options);

export const applyInventoryLotAdjustment = async (
  {
    inventoryId,
    lotId,
    notes = '',
    quantityDelta,
    reason = '',
    relatedRecipeId = null,
    relatedTransactionId = null,
    type = 'adjustment',
    unit,
  },
  options = {},
) => {
  if (!inventoryId) {
    throw new Error('inventoryId requerido');
  }

  if (!lotId) {
    throw new Error('lotId requerido');
  }

  const normalizedQuantityDelta = assertFiniteQuantity(
    quantityDelta,
    'quantityDelta',
  );

  return runWithOptionalTransaction(options, async (db) => {
    const inventoryItem = await inventoryRepository.getById(inventoryId, {
      db,
    });

    if (!inventoryItem) {
      throw new Error('Ingrediente de inventario no encontrado');
    }

    const lots = Array.isArray(inventoryItem.lots) ? inventoryItem.lots : [];
    const targetLot = lots.find((lot) => idsMatch(lot.lotId || lot.id, lotId));

    if (!targetLot) {
      throw new Error('Lote de inventario no encontrado');
    }

    const targetUnit = unit || targetLot.unit;

    if (targetLot.unit && targetUnit && targetLot.unit !== targetUnit) {
      throw new Error('La unidad del ajuste no coincide con la unidad del lote');
    }

    const currentQuantity = assertFiniteQuantity(
      targetLot.quantity,
      'quantity actual',
    );
    const nextQuantity = currentQuantity + normalizedQuantityDelta;

    if (nextQuantity < 0) {
      throw new Error('El ajuste dejaría el lote con cantidad negativa');
    }

    const nextLots = lots.map((lot) =>
      idsMatch(lot.lotId || lot.id, lotId)
        ? {
            ...lot,
            quantity: nextQuantity,
          }
        : lot,
    );
    const updatedInventoryItem = await inventoryRepository.update(
      inventoryItem.id || inventoryItem.inventoryId,
      {
        ...inventoryItem,
        lots: nextLots,
      },
      { ...options, db },
    );
    const stockMovement = await createStockMovement(
      {
        inventoryId,
        lotId,
        notes,
        quantityDelta: normalizedQuantityDelta,
        reason,
        relatedRecipeId,
        relatedTransactionId,
        type,
        unit: targetUnit,
      },
      { ...options, db },
    );

    return {
      inventoryItem: updatedInventoryItem,
      lot: nextLots.find((lot) => idsMatch(lot.lotId || lot.id, lotId)),
      stockMovement,
    };
  });
};

export default {
  applyInventoryLotAdjustment,
  createStockMovement,
  getStockMovementsForInventory,
};
