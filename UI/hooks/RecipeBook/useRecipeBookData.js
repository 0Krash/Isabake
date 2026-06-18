import { useCallback, useEffect, useState } from 'react';

import recipeService from '../../services/TransactionBalance/API/recipeService';

const formatRecipeCost = (cost) => {
  const numericCost = Number(cost || 0);
  return `$${numericCost.toFixed(2)}`;
};

export const normalizeRecipe = (recipe) => ({
  cost: formatRecipeCost(recipe.cost),
  id: `${recipe.recipeId || recipe.id || recipe._id}`,
  ingredients: (recipe.ingredients || []).map((ingredient) => ({
    id: `${ingredient.ingredientId || ingredient.id || ingredient._id}`,
    inventoryId:
      ingredient.inventoryId === null || ingredient.inventoryId === undefined
        ? null
        : Number(ingredient.inventoryId),
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
  })),
  name: recipe.name,
  recipeId: Number(recipe.recipeId || recipe.id || recipe._id),
  servings: Number(recipe.servings || 1),
  steps: (recipe.steps || []).map((step, index) => ({
    description: step.description,
    id: `${step.stepId || step.id || step._id}`,
    order: Number(step.order || index + 1),
  })),
});

export const toApiRecipe = (recipe) => ({
  cost: Number(String(recipe.cost || '0').replace(/[^0-9.]/g, '')) || 0,
  ingredients: (recipe.ingredients || []).map((ingredient) => ({
    ingredientId: `${ingredient.id}`,
    inventoryId:
      ingredient.inventoryId === null || ingredient.inventoryId === undefined
        ? null
        : Number(ingredient.inventoryId),
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
  })),
  name: recipe.name,
  servings: Number(recipe.servings || 1),
  steps: (recipe.steps || []).map((step, index) => ({
    description: step.description,
    order: Number(step.order || index + 1),
    stepId: `${step.id}`,
  })),
});

export default function useRecipeBookData() {
  const [recipes, setRecipes] = useState([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [error, setError] = useState(null);

  const refreshRecipes = useCallback(async () => {
    setIsLoadingRecipes(true);
    setError(null);

    try {
      const apiRecipes = await recipeService.getAllRecipes();
      setRecipes(apiRecipes.map(normalizeRecipe));
    } catch (requestError) {
      console.warn('Error al cargar recetas:', requestError);
      setError(requestError);
    } finally {
      setIsLoadingRecipes(false);
    }
  }, []);

  useEffect(() => {
    refreshRecipes();
  }, [refreshRecipes]);

  return {
    error,
    isLoadingRecipes,
    recipes,
    refreshRecipes,
    setRecipes,
  };
}
