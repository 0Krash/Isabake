import { useCallback, useEffect, useState } from 'react';

import { recipeSectionRepository } from '../../data/repositories';

export const normalizeRecipeSection = (section = {}) => ({
  id: `${section.recipeSectionId || section.id || section.localId || ''}`,
  name: section.name || '',
  normalizedName:
    section.normalizedName || String(section.name || '').toLowerCase(),
  recipeSectionId: `${
    section.recipeSectionId || section.id || section.localId || ''
  }`,
});

const sortRecipeSections = (recipeSections) =>
  [...recipeSections].sort((sectionA, sectionB) =>
    String(sectionA.name || '').localeCompare(
      String(sectionB.name || ''),
      'es',
      { sensitivity: 'base' },
    ),
  );

export default function useRecipeSectionsLocal({ autoLoad = true } = {}) {
  const [recipeSections, setRecipeSections] = useState([]);
  const [isLoadingRecipeSections, setIsLoadingRecipeSections] = useState(false);
  const [error, setError] = useState(null);

  const refreshRecipeSections = useCallback(async () => {
    setIsLoadingRecipeSections(true);
    setError(null);

    try {
      const localRecipeSections = await recipeSectionRepository.getAll();
      const normalizedSections = sortRecipeSections(
        localRecipeSections.map(normalizeRecipeSection),
      );
      setRecipeSections(normalizedSections);
      return normalizedSections;
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setIsLoadingRecipeSections(false);
    }
  }, []);

  const createRecipeSection = useCallback(
    async (data, options = {}) => {
      const recipeSection = normalizeRecipeSection(
        await recipeSectionRepository.createIfMissing(data, options),
      );
      await refreshRecipeSections();
      return recipeSection;
    },
    [refreshRecipeSections],
  );

  const deleteRecipeSection = useCallback(
    async (id, options = {}) => {
      const recipeSection = await recipeSectionRepository.softDelete(
        String(id),
        options,
      );
      await refreshRecipeSections();
      return recipeSection ? normalizeRecipeSection(recipeSection) : null;
    },
    [refreshRecipeSections],
  );

  const updateRecipeSection = useCallback(
    async (id, updates, options = {}) => {
      const recipeSection = await recipeSectionRepository.update(
        String(id),
        updates,
        options,
      );
      await refreshRecipeSections();
      return recipeSection ? normalizeRecipeSection(recipeSection) : null;
    },
    [refreshRecipeSections],
  );

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    refreshRecipeSections().catch((requestError) => {
      console.warn('Error al cargar secciones de receta locales:', requestError);
    });
  }, [autoLoad, refreshRecipeSections]);

  return {
    createRecipeSection,
    deleteRecipeSection,
    error,
    isLoadingRecipeSections,
    recipeSections,
    refreshRecipeSections,
    setRecipeSections,
    updateRecipeSection,
  };
}
