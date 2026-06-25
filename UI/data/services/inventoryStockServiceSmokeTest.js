import { initDatabase } from '../db/database';
import {
  inventoryRepository,
  stockMovementRepository,
} from '../repositories';
import { getPendingOutboxEvents } from '../sync/syncOutbox';
import { createLocalId } from '../db/localIds';
import { applyInventoryLotAdjustment } from './inventoryStockService';
import { idsMatch } from '../../utils/idUtils';

export const runInventoryStockServiceSmokeTest = async () => {
  const details = [];

  try {
    await initDatabase();
    details.push('database_initialized');

    const pendingOutboxBefore = await getPendingOutboxEvents();
    const lotId = createLocalId('smoke_test_lot');
    const inventoryItem = await inventoryRepository.create({
      category: 'smoke_test_stock',
      lots: [
        {
          brand: 'smoke_test_brand',
          cost: 25,
          lotId,
          quantity: 10,
          supplier: 'smoke_test_supplier',
          supplierId: null,
          unit: 'g',
        },
      ],
      minimumStock: 0,
      name: `smoke_test_stock_${Date.now()}`,
      notes: 'Created by runInventoryStockServiceSmokeTest',
      storage: 'smoke_test_storage',
    });
    details.push('inventory_created');

    await applyInventoryLotAdjustment({
      inventoryId: inventoryItem.inventoryId,
      lotId,
      quantityDelta: 5,
      reason: 'smoke_test_positive_adjustment',
      type: 'adjustment',
      unit: 'g',
    });
    details.push('positive_adjustment_applied');

    await applyInventoryLotAdjustment({
      inventoryId: inventoryItem.inventoryId,
      lotId,
      quantityDelta: -3,
      reason: 'smoke_test_negative_adjustment',
      type: 'adjustment',
      unit: 'g',
    });
    details.push('negative_adjustment_applied');

    const updatedInventoryItem = await inventoryRepository.getById(
      inventoryItem.id,
    );
    const updatedLot = (updatedInventoryItem?.lots || []).find((lot) =>
      idsMatch(lot.lotId || lot.id, lotId),
    );
    const movements = await stockMovementRepository.getByInventoryId(
      inventoryItem.inventoryId,
    );
    const pendingOutboxAfter = await getPendingOutboxEvents();
    const createdOutboxEvents =
      pendingOutboxAfter.length - pendingOutboxBefore.length;
    const expectedQuantity = 12;
    const success =
      Number(updatedLot?.quantity) === expectedQuantity &&
      movements.length >= 2 &&
      createdOutboxEvents > 0;

    return {
      details,
      expectedQuantity,
      inventoryId: inventoryItem.inventoryId,
      lotId,
      movementCount: movements.length,
      outboxCreatedCount: createdOutboxEvents,
      outboxPendingCount: pendingOutboxAfter.length,
      success,
      updatedQuantity: Number(updatedLot?.quantity),
    };
  } catch (error) {
    return {
      details,
      error: String(error?.message || error),
      success: false,
    };
  }
};

export default runInventoryStockServiceSmokeTest;
