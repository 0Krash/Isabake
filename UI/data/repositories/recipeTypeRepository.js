import { createRepository, normalizeName } from './repositoryUtils';

export const RECIPE_TYPE_COLLECTION = 'recipeTypes';

const normalizeRecipeType = (recipeType = {}) => {
  const name = String(recipeType.name || '').trim();

  return {
    name,
    normalizedName: recipeType.normalizedName || normalizeName(name),
  };
};

const repository = createRepository({
  collection: RECIPE_TYPE_COLLECTION,
  idField: 'recipeTypeId',
  idPrefix: 'recipe_type',
  prepareCreate: (recipeType, id) => ({
    ...normalizeRecipeType(recipeType),
    recipeTypeId: recipeType.recipeTypeId || id,
  }),
  prepareUpdate: (recipeType, id) => ({
    ...recipeType,
    ...normalizeRecipeType(recipeType),
    recipeTypeId: recipeType.recipeTypeId || id,
  }),
});

const getAll = async (options = {}) => {
  const recipeTypes = await repository.getAll(options);

  return recipeTypes.sort((typeA, typeB) =>
    String(typeA.name || '').localeCompare(String(typeB.name || ''), 'es', {
      sensitivity: 'base',
    }),
  );
};

const getByName = async (name, options = {}) => {
  const normalizedName = normalizeName(name);
  const recipeTypes = await getAll(options);

  return (
    recipeTypes.find((type) => type.normalizedName === normalizedName) || null
  );
};

const createIfMissing = async (data, options = {}) => {
  const existingType = await getByName(data.name, options);

  if (existingType) {
    return existingType;
  }

  return repository.create(data, options);
};

export default {
  ...repository,
  createIfMissing,
  getAll,
  getByName,
};
