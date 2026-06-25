import { useCallback, useEffect, useState } from 'react';

import { recipeRepository } from '../../data/repositories';

const formatRecipeCost = (cost) => {
  if (typeof cost === 'string' && cost.trim().startsWith('$')) {
    return cost;
  }

  const numericCost = Number(cost || 0);
  return `$${numericCost.toFixed(2)}`;
};

export const normalizeRecipe = (recipe = {}) => ({
  cost: formatRecipeCost(recipe.cost),
  id: `${recipe.recipeId || recipe.id || recipe.localId || ''}`,
  ingredients: (recipe.ingredients || []).map((ingredient) => ({
    id: `${ingredient.ingredientId || ingredient.id || ingredient.localId || ''}`,
    ingredientId: `${
      ingredient.ingredientId || ingredient.id || ingredient.localId || ''
    }`,
    inventoryId:
      ingredient.inventoryId === null || ingredient.inventoryId === undefined
        ? null
        : ingredient.inventoryId,
    name: ingredient.name || '',
    quantity: ingredient.quantity || '',
    section: ingredient.section || '',
    unit: ingredient.unit || 'g',
  })),
  name: recipe.name || '',
  recipeId: `${recipe.recipeId || recipe.id || recipe.localId || ''}`,
  servings: Number(recipe.servings || 1),
  steps: (recipe.steps || []).map((step, index) => ({
    description: step.description || '',
    id: `${step.stepId || step.id || step.localId || ''}`,
    order: Number(step.order || index + 1),
    stepId: `${step.stepId || step.id || step.localId || ''}`,
  })),
  type: recipe.type || '',
});

export const toApiRecipe = (recipe = {}) => ({
  cost: Number(String(recipe.cost || '0').replace(/[^0-9.]/g, '')) || 0,
  ingredients: (recipe.ingredients || []).map((ingredient) => ({
    ingredientId: `${ingredient.ingredientId || ingredient.id}`,
    inventoryId:
      ingredient.inventoryId === null || ingredient.inventoryId === undefined
        ? null
        : ingredient.inventoryId,
    name: ingredient.name,
    quantity: ingredient.quantity,
    section: ingredient.section || '',
    unit: ingredient.unit,
  })),
  name: recipe.name,
  servings: Number(recipe.servings || 1),
  steps: (recipe.steps || []).map((step, index) => ({
    description: step.description,
    order: Number(step.order || index + 1),
    stepId: `${step.stepId || step.id}`,
  })),
  type: recipe.type || '',
});

const sortRecipes = (recipes) =>
  [...recipes].sort((recipeA, recipeB) =>
    String(recipeA.name || '').localeCompare(String(recipeB.name || ''), 'es', {
      sensitivity: 'base',
    }),
  );

export default function useRecipeBookLocal({ autoLoad = true } = {}) {
  const [recipes, setRecipes] = useState([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [error, setError] = useState(null);

  const refreshRecipes = useCallback(async () => {
    setIsLoadingRecipes(true);
    setError(null);

    try {
      const localRecipes = await recipeRepository.getAll();
      const normalizedRecipes = sortRecipes(localRecipes.map(normalizeRecipe));
      setRecipes(normalizedRecipes);
      return normalizedRecipes;
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setIsLoadingRecipes(false);
    }
  }, []);

  const createRecipe = useCallback(
    async (data, options = {}) => {
      const recipe = normalizeRecipe(
        await recipeRepository.create(toApiRecipe(data), options),
      );
      await refreshRecipes();
      return recipe;
    },
    [refreshRecipes],
  );

  const updateRecipe = useCallback(
    async (id, updates, options = {}) => {
      const recipe = await recipeRepository.update(
        String(id),
        toApiRecipe(updates),
        options,
      );

      if (!recipe) {
        throw new Error('Receta no encontrada');
      }

      const normalizedRecipe = normalizeRecipe(recipe);
      await refreshRecipes();
      return normalizedRecipe;
    },
    [refreshRecipes],
  );

  const deleteRecipe = useCallback(
    async (id, options = {}) => {
      const recipe = await recipeRepository.softDelete(String(id), options);

      if (!recipe) {
        throw new Error('Receta no encontrada');
      }

      await refreshRecipes();
      return normalizeRecipe(recipe);
    },
    [refreshRecipes],
  );

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    refreshRecipes().catch((requestError) => {
      console.warn('Error al cargar recetas locales:', requestError);
    });
  }, [autoLoad, refreshRecipes]);

  return {
    createRecipe,
    deleteRecipe,
    error,
    isLoadingRecipes,
    recipes,
    refreshRecipes,
    setRecipes,
    updateRecipe,
  };
}
