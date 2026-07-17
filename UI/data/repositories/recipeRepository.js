import { createRepository } from './repositoryUtils';

export const RECIPE_COLLECTION = 'recipes';

const capitalizeFirstLetter = (value = '') => {
  const trimmedValue = String(value || '').trim();

  if (!trimmedValue) {
    return '';
  }

  return `${trimmedValue.charAt(0).toLocaleUpperCase('es-MX')}${trimmedValue.slice(1)}`;
};

const normalizeRecipe = (recipe = {}) => ({
  cost: Number(recipe.cost || 0),
  ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
  name: capitalizeFirstLetter(recipe.name),
  servings: Number(recipe.servings || 1),
  steps: Array.isArray(recipe.steps) ? recipe.steps : [],
  type: capitalizeFirstLetter(recipe.type),
});

const repository = createRepository({
  collection: RECIPE_COLLECTION,
  idField: 'recipeId',
  idPrefix: 'recipe',
  prepareCreate: (recipe, id) => ({
    ...normalizeRecipe(recipe),
    recipeId: recipe.recipeId || id,
  }),
  prepareUpdate: (recipe, id) => ({
    ...recipe,
    ...normalizeRecipe(recipe),
    recipeId: recipe.recipeId || id,
  }),
});

const getAll = async (options = {}) => {
  const recipes = await repository.getAll(options);

  return recipes.sort((recipeA, recipeB) =>
    String(recipeA.name || '').localeCompare(String(recipeB.name || ''), 'es', {
      sensitivity: 'base',
    }),
  );
};

const getPage = async ({ groupId, limit = 20, page = 1 } = {}) => {
  const allRecipes = await getAll({ groupId });
  const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const start = (normalizedPage - 1) * normalizedLimit;
  const data = allRecipes.slice(start, start + normalizedLimit);

  return {
    data,
    pagination: {
      hasMore: start + data.length < allRecipes.length,
      limit: normalizedLimit,
      page: normalizedPage,
      total: allRecipes.length,
      totalPages: Math.ceil(allRecipes.length / normalizedLimit),
    },
    result: data.length,
    status: 'success',
  };
};

const getByRecipeId = repository.getById;

export default {
  ...repository,
  getAll,
  getByRecipeId,
  getPage,
};
