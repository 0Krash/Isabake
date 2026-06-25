import { runLocalTransaction } from '../db/localTransaction';
import {
  inventoryRepository,
  recipeRepository,
  transactionRepository,
} from '../repositories';
import { applyInventoryLotAdjustment } from './inventoryStockService';

const number = (value) =>
  Number(String(value ?? '0').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;

const units = {
  cda: ['spoon', 3],
  cdta: ['spoon', 1],
  g: ['weight', 1],
  kg: ['weight', 1000],
  l: ['volume', 1000],
  ml: ['volume', 1],
  pza: ['piece', 1],
};

const getEntityId = (entity, idField) => {
  if (!entity || typeof entity !== 'object') {
    return '';
  }

  return entity[idField] || entity.id || entity.localId || '';
};

const getLotId = (lot = {}) => lot.lotId || lot.id || lot.localId || '';

const unitsAreCompatible = (leftUnit, rightUnit) =>
  Boolean(units[leftUnit]) && units[leftUnit]?.[0] === units[rightUnit]?.[0];

const toBaseQuantity = (quantity, unit) => number(quantity) * (units[unit]?.[1] || 1);

const fromBaseQuantity = (quantity, unit) =>
  number(quantity) / (units[unit]?.[1] || 1);

const runWithOptionalTransaction = async (options, callback) => {
  if (options.db) {
    return callback(options.db);
  }

  return runLocalTransaction(callback);
};

const sortLotsForDeduction = (lots = []) =>
  lots
    .map((lot, index) => ({ index, lot }))
    .sort((left, right) => {
      const leftExpiry = Date.parse(left.lot.expiryDate || '');
      const rightExpiry = Date.parse(right.lot.expiryDate || '');
      const leftHasExpiry = Number.isFinite(leftExpiry);
      const rightHasExpiry = Number.isFinite(rightExpiry);

      if (leftHasExpiry !== rightHasExpiry) {
        return leftHasExpiry ? -1 : 1;
      }

      if (leftHasExpiry && leftExpiry !== rightExpiry) {
        return leftExpiry - rightExpiry;
      }

      const leftPurchase = Date.parse(left.lot.purchaseDate || '');
      const rightPurchase = Date.parse(right.lot.purchaseDate || '');
      const leftHasPurchase = Number.isFinite(leftPurchase);
      const rightHasPurchase = Number.isFinite(rightPurchase);

      if (leftHasPurchase !== rightHasPurchase) {
        return leftHasPurchase ? -1 : 1;
      }

      if (leftHasPurchase && leftPurchase !== rightPurchase) {
        return leftPurchase - rightPurchase;
      }

      return left.index - right.index;
    })
    .map(({ lot }) => lot);

const getDeductionIngredients = (recipe, saleQuantity) => {
  const recipeServings = Math.max(number(recipe.servings), 1);
  const saleScale = recipeServings ? number(saleQuantity) / recipeServings : 0;

  return (recipe.ingredients || []).map((ingredient) => ({
    ...ingredient,
    quantity: number(ingredient.quantity) * saleScale,
  }));
};

const buildTransactionPayload = ({
  amount,
  category,
  description,
  financials,
  itemQuantity,
  quantity,
  selectedDate,
  store,
  transactionType,
  uomId,
}) => ({
  amount,
  category,
  description,
  financials,
  itemQuantity,
  quantity,
  selectedDate,
  store,
  transactionType,
  uomId,
});

export const createLocalRecipeSale = async (
  {
    category = { description: 'Recetas', shortDescription: 'Recetas' },
    description,
    financials,
    recipe,
    saleQuantity,
    saleTotal,
    selectedDate = new Date().toISOString(),
    store = null,
    stockMovementNotes,
  },
  options = {},
) =>
  runWithOptionalTransaction(options, async (db) => {
    const recipeId = getEntityId(recipe, 'recipeId');

    if (!recipeId) {
      throw new Error('La receta no tiene identificador local.');
    }

    const localRecipe = await recipeRepository.getById(recipeId, { db });

    if (!localRecipe) {
      throw new Error('La receta no existe en el recetario local.');
    }

    if (!Array.isArray(localRecipe.ingredients) || !localRecipe.ingredients.length) {
      throw new Error('La receta local no tiene ingredientes.');
    }

    const deductionIngredients = getDeductionIngredients(localRecipe, saleQuantity);

    if (!deductionIngredients.length) {
      throw new Error('La receta no tiene ingredientes para descontar.');
    }

    const transaction = await transactionRepository.create(
      buildTransactionPayload({
        amount: Math.round(number(saleTotal)),
        category,
        description: description || `Venta de ${recipe.name || localRecipe.name}`,
        financials,
        itemQuantity: `${saleQuantity}`,
        quantity: `${saleQuantity}`,
        selectedDate,
        store,
        transactionType: 'Ventas',
        uomId: 'pza',
      }),
      { ...options, db },
    );

    if (!transaction || typeof transaction !== 'object') {
      throw new Error('No se pudo crear la transacción local de la venta.');
    }

    const transactionId = getEntityId(transaction, 'transactionId');

    if (!transactionId) {
      throw new Error('La transacción local de la venta no tiene identificador.');
    }

    const relatedRecipeId = getEntityId(localRecipe, 'recipeId');
    const deductions = [];
    const stockMovements = [];
    const updatedInventoryItemsById = new Map();

    for (const ingredient of deductionIngredients) {
      const inventoryId = ingredient.inventoryId;
      const requiredQuantity = number(ingredient.quantity);
      const unit = ingredient.unit;

      if (!inventoryId) {
        throw new Error(`El ingrediente "${ingredient.name || ''}" no tiene inventario asociado.`);
      }

      if (!unit) {
        throw new Error(`El ingrediente "${ingredient.name || ''}" no tiene unidad.`);
      }

      if (!Number.isFinite(requiredQuantity) || requiredQuantity <= 0) {
        throw new Error(`Cantidad inválida para "${ingredient.name || ''}".`);
      }

      const inventoryItem = await inventoryRepository.getById(inventoryId, {
        db,
      });

      if (!inventoryItem) {
        throw new Error(`No existe inventario local para "${ingredient.name || inventoryId}".`);
      }

      const lots = Array.isArray(inventoryItem.lots) ? inventoryItem.lots : [];
      const compatibleLots = sortLotsForDeduction(lots).filter(
        (lot) => unitsAreCompatible(lot.unit, unit) && number(lot.quantity) > 0,
      );
      const hasCompatibleUnitLot = compatibleLots.length > 0;

      if (!hasCompatibleUnitLot) {
        throw new Error(
          `No hay lotes compatibles con ${unit} para "${ingredient.name || inventoryItem.name}".`,
        );
      }

      const requiredBaseQuantity = toBaseQuantity(requiredQuantity, unit);
      const availableQuantity = compatibleLots.reduce(
        (sum, lot) => sum + toBaseQuantity(lot.quantity, lot.unit),
        0,
      );

      if (availableQuantity < requiredBaseQuantity) {
        throw new Error(
          `Stock insuficiente para "${ingredient.name || inventoryItem.name}". Disponible: ${fromBaseQuantity(availableQuantity, unit)} ${unit}. Requerido: ${requiredQuantity} ${unit}.`,
        );
      }

      let remainingBaseQuantity = requiredBaseQuantity;

      for (const lot of compatibleLots) {
        if (remainingBaseQuantity <= 0) {
          break;
        }

        const lotBaseQuantity = toBaseQuantity(lot.quantity, lot.unit);
        const baseQuantityToDeduct = Math.min(
          lotBaseQuantity,
          remainingBaseQuantity,
        );
        const lotQuantityToDeduct = fromBaseQuantity(
          baseQuantityToDeduct,
          lot.unit,
        );
        const ingredientQuantityToDeduct = fromBaseQuantity(
          baseQuantityToDeduct,
          unit,
        );
        const lotId = getLotId(lot);

        const adjustmentResult = await applyInventoryLotAdjustment(
          {
            inventoryId,
            lotId,
            notes: stockMovementNotes || `Venta de ${recipe.name || localRecipe.name}`,
            quantityDelta: -lotQuantityToDeduct,
            reason: 'recipe_sale',
            relatedRecipeId,
            relatedTransactionId: transactionId,
            type: 'sale_usage',
            unit: lot.unit,
          },
          { ...options, db },
        );

        if (adjustmentResult?.stockMovement) {
          stockMovements.push(adjustmentResult.stockMovement);
        }

        if (adjustmentResult?.inventoryItem) {
          updatedInventoryItemsById.set(
            getEntityId(adjustmentResult.inventoryItem, 'inventoryId'),
            adjustmentResult.inventoryItem,
          );
        }

        deductions.push({
          inventoryId,
          lotId,
          quantity: ingredientQuantityToDeduct,
          sourceQuantity: lotQuantityToDeduct,
          sourceUnit: lot.unit,
          unit,
        });
        remainingBaseQuantity -= baseQuantityToDeduct;
      }
    }

    return {
      deductions,
      operation: {
        deductionCount: deductions.length,
        recipeId: relatedRecipeId,
        saleQuantity: number(saleQuantity),
        saleTotal: Math.round(number(saleTotal)),
        stockMovementCount: stockMovements.length,
        transactionId,
        type: 'recipe_sale',
      },
      stockMovements,
      transaction,
      updatedInventoryItems: Array.from(updatedInventoryItemsById.values()),
    };
  });

export default {
  createLocalRecipeSale,
};
