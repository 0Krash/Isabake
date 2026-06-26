import { createRepository } from './repositoryUtils';

export const CATEGORY_COLLECTION = 'categories';

const capitalizeFirstLetter = (value = '') => {
  const trimmedValue = String(value || '').trim();

  if (!trimmedValue) {
    return '';
  }

  return `${trimmedValue.charAt(0).toLocaleUpperCase('es-MX')}${trimmedValue.slice(1)}`;
};

const normalizeCategory = (category = {}) => ({
  categoryId: category.categoryId || '',
  description: capitalizeFirstLetter(category.description),
  shortDescription: capitalizeFirstLetter(category.shortDescription),
});

const repository = createRepository({
  collection: CATEGORY_COLLECTION,
  idField: 'categoryId',
  idPrefix: 'category',
  prepareCreate: (category, id) => ({
    ...normalizeCategory(category),
    categoryId: category.categoryId || id,
  }),
  prepareUpdate: (category, id) => ({
    ...category,
    ...normalizeCategory(category),
    categoryId: category.categoryId || id,
  }),
});

const getAll = async (options = {}) => {
  const categories = await repository.getAll(options);

  return categories.sort((categoryA, categoryB) =>
    String(categoryA.shortDescription || categoryA.description || '').localeCompare(
      String(categoryB.shortDescription || categoryB.description || ''),
      'es',
      { sensitivity: 'base' },
    ),
  );
};

const getByCategoryId = repository.getById;

export default {
  ...repository,
  getAll,
  getByCategoryId,
};
