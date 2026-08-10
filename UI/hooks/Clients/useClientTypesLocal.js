import { useCallback, useEffect, useState } from 'react';

import { clientTypeRepository } from '../../data/repositories';
import { getCurrentGroupId } from '../../data/workspace/currentWorkspace';
import useCurrentWorkspaceScope from '../workspace/useCurrentWorkspaceScope';

const clientTypeCache = new Map();

export const normalizeClientType = (type = {}) => ({
  clientTypeId: `${type.clientTypeId || type.id || type.localId || ''}`,
  id: `${type.clientTypeId || type.id || type.localId || ''}`,
  name: type.name || '',
  normalizedName: type.normalizedName || String(type.name || '').toLowerCase(),
});

const sortClientTypes = (clientTypes) =>
  [...clientTypes].sort((typeA, typeB) =>
    String(typeA.name || '').localeCompare(String(typeB.name || ''), 'es', {
      sensitivity: 'base',
    }),
  );

export default function useClientTypesLocal({ autoLoad = true } = {}) {
  const { groupId, loading: workspaceLoading } = useCurrentWorkspaceScope({
    autoLoad,
  });
  const waitingForWorkspace = Boolean(autoLoad && workspaceLoading && !groupId);
  const cachedClientTypes = clientTypeCache.get(groupId);
  const [clientTypes, setClientTypes] = useState(
    () => cachedClientTypes || [],
  );
  const [isLoadingClientTypes, setIsLoadingClientTypes] = useState(
    () => Boolean(autoLoad) && !cachedClientTypes,
  );
  const [error, setError] = useState(null);

  const refreshClientTypes = useCallback(async () => {
    setIsLoadingClientTypes(true);
    setError(null);

    try {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const localClientTypes = await clientTypeRepository.getAll({
        groupId: effectiveGroupId,
      });
      const normalizedTypes = sortClientTypes(
        localClientTypes.map(normalizeClientType),
      );
      clientTypeCache.set(effectiveGroupId, normalizedTypes);
      setClientTypes(normalizedTypes);
      return normalizedTypes;
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setIsLoadingClientTypes(false);
    }
  }, [groupId]);

  const createClientType = useCallback(
    async (data, options = {}) => {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const clientType = normalizeClientType(
        await clientTypeRepository.createIfMissing(data, {
          groupId: effectiveGroupId,
          ...options,
        }),
      );
      await refreshClientTypes();
      return clientType;
    },
    [groupId, refreshClientTypes],
  );

  const deleteClientType = useCallback(
    async (id, options = {}) => {
      const clientType = await clientTypeRepository.softDelete(
        String(id),
        options,
      );
      await refreshClientTypes();
      return clientType ? normalizeClientType(clientType) : null;
    },
    [refreshClientTypes],
  );

  useEffect(() => {
    if (!autoLoad || waitingForWorkspace) {
      return;
    }

    if (clientTypeCache.has(groupId)) {
      setClientTypes(clientTypeCache.get(groupId));
    } else {
      setClientTypes([]);
    }

    refreshClientTypes().catch((requestError) => {
      console.warn('Error al cargar tipos de cliente locales:', requestError);
    });
  }, [autoLoad, groupId, refreshClientTypes, waitingForWorkspace]);

  return {
    clientTypes,
    createClientType,
    deleteClientType,
    error,
    isLoadingClientTypes,
    refreshClientTypes,
    setClientTypes,
  };
}
