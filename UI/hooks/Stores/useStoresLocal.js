import { useCallback, useEffect, useState } from 'react';

import { storeRepository } from '../../data/repositories';
import { getCurrentGroupId } from '../../data/workspace/currentWorkspace';
import useCurrentWorkspaceScope from '../workspace/useCurrentWorkspaceScope';

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
  Latitude: store.Latitude ?? store.latitude ?? null,
  Longitude: store.Longitude ?? store.longitude ?? null,
  Name: store.Name || store.name || '',
});

const getStoreId = (store = {}) => store.storeId || store.id || store.localId;

export default function useStoresLocal({ autoLoad = true } = {}) {
  const { groupId, loading: workspaceLoading } = useCurrentWorkspaceScope({
    autoLoad,
  });
  const waitingForWorkspace = Boolean(autoLoad && workspaceLoading && !groupId);
  const [stores, setStores] = useState([]);
  const [storesGroupId, setStoresGroupId] = useState(null);
  const [loading, setLoading] = useState(
    () => Boolean(autoLoad) && !waitingForWorkspace,
  );
  const [error, setError] = useState(null);

  const refreshStores = useCallback(async () => {
    const effectiveGroupId = groupId || (await getCurrentGroupId());

    if (!effectiveGroupId) {
      setStores([]);
      setStoresGroupId(null);
      setLoading(false);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const localStores = await storeRepository.getAll({
        groupId: effectiveGroupId,
      });
      const sortedStores = sortStoresAlphabetically(localStores);
      setStores(sortedStores);
      setStoresGroupId(effectiveGroupId);
      return sortedStores;
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const createStore = useCallback(
    async (data, options = {}) => {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const store = await storeRepository.create(
        normalizeStorePayload(data),
        {
          ...options,
          groupId: options.groupId ?? effectiveGroupId,
        },
      );
      setStores((currentStores) =>
        sortStoresAlphabetically([
          ...currentStores.filter(
            (currentStore) => getStoreId(currentStore) !== getStoreId(store),
          ),
          store,
        ]),
      );
      setStoresGroupId(effectiveGroupId);
      return store;
    },
    [groupId],
  );

  const updateStore = useCallback(
    async (id, updates, options = {}) => {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const targetStore = await storeRepository.getByStoreId(String(id), {
        includeDeleted: true,
      });

      if (!targetStore || targetStore.groupId !== effectiveGroupId) {
        throw new Error('Tienda no encontrada');
      }

      const store = await storeRepository.update(
        String(id),
        normalizeStorePayload(updates),
        {
          ...options,
          groupId: options.groupId ?? effectiveGroupId,
        },
      );
      if (!store) {
        throw new Error('Tienda no encontrada');
      }
      setStores((currentStores) =>
        sortStoresAlphabetically(
          currentStores.map((currentStore) =>
            getStoreId(currentStore) === getStoreId(store)
              ? store
              : currentStore,
          ),
        ),
      );
      setStoresGroupId(effectiveGroupId);
      return store;
    },
    [groupId],
  );

  const deleteStore = useCallback(
    async (id, options = {}) => {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const targetStore = await storeRepository.getByStoreId(String(id), {
        includeDeleted: true,
      });

      if (!targetStore || targetStore.groupId !== effectiveGroupId) {
        throw new Error('Tienda no encontrada');
      }

      const store = await storeRepository.softDelete(String(id), options);
      if (!store) {
        throw new Error('Tienda no encontrada');
      }
      setStores((currentStores) =>
        currentStores.filter(
          (currentStore) => getStoreId(currentStore) !== String(id),
        ),
      );
      setStoresGroupId(effectiveGroupId);
      return store;
    },
    [groupId],
  );

  useEffect(() => {
    if (!autoLoad || waitingForWorkspace) {
      setStores([]);
      setStoresGroupId(null);
      return;
    }

    refreshStores().catch((requestError) => {
      console.warn('Error al cargar tiendas locales:', requestError);
    });
  }, [autoLoad, refreshStores, waitingForWorkspace]);

  const visibleGroupId = groupId || storesGroupId;

  return {
    createStore,
    deleteStore,
    error,
    loading: loading || waitingForWorkspace,
    refreshStores,
    stores: storesGroupId === visibleGroupId ? stores : [],
    updateStore,
  };
}
