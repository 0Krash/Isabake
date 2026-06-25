import { initDatabase } from '../db/database';
import { runLocalTransaction } from '../db/localTransaction';
import { createLocalId } from '../db/localIds';
import {
  inventoryRepository,
  stockMovementRepository,
} from '../repositories';
import { getPendingOutboxEvents } from '../sync/syncOutbox';
import { idsMatch } from '../../utils/idUtils';
import { applyInventoryLotAdjustment } from './inventoryStockService';

const getLot = (inventoryItem, lotId) =>
  (inventoryItem?.lots || []).find((lot) => idsMatch(lot.lotId || lot.id, lotId));

const countMovementsByReason = (movements, reason) =>
  movements.filter((movement) => movement.reason === reason).length;

export const runLocalTransactionRollbackSmokeTest = async () => {
  const details = [];
  const rollbackReason = `rollback_smoke_test_forced_${Date.now()}`;
  const negativeReason = `rollback_smoke_test_negative_${Date.now()}`;

  try {
    await initDatabase();
    details.push('database_initialized');

    const lotId = createLocalId('rollback_smoke_test_lot');
    const inventoryItem = await inventoryRepository.create({
      category: 'rollback_smoke_test_stock',
      lots: [
        {
          brand: 'rollback_smoke_test_brand',
          cost: 10,
          lotId,
          quantity: 10,
          supplier: 'rollback_smoke_test_supplier',
          supplierId: null,
          unit: 'g',
        },
      ],
      minimumStock: 0,
      name: `rollback_smoke_test_stock_${Date.now()}`,
      notes: 'Created by runLocalTransactionRollbackSmokeTest',
      storage: 'rollback_smoke_test_storage',
    });
    details.push('inventory_created');

    const outboxBeforeRollback = await getPendingOutboxEvents();
    const movementsBeforeRollback =
      await stockMovementRepository.getByInventoryId(inventoryItem.inventoryId);
    let rollbackError = null;

    try {
      await runLocalTransaction(async (db) => {
        await applyInventoryLotAdjustment(
          {
            inventoryId: inventoryItem.inventoryId,
            lotId,
            quantityDelta: -2,
            reason: rollbackReason,
            type: 'adjustment',
            unit: 'g',
          },
          { db },
        );

        throw new Error('rollback_smoke_test_forced_failure');
      });
    } catch (error) {
      rollbackError = error;
      details.push('forced_rollback_caught');
    }

    const inventoryAfterRollback = await inventoryRepository.getById(
      inventoryItem.id,
    );
    const lotAfterRollback = getLot(inventoryAfterRollback, lotId);
    const movementsAfterRollback =
      await stockMovementRepository.getByInventoryId(inventoryItem.inventoryId);
    const outboxAfterRollback = await getPendingOutboxEvents();
    const forcedRollbackPassed =
      rollbackError &&
      Number(lotAfterRollback?.quantity) === 10 &&
      movementsAfterRollback.length === movementsBeforeRollback.length &&
      countMovementsByReason(movementsAfterRollback, rollbackReason) === 0 &&
      outboxAfterRollback.length === outboxBeforeRollback.length;

    const outboxBeforeNegative = await getPendingOutboxEvents();
    const movementsBeforeNegative =
      await stockMovementRepository.getByInventoryId(inventoryItem.inventoryId);
    let negativeError = null;

    try {
      await applyInventoryLotAdjustment({
        inventoryId: inventoryItem.inventoryId,
        lotId,
        quantityDelta: -999,
        reason: negativeReason,
        type: 'adjustment',
        unit: 'g',
      });
    } catch (error) {
      negativeError = error;
      details.push('negative_quantity_error_caught');
    }

    const inventoryAfterNegative = await inventoryRepository.getById(
      inventoryItem.id,
    );
    const lotAfterNegative = getLot(inventoryAfterNegative, lotId);
    const movementsAfterNegative =
      await stockMovementRepository.getByInventoryId(inventoryItem.inventoryId);
    const outboxAfterNegative = await getPendingOutboxEvents();
    const negativeRollbackPassed =
      negativeError &&
      Number(lotAfterNegative?.quantity) === 10 &&
      movementsAfterNegative.length === movementsBeforeNegative.length &&
      countMovementsByReason(movementsAfterNegative, negativeReason) === 0 &&
      outboxAfterNegative.length === outboxBeforeNegative.length;

    return {
      details,
      forcedRollback: {
        error: String(rollbackError?.message || rollbackError || ''),
        movementCountAfter: movementsAfterRollback.length,
        movementCountBefore: movementsBeforeRollback.length,
        outboxCountAfter: outboxAfterRollback.length,
        outboxCountBefore: outboxBeforeRollback.length,
        passed: forcedRollbackPassed,
        quantityAfter: Number(lotAfterRollback?.quantity),
      },
      inventoryId: inventoryItem.inventoryId,
      lotId,
      negativeQuantityRollback: {
        error: String(negativeError?.message || negativeError || ''),
        movementCountAfter: movementsAfterNegative.length,
        movementCountBefore: movementsBeforeNegative.length,
        outboxCountAfter: outboxAfterNegative.length,
        outboxCountBefore: outboxBeforeNegative.length,
        passed: negativeRollbackPassed,
        quantityAfter: Number(lotAfterNegative?.quantity),
      },
      success: Boolean(forcedRollbackPassed && negativeRollbackPassed),
    };
  } catch (error) {
    return {
      details,
      error: String(error?.message || error),
      success: false,
    };
  }
};

export default runLocalTransactionRollbackSmokeTest;
