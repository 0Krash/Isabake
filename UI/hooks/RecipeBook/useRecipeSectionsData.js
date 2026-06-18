import { useCallback, useEffect, useState } from 'react';

import recipeService from '../../services/TransactionBalance/API/recipeService';

export const normalizeRecipeSection = (section) => ({
  id: `${section.recipeSectionId || section.id || section._id}`,
  name: section.name,
  normalizedName: section.normalizedName || String(section.name || '').toLowerCase(),
  recipeSectionId: Number(section.recipeSectionId || section.id || section._id),
});

export default function useRecipeSectionsData() {
  const [recipeSections, setRecipeSections] = useState([]);
  const [isLoadingRecipeSections, setIsLoadingRecipeSections] = useState(false);
  const [error, setError] = useState(null);

  const refreshRecipeSections = useCallback(async () => {
    setIsLoadingRecipeSections(true);
    setError(null);

    try {
      const apiRecipeSections = await recipeService.getAllRecipeSections();
      setRecipeSections(apiRecipeSections.map(normalizeRecipeSection));
    } catch (requestError) {
      console.warn('Error al cargar secciones de receta:', requestError);
      setError(requestError);
    } finally {
      setIsLoadingRecipeSections(false);
    }
  }, []);

  useEffect(() => {
    refreshRecipeSections();
  }, [refreshRecipeSections]);

  return {
    error,
    isLoadingRecipeSections,
    recipeSections,
    refreshRecipeSections,
    setRecipeSections,
  };
}
