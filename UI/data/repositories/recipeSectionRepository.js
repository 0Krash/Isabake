import { createRepository, normalizeName } from './repositoryUtils';

export const RECIPE_SECTION_COLLECTION = 'recipeSections';

const normalizeRecipeSection = (recipeSection = {}) => {
  const name = String(recipeSection.name || '').trim();

  return {
    name,
    normalizedName: recipeSection.normalizedName || normalizeName(name),
  };
};

const repository = createRepository({
  collection: RECIPE_SECTION_COLLECTION,
  idField: 'recipeSectionId',
  idPrefix: 'recipe_section',
  prepareCreate: (recipeSection, id) => ({
    ...normalizeRecipeSection(recipeSection),
    recipeSectionId: recipeSection.recipeSectionId || id,
  }),
  prepareUpdate: (recipeSection, id) => ({
    ...recipeSection,
    ...normalizeRecipeSection(recipeSection),
    recipeSectionId: recipeSection.recipeSectionId || id,
  }),
});

const getAll = async (options = {}) => {
  const recipeSections = await repository.getAll(options);

  return recipeSections.sort((sectionA, sectionB) =>
    String(sectionA.name || '').localeCompare(
      String(sectionB.name || ''),
      'es',
      { sensitivity: 'base' },
    ),
  );
};

const getByName = async (name, options = {}) => {
  const normalizedName = normalizeName(name);
  const recipeSections = await getAll(options);

  return (
    recipeSections.find(
      (section) => section.normalizedName === normalizedName,
    ) || null
  );
};

const createIfMissing = async (data, options = {}) => {
  const existingSection = await getByName(data.name, options);

  if (existingSection) {
    return existingSection;
  }

  return repository.create(data, options);
};

export default {
  ...repository,
  createIfMissing,
  getAll,
  getByName,
};
