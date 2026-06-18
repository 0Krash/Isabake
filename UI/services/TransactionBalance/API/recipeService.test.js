import axios from 'axios';

import recipeService from './recipeService';
import { URL_Recipes } from '@env';

jest.mock('axios');

describe('recipeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllRecipes returns recipes from response data payload', async () => {
    const recipes = [
      {
        recipeId: 1,
        name: 'Cheesecake',
        servings: 10,
        cost: 128.4,
        ingredients: [],
      },
    ];
    axios.get.mockResolvedValue({
      data: {
        data: recipes,
      },
    });

    await expect(recipeService.getAllRecipes()).resolves.toBe(recipes);
    expect(axios.get).toHaveBeenCalledWith(URL_Recipes);
  });

  test('postRecipe sends payload and returns API response', async () => {
    const payload = {
      cost: 0,
      ingredients: [],
      name: 'Brownies',
      servings: 12,
    };
    const apiResponse = {
      status: 'success',
      data: {
        recipe: {
          recipeId: 2,
          ...payload,
        },
      },
    };
    axios.post.mockResolvedValue({ data: apiResponse });

    await expect(recipeService.postRecipe(payload)).resolves.toBe(apiResponse);
    expect(axios.post).toHaveBeenCalledWith(URL_Recipes, payload);
  });

  test('updateRecipeById sends patch payload and returns API response', async () => {
    const payload = {
      cost: 120,
      ingredients: [],
      name: 'Cheesecake',
      servings: 8,
    };
    const apiResponse = {
      status: 'success',
      data: {
        recipe: {
          recipeId: 1,
          ...payload,
        },
      },
    };
    axios.patch.mockResolvedValue({ data: apiResponse });

    await expect(recipeService.updateRecipeById(1, payload)).resolves.toBe(
      apiResponse
    );
    expect(axios.patch).toHaveBeenCalledWith(`${URL_Recipes}/1`, payload);
  });

  test('deleteRecipeById deletes by URL id and returns API response', async () => {
    const apiResponse = { status: 'success' };
    axios.delete.mockResolvedValue({ data: apiResponse });

    await expect(recipeService.deleteRecipeById(1)).resolves.toBe(apiResponse);
    expect(axios.delete).toHaveBeenCalledWith(`${URL_Recipes}/1`);
  });

  test('propagates request errors', async () => {
    const requestError = new Error('network error');
    axios.get.mockRejectedValue(requestError);
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(recipeService.getAllRecipes()).rejects.toBe(requestError);

    console.warn.mockRestore();
  });
});
