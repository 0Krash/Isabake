import { createRepository, normalizeName } from './repositoryUtils';

export const CLIENT_TYPE_COLLECTION = 'clientTypes';

const capitalizeFirstLetter = (value = '') => {
  const trimmedValue = String(value || '').trim();

  if (!trimmedValue) {
    return '';
  }

  return `${trimmedValue.charAt(0).toLocaleUpperCase('es-MX')}${trimmedValue.slice(1)}`;
};

const normalizeClientType = (clientType = {}) => {
  const name = capitalizeFirstLetter(clientType.name);

  return {
    name,
    normalizedName: clientType.normalizedName || normalizeName(name),
  };
};

const repository = createRepository({
  collection: CLIENT_TYPE_COLLECTION,
  idField: 'clientTypeId',
  idPrefix: 'client_type',
  prepareCreate: (clientType, id) => ({
    ...normalizeClientType(clientType),
    clientTypeId: clientType.clientTypeId || id,
  }),
  prepareUpdate: (clientType, id) => ({
    ...clientType,
    ...normalizeClientType(clientType),
    clientTypeId: clientType.clientTypeId || id,
  }),
});

const getAll = async (options = {}) => {
  const clientTypes = await repository.getAll(options);

  return clientTypes.sort((typeA, typeB) =>
    String(typeA.name || '').localeCompare(String(typeB.name || ''), 'es', {
      sensitivity: 'base',
    }),
  );
};

const getByName = async (name, options = {}) => {
  const normalizedName = normalizeName(name);
  const clientTypes = await getAll(options);

  return (
    clientTypes.find((type) => type.normalizedName === normalizedName) || null
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
