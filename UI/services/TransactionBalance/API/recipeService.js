import axios from 'axios';
import { URL_Recipes, URL_Stores } from '@env';

const recipesUrl =
  URL_Recipes || (URL_Stores ? URL_Stores.replace('/stores', '/recipes') : '');
const recipeSectionsUrl = recipesUrl
  ? recipesUrl.replace('/recipes', '/recipe-sections')
  : '';
const recipeTypesUrl = recipesUrl
  ? recipesUrl.replace('/recipes', '/recipe-types')
  : '';

const getAllRecipes = async () => {
  try {
    const response = await axios.get(recipesUrl);
    return response.data.data;
  } catch (error) {
    console.warn('Error al hacer la petición desde getAllRecipes:', error);
    throw error;
  }
};

const postRecipe = async (data) => {
  try {
    const response = await axios.post(recipesUrl, data);
    return response.data;
  } catch (error) {
    console.warn('Error al hacer la petición desde postRecipe:', error);
    throw error;
  }
};

const updateRecipeById = async (recipeId, data) => {
  try {
    const response = await axios.patch(`${recipesUrl}/${recipeId}`, data);
    return response.data;
  } catch (error) {
    console.warn('Error al hacer la petición desde updateRecipeById:', error);
    throw error;
  }
};

const deleteRecipeById = async (recipeId) => {
  try {
    const response = await axios.delete(`${recipesUrl}/${recipeId}`);
    return response.data;
  } catch (error) {
    console.warn('Error al hacer la petición desde deleteRecipeById:', error);
    throw error;
  }
};

const getAllRecipeSections = async () => {
  try {
    const response = await axios.get(recipeSectionsUrl);
    return response.data.data;
  } catch (error) {
    console.warn(
      'Error al hacer la petición desde getAllRecipeSections:',
      error
    );
    throw error;
  }
};

const postRecipeSection = async (data) => {
  try {
    const response = await axios.post(recipeSectionsUrl, data);
    return response.data;
  } catch (error) {
    console.warn('Error al hacer la petición desde postRecipeSection:', error);
    throw error;
  }
};

const deleteRecipeSectionById = async (recipeSectionId) => {
  try {
    const response = await axios.delete(
      `${recipeSectionsUrl}/${recipeSectionId}`
    );
    return response.data;
  } catch (error) {
    console.warn(
      'Error al hacer la petición desde deleteRecipeSectionById:',
      error
    );
    throw error;
  }
};

const getAllRecipeTypes = async () => {
  try {
    const response = await axios.get(recipeTypesUrl);
    return response.data.data;
  } catch (error) {
    console.warn('Error al hacer la petición desde getAllRecipeTypes:', error);
    throw error;
  }
};

const postRecipeType = async (data) => {
  try {
    const response = await axios.post(recipeTypesUrl, data);
    return response.data;
  } catch (error) {
    console.warn('Error al hacer la petición desde postRecipeType:', error);
    throw error;
  }
};

const deleteRecipeTypeById = async (recipeTypeId) => {
  try {
    const response = await axios.delete(`${recipeTypesUrl}/${recipeTypeId}`);
    return response.data;
  } catch (error) {
    console.warn('Error al hacer la petición desde deleteRecipeTypeById:', error);
    throw error;
  }
};

export default {
  deleteRecipeById,
  deleteRecipeSectionById,
  deleteRecipeTypeById,
  getAllRecipes,
  getAllRecipeSections,
  getAllRecipeTypes,
  postRecipe,
  postRecipeSection,
  postRecipeType,
  recipesUrl,
  recipeSectionsUrl,
  recipeTypesUrl,
  updateRecipeById,
};
