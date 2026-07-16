import { useCallback, useEffect, useState } from 'react';

import { recipeSectionRepository } from '../../data/repositories';
import { getCurrentGroupId } from '../../data/workspace/currentWorkspace';
import useCurrentWorkspaceScope from '../workspace/useCurrentWorkspaceScope';

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
  const { groupId } = useCurrentWorkspaceScope({ autoLoad });
  const [recipeSections, setRecipeSections] = useState([]);
  const [isLoadingRecipeSections, setIsLoadingRecipeSections] = useState(false);
  const [error, setError] = useState(null);

  const refreshRecipeSections = useCallback(async () => {
    setIsLoadingRecipeSections(true);
    setError(null);

    try {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const localRecipeSections = await recipeSectionRepository.getAll({
        groupId: effectiveGroupId,
      });
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
  }, [groupId]);

  const createRecipeSection = useCallback(
    async (data, options = {}) => {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const recipeSection = normalizeRecipeSection(
        await recipeSectionRepository.createIfMissing(data, {
          groupId: effectiveGroupId,
          ...options,
        }),
      );
      await refreshRecipeSections();
      return recipeSection;
    },
    [groupId, refreshRecipeSections],
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
  }, [autoLoad, groupId, refreshRecipeSections]);

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
