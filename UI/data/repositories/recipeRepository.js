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

const getByRecipeId = repository.getById;

export default {
  ...repository,
  getAll,
  getByRecipeId,
};
