import { initDatabase } from '../db/database';
import { createLocalId } from '../db/localIds';
import {
  inventoryRepository,
  recipeRepository,
  stockMovementRepository,
  transactionRepository,
} from '../repositories';
import { getPendingOutboxEvents } from '../sync/syncOutbox';
import { idsMatch } from '../../utils/idUtils';
import { createLocalRecipeSale } from './recipeSaleService';

const isPlainObject = (value) => Boolean(value && typeof value === 'object');

const safeArray = (value) => (Array.isArray(value) ? value : []);

const getLot = (inventoryItem, lotId) =>
  safeArray(inventoryItem?.lots).find((lot) =>
    idsMatch(lot?.lotId || lot?.id, lotId),
  ) || null;

const getEntityId = (entity, idField) => {
  if (!isPlainObject(entity)) {
    return '';
  }

  return entity[idField] || entity.id || entity.localId || '';
};

const getSaleResultDebug = ({
  outboxRunCount = null,
  saleResult = null,
  transactionId = '',
} = {}) => ({
  outboxRunCount,
  saleResultShape: {
    deductions: Array.isArray(saleResult?.deductions)
      ? 'array'
      : typeof saleResult?.deductions,
    operation: isPlainObject(saleResult?.operation)
      ? 'object'
      : typeof saleResult?.operation,
    stockMovements: Array.isArray(saleResult?.stockMovements)
      ? 'array'
      : typeof saleResult?.stockMovements,
    transaction: isPlainObject(saleResult?.transaction)
      ? 'object'
      : typeof saleResult?.transaction,
    updatedInventoryItems: Array.isArray(saleResult?.updatedInventoryItems)
      ? 'array'
      : typeof saleResult?.updatedInventoryItems,
  },
  stockMovementCount: safeArray(saleResult?.stockMovements).length,
  transactionId,
  updatedInventoryItemCount: safeArray(saleResult?.updatedInventoryItems).length,
});

const createFailureResult = ({
  debug = {},
  details,
  error,
  failedStep,
  runId,
}) => ({
  debug,
  details,
  error: String(error || ''),
  failedStep,
  runId,
  success: false,
});

const countOutboxEventsForRunId = async (runId) => {
  const events = await getPendingOutboxEvents();

  return safeArray(events).filter((event) =>
    JSON.stringify(event?.payload || {}).includes(runId),
  ).length;
};

const getSaleUsageMovements = async (inventoryId, runId) => {
  const movements = await stockMovementRepository.getByInventoryId(inventoryId);

  return safeArray(movements).filter(
    (movement) =>
      movement?.type === 'sale_usage' &&
      String(movement.notes || '').includes(runId),
  );
};

const createSmokeInventoryAndRecipe = async ({ inventoryUnit, quantity, runId }) => {
  const lotId = createLocalId('recipe_sale_smoke_lot');
  const inventoryItem = await inventoryRepository.create({
    category: 'recipe_sale_smoke_test',
    lots: [
      {
        brand: 'recipe_sale_smoke_brand',
        cost: 100,
        lotId,
        quantity,
        supplier: 'recipe_sale_smoke_supplier',
        supplierId: null,
        unit: inventoryUnit,
      },
    ],
    minimumStock: 0,
    name: `recipe_sale_smoke_inventory_${runId}`,
    notes: `recipe_sale_smoke_test ${runId}`,
    storage: 'recipe_sale_smoke_storage',
  });
  const recipe = await recipeRepository.create({
    cost: 0,
    ingredients: [
      {
        ingredientId: createLocalId('recipe_sale_smoke_ingredient'),
        inventoryId: getEntityId(inventoryItem, 'inventoryId'),
        name: 'recipe_sale_smoke_ingredient',
        quantity: 2,
        section: 'smoke',
        unit: 'kg',
      },
    ],
    name: `recipe_sale_smoke_recipe_${runId}`,
    servings: 1,
    steps: [],
    type: 'smoke_test',
  });

  return {
    inventoryItem,
    lotId,
    recipe,
  };
};

let recipeSaleSmokeTestIsRunning = false;

export const runRecipeSaleServiceSmokeTest = async () => {
  if (recipeSaleSmokeTestIsRunning) {
    return {
      details: ['recipe_sale_smoke_test_already_running'],
      skipped: true,
      success: false,
    };
  }

  recipeSaleSmokeTestIsRunning = true;
  const details = [];
  const runId = createLocalId('recipe_sale_smoke_run');
  let lastOutboxRunCount = null;
  let lastSaleResult = null;
  let lastTransactionId = '';

  try {
    await initDatabase();
    details.push('database_initialized');

    const successCase = await createSmokeInventoryAndRecipe({
      inventoryUnit: 'kg',
      quantity: 10,
      runId: `${runId}_success`,
    });
    const outboxBeforeSuccess = await countOutboxEventsForRunId(runId);
    const saleResult = await createLocalRecipeSale({
      category: { description: 'Recetas', shortDescription: 'Recetas' },
      description: `recipe_sale_smoke_success_${runId}`,
      financials: {
        ingredients: [
          {
            inventoryId: getEntityId(successCase.inventoryItem, 'inventoryId'),
            name: 'recipe_sale_smoke_ingredient',
            quantity: 2,
            unit: 'kg',
          },
        ],
        recipeId: getEntityId(successCase.recipe, 'recipeId'),
        recipeName: successCase.recipe.name,
        saleQuantity: 1,
        saleTotal: 1000,
      },
      recipe: successCase.recipe,
      saleQuantity: 1,
      saleTotal: 1000,
      selectedDate: new Date().toISOString(),
      stockMovementNotes: `recipe_sale_smoke_success_${runId}`,
    });
    lastSaleResult = saleResult;

    const saleTransactionId = getEntityId(saleResult?.transaction, 'transactionId');
    lastTransactionId = saleTransactionId;
    const successDebug = (outboxRunCount = null) =>
      getSaleResultDebug({
        outboxRunCount,
        saleResult,
        transactionId: saleTransactionId,
      });

    if (!isPlainObject(saleResult?.transaction)) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'saleResult.transaction was null or not an object',
        failedStep: 'successful_sale_transaction_shape',
        runId,
      });
    }

    if (!saleTransactionId) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'saleResult.transaction did not include a transactionId/id/localId',
        failedStep: 'successful_sale_transaction_id',
        runId,
      });
    }

    if (!Array.isArray(saleResult?.stockMovements)) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'saleResult.stockMovements was null or not an array',
        failedStep: 'successful_sale_stock_movement_shape',
        runId,
      });
    }

    if (!Array.isArray(saleResult?.updatedInventoryItems)) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'saleResult.updatedInventoryItems was null or not an array',
        failedStep: 'successful_sale_inventory_shape',
        runId,
      });
    }

    if (!Array.isArray(saleResult?.deductions)) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'saleResult.deductions was null or not an array',
        failedStep: 'successful_sale_deduction_shape',
        runId,
      });
    }

    if (!isPlainObject(saleResult?.operation)) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'saleResult.operation was null or not an object',
        failedStep: 'successful_sale_operation_shape',
        runId,
      });
    }

    if (!idsMatch(saleResult.operation.transactionId, saleTransactionId)) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'saleResult.operation.transactionId did not match transaction id',
        failedStep: 'successful_sale_operation_transaction_id',
        runId,
      });
    }

    const transactionAfterSuccess = await transactionRepository.getById(
      saleTransactionId,
    );

    if (!isPlainObject(transactionAfterSuccess)) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'Persisted transaction was null after successful sale',
        failedStep: 'successful_sale_transaction_persisted',
        runId,
      });
    }

    details.push('successful_sale_transaction_verified');

    const returnedUpdatedInventoryItem = safeArray(
      saleResult?.updatedInventoryItems,
    ).find(
      (inventoryItem) =>
        idsMatch(
          getEntityId(inventoryItem, 'inventoryId'),
          getEntityId(successCase.inventoryItem, 'inventoryId'),
        ),
    );
    const returnedUpdatedLot = getLot(
      returnedUpdatedInventoryItem,
      successCase.lotId,
    );

    if (!isPlainObject(returnedUpdatedInventoryItem)) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'saleResult.updatedInventoryItems did not include the sold inventory item',
        failedStep: 'successful_sale_inventory_returned_item',
        runId,
      });
    }

    if (!isPlainObject(returnedUpdatedLot)) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'Returned updated inventory item did not include the sold lot',
        failedStep: 'successful_sale_inventory_returned_lot',
        runId,
      });
    }

    if (Number(returnedUpdatedLot.quantity) !== 8) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: `Returned updated lot quantity was ${Number(returnedUpdatedLot.quantity)} instead of 8`,
        failedStep: 'successful_sale_inventory_returned_quantity',
        runId,
      });
    }

    const inventoryAfterSuccess = await inventoryRepository.getById(
      successCase.inventoryItem.id,
    );
    const lotAfterSuccess = getLot(inventoryAfterSuccess, successCase.lotId);

    if (!isPlainObject(inventoryAfterSuccess)) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'Persisted inventory item was null after successful sale',
        failedStep: 'successful_sale_inventory_persisted_item',
        runId,
      });
    }

    if (!isPlainObject(lotAfterSuccess)) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'Persisted inventory item did not include the sold lot',
        failedStep: 'successful_sale_inventory_persisted_lot',
        runId,
      });
    }

    if (Number(lotAfterSuccess.quantity) !== 8) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: `Persisted lot quantity was ${Number(lotAfterSuccess.quantity)} instead of 8`,
        failedStep: 'successful_sale_inventory_persisted_quantity',
        runId,
      });
    }

    details.push('successful_sale_inventory_verified');

    const returnedStockMovement = safeArray(saleResult?.stockMovements)[0];

    if (!isPlainObject(returnedStockMovement)) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'saleResult.stockMovements did not include a stock movement',
        failedStep: 'successful_sale_stock_movement_returned',
        runId,
      });
    }

    if (!returnedStockMovement.relatedTransactionId) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'Returned stock movement relatedTransactionId was null',
        failedStep: 'successful_sale_stock_movement_transaction_id',
        runId,
      });
    }

    if (!returnedStockMovement.relatedRecipeId) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'Returned stock movement relatedRecipeId was null',
        failedStep: 'successful_sale_stock_movement_recipe_id',
        runId,
      });
    }

    const successMovements = await getSaleUsageMovements(
      getEntityId(successCase.inventoryItem, 'inventoryId'),
      runId,
    );
    const successMovement = successMovements[0];

    if (!isPlainObject(successMovement)) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'Persisted sale_usage stock movement was not found',
        failedStep: 'successful_sale_stock_movement_persisted',
        runId,
      });
    }

    if (!successMovement.relatedTransactionId) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'Persisted stock movement relatedTransactionId was null',
        failedStep: 'successful_sale_stock_movement_persisted_transaction_id',
        runId,
      });
    }

    if (!successMovement.relatedRecipeId) {
      return createFailureResult({
        debug: successDebug(),
        details,
        error: 'Persisted stock movement relatedRecipeId was null',
        failedStep: 'successful_sale_stock_movement_persisted_recipe_id',
        runId,
      });
    }

    details.push('successful_sale_stock_movement_verified');

    const outboxAfterSuccess = await countOutboxEventsForRunId(runId);
    lastOutboxRunCount = outboxAfterSuccess;

    if (outboxAfterSuccess <= outboxBeforeSuccess) {
      return createFailureResult({
        debug: successDebug(outboxAfterSuccess),
        details,
        error: 'Successful sale did not create any outbox events for this run',
        failedStep: 'successful_sale_outbox',
        runId,
      });
    }

    details.push('successful_sale_outbox_verified');

    const insufficientCase = await createSmokeInventoryAndRecipe({
      inventoryUnit: 'kg',
      quantity: 1,
      runId: `${runId}_insufficient`,
    });
    const insufficientOutboxBefore = await countOutboxEventsForRunId(runId);
    const insufficientMovementsBefore = await getSaleUsageMovements(
      getEntityId(insufficientCase.inventoryItem, 'inventoryId'),
      runId,
    );
    let insufficientError = null;

    try {
      await createLocalRecipeSale({
        description: `recipe_sale_smoke_insufficient_${runId}`,
        financials: { recipeId: getEntityId(insufficientCase.recipe, 'recipeId') },
        recipe: insufficientCase.recipe,
        saleQuantity: 1,
        saleTotal: 1000,
        stockMovementNotes: `recipe_sale_smoke_insufficient_${runId}`,
      });
    } catch (error) {
      insufficientError = error;
      details.push('insufficient_stock_error_caught');
    }

    const insufficientInventoryAfter = await inventoryRepository.getById(
      insufficientCase.inventoryItem.id,
    );

    if (!isPlainObject(insufficientInventoryAfter)) {
      return createFailureResult({
        debug: successDebug(insufficientOutboxBefore),
        details,
        error: 'Insufficient-stock rollback inventory item was null',
        failedStep: 'insufficient_stock_inventory_persisted_item',
        runId,
      });
    }

    const insufficientLotAfter = getLot(
      insufficientInventoryAfter,
      insufficientCase.lotId,
    );

    if (!isPlainObject(insufficientLotAfter)) {
      return createFailureResult({
        debug: successDebug(insufficientOutboxBefore),
        details,
        error: 'Insufficient-stock rollback inventory item did not include the tested lot',
        failedStep: 'insufficient_stock_inventory_persisted_lot',
        runId,
      });
    }

    const insufficientMovementsAfter = await getSaleUsageMovements(
      getEntityId(insufficientCase.inventoryItem, 'inventoryId'),
      runId,
    );
    const insufficientOutboxAfter = await countOutboxEventsForRunId(runId);
    lastOutboxRunCount = insufficientOutboxAfter;
    const insufficientRollbackPassed =
      insufficientError &&
      Number(insufficientLotAfter?.quantity) === 1 &&
      insufficientMovementsAfter.length === insufficientMovementsBefore.length &&
      insufficientOutboxAfter === insufficientOutboxBefore;

    if (!insufficientError) {
      return createFailureResult({
        debug: successDebug(insufficientOutboxAfter),
        details,
        error: 'Insufficient-stock sale did not throw',
        failedStep: 'insufficient_stock_error_expected',
        runId,
      });
    }

    if (Number(insufficientLotAfter.quantity) !== 1) {
      return createFailureResult({
        debug: successDebug(insufficientOutboxAfter),
        details,
        error: `Insufficient-stock rollback lot quantity was ${Number(insufficientLotAfter.quantity)} instead of 1`,
        failedStep: 'insufficient_stock_inventory_rollback_quantity',
        runId,
      });
    }

    if (insufficientMovementsAfter.length !== insufficientMovementsBefore.length) {
      return createFailureResult({
        debug: successDebug(insufficientOutboxAfter),
        details,
        error: 'Insufficient-stock rollback changed stock movement count',
        failedStep: 'insufficient_stock_movement_rollback_count',
        runId,
      });
    }

    if (insufficientOutboxAfter !== insufficientOutboxBefore) {
      return createFailureResult({
        debug: successDebug(insufficientOutboxAfter),
        details,
        error: 'Insufficient-stock rollback changed outbox count',
        failedStep: 'insufficient_stock_outbox_rollback_count',
        runId,
      });
    }

    const mismatchCase = await createSmokeInventoryAndRecipe({
      inventoryUnit: 'ml',
      quantity: 10,
      runId: `${runId}_unit_mismatch`,
    });
    const mismatchOutboxBefore = await countOutboxEventsForRunId(runId);
    const mismatchMovementsBefore = await getSaleUsageMovements(
      getEntityId(mismatchCase.inventoryItem, 'inventoryId'),
      runId,
    );
    let mismatchError = null;

    try {
      await createLocalRecipeSale({
        description: `recipe_sale_smoke_unit_mismatch_${runId}`,
        financials: { recipeId: getEntityId(mismatchCase.recipe, 'recipeId') },
        recipe: mismatchCase.recipe,
        saleQuantity: 1,
        saleTotal: 1000,
        stockMovementNotes: `recipe_sale_smoke_unit_mismatch_${runId}`,
      });
    } catch (error) {
      mismatchError = error;
      details.push('unit_mismatch_error_caught');
    }

    const mismatchInventoryAfter = await inventoryRepository.getById(
      mismatchCase.inventoryItem.id,
    );

    if (!isPlainObject(mismatchInventoryAfter)) {
      return createFailureResult({
        debug: successDebug(mismatchOutboxBefore),
        details,
        error: 'Unit-mismatch rollback inventory item was null',
        failedStep: 'unit_mismatch_inventory_persisted_item',
        runId,
      });
    }

    const mismatchLotAfter = getLot(mismatchInventoryAfter, mismatchCase.lotId);

    if (!isPlainObject(mismatchLotAfter)) {
      return createFailureResult({
        debug: successDebug(mismatchOutboxBefore),
        details,
        error: 'Unit-mismatch rollback inventory item did not include the tested lot',
        failedStep: 'unit_mismatch_inventory_persisted_lot',
        runId,
      });
    }

    const mismatchMovementsAfter = await getSaleUsageMovements(
      getEntityId(mismatchCase.inventoryItem, 'inventoryId'),
      runId,
    );
    const mismatchOutboxAfter = await countOutboxEventsForRunId(runId);
    lastOutboxRunCount = mismatchOutboxAfter;
    const mismatchRollbackPassed =
      mismatchError &&
      Number(mismatchLotAfter?.quantity) === 10 &&
      mismatchMovementsAfter.length === mismatchMovementsBefore.length &&
      mismatchOutboxAfter === mismatchOutboxBefore;

    if (!mismatchError) {
      return createFailureResult({
        debug: successDebug(mismatchOutboxAfter),
        details,
        error: 'Unit-mismatch sale did not throw',
        failedStep: 'unit_mismatch_error_expected',
        runId,
      });
    }

    if (Number(mismatchLotAfter.quantity) !== 10) {
      return createFailureResult({
        debug: successDebug(mismatchOutboxAfter),
        details,
        error: `Unit-mismatch rollback lot quantity was ${Number(mismatchLotAfter.quantity)} instead of 10`,
        failedStep: 'unit_mismatch_inventory_rollback_quantity',
        runId,
      });
    }

    if (mismatchMovementsAfter.length !== mismatchMovementsBefore.length) {
      return createFailureResult({
        debug: successDebug(mismatchOutboxAfter),
        details,
        error: 'Unit-mismatch rollback changed stock movement count',
        failedStep: 'unit_mismatch_movement_rollback_count',
        runId,
      });
    }

    if (mismatchOutboxAfter !== mismatchOutboxBefore) {
      return createFailureResult({
        debug: successDebug(mismatchOutboxAfter),
        details,
        error: 'Unit-mismatch rollback changed outbox count',
        failedStep: 'unit_mismatch_outbox_rollback_count',
        runId,
      });
    }

    return {
      details,
      insufficientStockRollback: {
        error: String(insufficientError?.message || insufficientError || ''),
        outboxRunCountAfter: insufficientOutboxAfter,
        outboxRunCountBefore: insufficientOutboxBefore,
        passed: Boolean(insufficientRollbackPassed),
        quantityAfter: Number(insufficientLotAfter?.quantity),
      },
      runId,
      success: Boolean(insufficientRollbackPassed && mismatchRollbackPassed),
      successfulSale: {
        movementCount: successMovements.length,
        outboxRunCountAfter: outboxAfterSuccess,
        outboxRunCountBefore: outboxBeforeSuccess,
        passed: true,
        quantityAfter: Number(lotAfterSuccess?.quantity),
        resultShapePassed: true,
        returnedMovementCount: saleResult?.stockMovements?.length || 0,
        returnedUpdatedInventoryCount:
          saleResult?.updatedInventoryItems?.length || 0,
        transactionId: getEntityId(transactionAfterSuccess, 'transactionId'),
      },
      unitMismatchRollback: {
        error: String(mismatchError?.message || mismatchError || ''),
        outboxRunCountAfter: mismatchOutboxAfter,
        outboxRunCountBefore: mismatchOutboxBefore,
        passed: Boolean(mismatchRollbackPassed),
        quantityAfter: Number(mismatchLotAfter?.quantity),
      },
    };
  } catch (error) {
    return createFailureResult({
      debug: getSaleResultDebug({
        outboxRunCount: lastOutboxRunCount,
        saleResult: lastSaleResult,
        transactionId: lastTransactionId,
      }),
      details,
      error: String(error?.message || error),
      failedStep: 'unexpected_exception',
      runId,
    });
  } finally {
    recipeSaleSmokeTestIsRunning = false;
  }
};

export default runRecipeSaleServiceSmokeTest;
