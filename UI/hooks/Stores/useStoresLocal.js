import { useCallback, useEffect, useState } from 'react';

import { storeRepository } from '../../data/repositories';

const getStoreValue = (store, key) =>
  store?.[key] || store?.[key.toLowerCase()] || '';

const sortStoresAlphabetically = (stores) =>
  [...stores].sort((storeA, storeB) => {
    const nameA = getStoreValue(storeA, 'Alias') || getStoreValue(storeA, 'Name');
    const nameB = getStoreValue(storeB, 'Alias') || getStoreValue(storeB, 'Name');

    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  });

const normalizeStorePayload = (store = {}) => ({
  Address: store.Address || store.address || 'Sin dirección',
  Alias: store.Alias || store.alias || '',
  Name: store.Name || store.name || '',
});

export default function useStoresLocal({ autoLoad = true } = {}) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshStores = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const localStores = await storeRepository.getAll();
      const sortedStores = sortStoresAlphabetically(localStores);
      setStores(sortedStores);
      return sortedStores;
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, []);

  const createStore = useCallback(
    async (data, options = {}) => {
      const store = await storeRepository.create(
        normalizeStorePayload(data),
        options,
      );
      await refreshStores();
      return store;
    },
    [refreshStores],
  );

  const updateStore = useCallback(
    async (id, updates, options = {}) => {
      const store = await storeRepository.update(
        String(id),
        normalizeStorePayload(updates),
        options,
      );
      if (!store) {
        throw new Error('Tienda no encontrada');
      }
      await refreshStores();
      return store;
    },
    [refreshStores],
  );

  const deleteStore = useCallback(
    async (id, options = {}) => {
      const store = await storeRepository.softDelete(String(id), options);
      if (!store) {
        throw new Error('Tienda no encontrada');
      }
      await refreshStores();
      return store;
    },
    [refreshStores],
  );

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    refreshStores().catch((requestError) => {
      console.warn('Error al cargar tiendas locales:', requestError);
    });
  }, [autoLoad, refreshStores]);

  return {
    createStore,
    deleteStore,
    error,
    loading,
    refreshStores,
    stores,
    updateStore,
  };
}
