import { useCallback, useEffect, useState } from 'react';

import recipeService from '../../services/TransactionBalance/API/recipeService';

export const normalizeRecipeType = (type) => ({
  id: `${type.recipeTypeId || type.id || type._id}`,
  name: type.name,
  normalizedName: type.normalizedName || String(type.name || '').toLowerCase(),
  recipeTypeId: Number(type.recipeTypeId || type.id || type._id),
});

export default function useRecipeTypesData() {
  const [recipeTypes, setRecipeTypes] = useState([]);
  const [isLoadingRecipeTypes, setIsLoadingRecipeTypes] = useState(false);
  const [error, setError] = useState(null);

  const refreshRecipeTypes = useCallback(async () => {
    setIsLoadingRecipeTypes(true);
    setError(null);

    try {
      const apiRecipeTypes = await recipeService.getAllRecipeTypes();
      setRecipeTypes(apiRecipeTypes.map(normalizeRecipeType));
    } catch (requestError) {
      console.warn('Error al cargar tipos de receta:', requestError);
      setError(requestError);
    } finally {
      setIsLoadingRecipeTypes(false);
    }
  }, []);

  useEffect(() => {
    refreshRecipeTypes();
  }, [refreshRecipeTypes]);

  return {
    error,
    isLoadingRecipeTypes,
    recipeTypes,
    refreshRecipeTypes,
    setRecipeTypes,
  };
}
