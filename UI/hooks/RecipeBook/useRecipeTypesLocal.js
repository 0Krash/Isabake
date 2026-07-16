import { useCallback, useEffect, useState } from 'react';

import { recipeTypeRepository } from '../../data/repositories';
import { getCurrentGroupId } from '../../data/workspace/currentWorkspace';
import useCurrentWorkspaceScope from '../workspace/useCurrentWorkspaceScope';

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
  const { groupId } = useCurrentWorkspaceScope({ autoLoad });
  const [recipeTypes, setRecipeTypes] = useState([]);
  const [isLoadingRecipeTypes, setIsLoadingRecipeTypes] = useState(false);
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
    if (!autoLoad) {
      return;
    }

    refreshRecipeTypes().catch((requestError) => {
      console.warn('Error al cargar tipos de receta locales:', requestError);
    });
  }, [autoLoad, groupId, refreshRecipeTypes]);

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
