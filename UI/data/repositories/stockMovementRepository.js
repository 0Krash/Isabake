import { createRepository } from './repositoryUtils';
import { idsMatch } from '../../utils/idUtils';

export const STOCK_MOVEMENT_COLLECTION = 'stockMovements';

export const STOCK_MOVEMENT_TYPES = [
  'purchase',
  'sale_usage',
  'adjustment',
  'waste',
  'return',
];

const normalizeMovementType = (type) =>
  STOCK_MOVEMENT_TYPES.includes(type) ? type : 'adjustment';

const normalizeStockMovement = (movement = {}) => ({
  inventoryId: movement.inventoryId ?? null,
  lotId: movement.lotId ?? null,
  notes: movement.notes || '',
  quantityDelta: Number(movement.quantityDelta || 0),
  reason: movement.reason || '',
  relatedRecipeId: movement.relatedRecipeId ?? null,
  relatedTransactionId: movement.relatedTransactionId ?? null,
  type: normalizeMovementType(movement.type),
  unit: movement.unit || '',
});

const repository = createRepository({
  collection: STOCK_MOVEMENT_COLLECTION,
  idField: 'movementId',
  idPrefix: 'stock_movement',
  prepareCreate: (movement, id) => ({
    ...normalizeStockMovement(movement),
    createdAt: movement.createdAt || new Date().toISOString(),
    movementId: movement.movementId || id,
  }),
  prepareUpdate: (movement, id) => ({
    ...movement,
    ...normalizeStockMovement(movement),
    movementId: movement.movementId || id,
  }),
});

const getByInventoryId = async (inventoryId, options = {}) => {
  const movements = await repository.getAll(options);

  return movements.filter((movement) =>
    idsMatch(movement.inventoryId, inventoryId),
  );
};

const getByRelatedTransactionId = async (transactionId, options = {}) => {
  const movements = await repository.getAll(options);

  return movements.filter(
    (movement) => idsMatch(movement.relatedTransactionId, transactionId),
  );
};

export default {
  ...repository,
  getByInventoryId,
  getByRelatedTransactionId,
};
