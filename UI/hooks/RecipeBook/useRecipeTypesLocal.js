import { useCallback, useEffect, useState } from 'react';

import { recipeTypeRepository } from '../../data/repositories';

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
  const [recipeTypes, setRecipeTypes] = useState([]);
  const [isLoadingRecipeTypes, setIsLoadingRecipeTypes] = useState(false);
  const [error, setError] = useState(null);

  const refreshRecipeTypes = useCallback(async () => {
    setIsLoadingRecipeTypes(true);
    setError(null);

    try {
      const localRecipeTypes = await recipeTypeRepository.getAll();
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
  }, []);

  const createRecipeType = useCallback(
    async (data, options = {}) => {
      const recipeType = normalizeRecipeType(
        await recipeTypeRepository.createIfMissing(data, options),
      );
      await refreshRecipeTypes();
      return recipeType;
    },
    [refreshRecipeTypes],
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
  }, [autoLoad, refreshRecipeTypes]);

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
