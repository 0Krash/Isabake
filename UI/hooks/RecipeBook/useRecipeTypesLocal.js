import { useCallback, useEffect, useState } from 'react';

import { recipeTypeRepository } from '../../data/repositories';
import { getCurrentGroupId } from '../../data/workspace/currentWorkspace';
import useCurrentWorkspaceScope from '../workspace/useCurrentWorkspaceScope';

const recipeTypeCache = new Map();

export const normalizeRecipeType = (type = {}) => ({
  id: `${type.recipeTypeId || type.id || type.localId || ''}`,
  name: type.name || '',
  normalizedName: type.normalizedName || String(type.name || '').toLowerCase(),
  recipeTypeId: `${type.recipeTypeId || type.id || type.localId || ''}`,
});

const sortRecipeTypes = (recipeTypes) =>
  [...recipeTypes].sort((typeA, typeB) =>
    String(typeA.name || '').localeCompare(String(typeB.name || ''), 'es', {
      sensitivity: 'base',
    }),
  );

export default function useRecipeTypesLocal({ autoLoad = true } = {}) {
  const { groupId, loading: workspaceLoading } = useCurrentWorkspaceScope({
    autoLoad,
  });
  const waitingForWorkspace = Boolean(autoLoad && workspaceLoading && !groupId);
  const cachedRecipeTypes = recipeTypeCache.get(groupId);
  const [recipeTypes, setRecipeTypes] = useState(
    () => cachedRecipeTypes || [],
  );
  const [isLoadingRecipeTypes, setIsLoadingRecipeTypes] = useState(
    () => Boolean(autoLoad) && !cachedRecipeTypes,
  );
  const [error, setError] = useState(null);

  const refreshRecipeTypes = useCallback(async () => {
    setIsLoadingRecipeTypes(true);
    setError(null);

    try {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const localRecipeTypes = await recipeTypeRepository.getAll({
        groupId: effectiveGroupId,
      });
      const normalizedTypes = sortRecipeTypes(
        localRecipeTypes.map(normalizeRecipeType),
      );
      recipeTypeCache.set(effectiveGroupId, normalizedTypes);
      setRecipeTypes(normalizedTypes);
      return normalizedTypes;
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setIsLoadingRecipeTypes(false);
    }
  }, [groupId]);

  const createRecipeType = useCallback(
    async (data, options = {}) => {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const recipeType = normalizeRecipeType(
        await recipeTypeRepository.createIfMissing(data, {
          groupId: effectiveGroupId,
          ...options,
        }),
      );
      await refreshRecipeTypes();
      return recipeType;
    },
    [groupId, refreshRecipeTypes],
  );

  const deleteRecipeType = useCallback(
    async (id, options = {}) => {
      const recipeType = await recipeTypeRepository.softDelete(
        String(id),
        options,
      );
      await refreshRecipeTypes();
      return recipeType ? normalizeRecipeType(recipeType) : null;
    },
    [refreshRecipeTypes],
  );

  const updateRecipeType = useCallback(
    async (id, updates, options = {}) => {
      const recipeType = await recipeTypeRepository.update(
        String(id),
        updates,
        options,
      );
      await refreshRecipeTypes();
      return recipeType ? normalizeRecipeType(recipeType) : null;
    },
    [refreshRecipeTypes],
  );

  useEffect(() => {
    if (!autoLoad || waitingForWorkspace) {
      return;
    }

    if (recipeTypeCache.has(groupId)) {
      setRecipeTypes(recipeTypeCache.get(groupId));
    } else {
      setRecipeTypes([]);
    }

    refreshRecipeTypes().catch((requestError) => {
      console.warn('Error al cargar tipos de receta locales:', requestError);
    });
  }, [autoLoad, groupId, refreshRecipeTypes, waitingForWorkspace]);

  return {
    createRecipeType,
    deleteRecipeType,
    error,
    isLoadingRecipeTypes,
    recipeTypes,
    refreshRecipeTypes,
    setRecipeTypes,
    updateRecipeType,
  };
}
