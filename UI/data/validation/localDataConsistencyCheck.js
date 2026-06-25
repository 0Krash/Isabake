import {
  inventoryRepository,
  recipeRepository,
} from '../repositories';
import { idsMatch, normalizeId } from '../../utils/idUtils';

const hasValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== '';

const getInventoryId = (item = {}) =>
  normalizeId(item.inventoryId || item.id || item.localId);

const getLotId = (lot = {}) => normalizeId(lot.lotId || lot.id || lot.localId);

const getRecipeId = (recipe = {}) =>
  normalizeId(recipe.recipeId || recipe.id || recipe.localId);

const getIngredientId = (ingredient = {}) =>
  normalizeId(ingredient.ingredientId || ingredient.id || ingredient.localId);

export const runLocalDataConsistencyCheck = async () => {
  const warnings = [];
  const [recipes, inventoryItems] = await Promise.all([
    recipeRepository.getAll(),
    inventoryRepository.getAll(),
  ]);
  const inventoryIds = inventoryItems.map(getInventoryId);

  recipes.forEach((recipe) => {
    (recipe.ingredients || []).forEach((ingredient) => {
      const inventoryId = normalizeId(ingredient.inventoryId);

      if (!inventoryId) {
        warnings.push({
          code: 'recipe_ingredient_missing_inventory_id',
          ingredientId: getIngredientId(ingredient),
          ingredientName: ingredient.name || '',
          recipeId: getRecipeId(recipe),
          recipeName: recipe.name || '',
        });
        return;
      }

      const inventoryExists = inventoryIds.some((id) =>
        idsMatch(id, inventoryId),
      );

      if (!inventoryExists) {
        warnings.push({
          code: 'recipe_ingredient_inventory_not_found',
          ingredientId: getIngredientId(ingredient),
          ingredientName: ingredient.name || '',
          inventoryId,
          recipeId: getRecipeId(recipe),
          recipeName: recipe.name || '',
        });
      }
    });
  });

  inventoryItems.forEach((item) => {
    (item.lots || []).forEach((lot, index) => {
      const missingFields = [
        ['lotId', getLotId(lot)],
        ['quantity', lot.quantity],
        ['unit', lot.unit],
        ['cost', lot.cost],
      ]
        .filter(([, value]) => !hasValue(value))
        .map(([field]) => field);

      if (missingFields.length > 0) {
        warnings.push({
          code: 'inventory_lot_missing_required_fields',
          inventoryId: getInventoryId(item),
          inventoryName: item.name || '',
          lotId: getLotId(lot),
          lotIndex: index,
          missingFields,
        });
      }
    });
  });

  return {
    checkedAt: new Date().toISOString(),
    inventoryItemsChecked: inventoryItems.length,
    ok: warnings.length === 0,
    recipesChecked: recipes.length,
    warningCount: warnings.length,
    warnings,
  };
};

export default runLocalDataConsistencyCheck;
