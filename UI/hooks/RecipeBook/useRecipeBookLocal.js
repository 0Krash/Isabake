import { useCallback, useEffect, useRef, useState } from 'react';

import { recipeRepository } from '../../data/repositories';
import { getCurrentGroupId } from '../../data/workspace/currentWorkspace';
import useCurrentWorkspaceScope from '../workspace/useCurrentWorkspaceScope';

export const RECIPES_PAGE_SIZE = 20;
const recipeCache = new Map();

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

const getRecipeIdentity = (recipe) =>
  recipe.recipeId || recipe.id || recipe.localId || recipe.name;

export default function useRecipeBookLocal({ autoLoad = true } = {}) {
  const { groupId, loading: workspaceLoading } = useCurrentWorkspaceScope({
    autoLoad,
  });
  const waitingForWorkspace = Boolean(autoLoad && workspaceLoading && !groupId);
  const cachedRecipeState = recipeCache.get(groupId);
  const [recipes, setRecipes] = useState(
    () => cachedRecipeState?.recipes || [],
  );
  const [pagination, setPagination] = useState(
    () =>
      cachedRecipeState?.pagination || {
        hasMore: false,
        page: 0,
      },
  );
  const [isLoadingRecipes, setIsLoadingRecipes] =
    useState(() => Boolean(autoLoad) && !cachedRecipeState);
  const [isLoadingMoreRecipes, setIsLoadingMoreRecipes] = useState(false);
  const [error, setError] = useState(null);
  const isLoadingMoreRecipesRef = useRef(false);

  const fetchRecipesPage = useCallback(
    async (page) => {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const response = await recipeRepository.getPage({
        groupId: effectiveGroupId,
        limit: RECIPES_PAGE_SIZE,
        page,
      });

      return {
        data: sortRecipes((response.data || []).map(normalizeRecipe)),
        pagination: response.pagination || {
          hasMore: false,
          page,
        },
      };
    },
    [groupId],
  );

  const refreshRecipes = useCallback(async () => {
    setIsLoadingRecipes(true);
    setError(null);

    try {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const recipesResponse = await fetchRecipesPage(1);
      const nextState = {
        pagination: recipesResponse.pagination,
        recipes: recipesResponse.data,
      };

      recipeCache.set(effectiveGroupId, nextState);
      setPagination(nextState.pagination);
      setRecipes(nextState.recipes);
      return nextState.recipes;
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setIsLoadingRecipes(false);
      isLoadingMoreRecipesRef.current = false;
    }
  }, [fetchRecipesPage, groupId]);

  const loadMoreRecipes = useCallback(async () => {
    if (
      isLoadingRecipes ||
      isLoadingMoreRecipesRef.current ||
      !pagination.hasMore
    ) {
      return;
    }

    isLoadingMoreRecipesRef.current = true;
    setIsLoadingMoreRecipes(true);
    setError(null);

    try {
      const nextPage = (pagination.page || 1) + 1;
      const recipesResponse = await fetchRecipesPage(nextPage);
      const effectiveGroupId = groupId || (await getCurrentGroupId());

      setRecipes((currentRecipes) => {
        const loadedRecipeIds = new Set(currentRecipes.map(getRecipeIdentity));
        const nextRecipes = recipesResponse.data.filter((recipe) => {
          const recipeId = getRecipeIdentity(recipe);

          if (loadedRecipeIds.has(recipeId)) {
            return false;
          }

          loadedRecipeIds.add(recipeId);
          return true;
        });
        const updatedRecipes = [...currentRecipes, ...nextRecipes];

        recipeCache.set(effectiveGroupId, {
          pagination: recipesResponse.pagination,
          recipes: updatedRecipes,
        });

        return updatedRecipes;
      });
      setPagination(recipesResponse.pagination);
    } finally {
      isLoadingMoreRecipesRef.current = false;
      setIsLoadingMoreRecipes(false);
    }
  }, [
    fetchRecipesPage,
    groupId,
    isLoadingRecipes,
    pagination.hasMore,
    pagination.page,
  ]);

  const createRecipe = useCallback(
    async (data, options = {}) => {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const recipe = normalizeRecipe(
        await recipeRepository.create(toApiRecipe(data), {
          groupId: effectiveGroupId,
          ...options,
        }),
      );
      const visibleRecipes = await refreshRecipes();

      if (
        !visibleRecipes.some(
          (item) => getRecipeIdentity(item) === getRecipeIdentity(recipe),
        )
      ) {
        setRecipes((currentRecipes) => sortRecipes([...currentRecipes, recipe]));
      }

      return recipe;
    },
    [groupId, refreshRecipes],
  );

  const updateRecipe = useCallback(
    async (id, updates, options = {}) => {
      const recipe = await recipeRepository.update(
        String(id),
        toApiRecipe(updates),
        options,
      );

      if (!recipe) {
        throw new Error('Producto no encontrado');
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
        throw new Error('Producto no encontrado');
      }

      await refreshRecipes();
      return normalizeRecipe(recipe);
    },
    [refreshRecipes],
  );

  useEffect(() => {
    if (!autoLoad || waitingForWorkspace) {
      return;
    }

    if (recipeCache.has(groupId)) {
      const cached = recipeCache.get(groupId);
      setPagination(cached.pagination);
      setRecipes(cached.recipes);
    } else {
      setPagination({ hasMore: false, page: 0 });
      setRecipes([]);
    }

    refreshRecipes().catch((requestError) => {
      console.warn('Error al cargar productos locales:', requestError);
    });
  }, [autoLoad, groupId, refreshRecipes, waitingForWorkspace]);

  return {
    createRecipe,
    deleteRecipe,
    error,
    hasMoreRecipes: pagination.hasMore,
    isLoadingRecipes,
    isLoadingMoreRecipes,
    loadMoreRecipes,
    recipes,
    refreshRecipes,
    setRecipes,
    updateRecipe,
  };
}
