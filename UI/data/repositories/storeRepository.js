import { createRepository } from './repositoryUtils';

export const STORE_COLLECTION = 'stores';

const normalizeStore = (store = {}) => ({
  Address: store.Address || store.address || '',
  Alias: store.Alias || store.alias || '',
  Name: store.Name || store.name || '',
});

const repository = createRepository({
  collection: STORE_COLLECTION,
  idField: 'storeId',
  idPrefix: 'store',
  prepareCreate: (store, id) => ({
    ...normalizeStore(store),
    storeId: store.storeId || id,
  }),
  prepareUpdate: (store, id) => ({
    ...store,
    ...normalizeStore(store),
    storeId: store.storeId || id,
  }),
});

const getAll = async (options = {}) => {
  const stores = await repository.getAll(options);

  return stores.sort((storeA, storeB) =>
    String(storeA.Name || '').localeCompare(String(storeB.Name || ''), 'es', {
      sensitivity: 'base',
    }),
  );
};

const getByStoreId = repository.getById;

export default {
  ...repository,
  getAll,
  getByStoreId,
};
