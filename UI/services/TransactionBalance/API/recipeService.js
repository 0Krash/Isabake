import axios from 'axios';
import { URL_Recipes, URL_Stores } from '@env';

const recipesUrl =
  URL_Recipes || (URL_Stores ? URL_Stores.replace('/stores', '/recipes') : '');

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

export default {
  deleteRecipeById,
  getAllRecipes,
  postRecipe,
  recipesUrl,
  updateRecipeById,
};
