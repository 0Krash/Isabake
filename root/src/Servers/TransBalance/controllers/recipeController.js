const Recipe = require('../models/recipeModel');
const asyncHandler = require('../utils/asyncHandler');
const { sendFail, sendSuccess } = require('../utils/httpResponses');

const sanitizeRecipePayload = (payload) => ({
  cost: Number(payload.cost || 0),
  ingredients: Array.isArray(payload.ingredients) ? payload.ingredients : [],
  name: payload.name,
  servings: Number(payload.servings || 1),
  steps: Array.isArray(payload.steps) ? payload.steps : [],
  type: payload.type || '',
});

exports.getAllRecipes = asyncHandler(async (req, res) => {
  const recipes = await Recipe.find().sort({ recipeId: 1 });

  sendSuccess(res, {
    data: recipes,
    result: recipes.length,
  });
});

exports.createRecipe = asyncHandler(async (req, res) => {
  const lastRecipe = await Recipe.findOne().sort({ recipeId: -1 });
  const nextRecipeId = (lastRecipe?.recipeId || 0) + 1;
  const recipe = await Recipe.create({
    ...sanitizeRecipePayload(req.body),
    recipeId: req.body.recipeId || nextRecipeId,
  });

  sendSuccess(res, {
    statusCode: 201,
    data: {
      recipe,
    },
  });
});

exports.updateRecipeById = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findOneAndUpdate(
    { recipeId: Number(req.params.recipeId) },
    sanitizeRecipePayload(req.body),
    {
      new: true,
      runValidators: true,
    }
  );

  if (!recipe) {
    return sendFail(res, {
      statusCode: 404,
      message: 'Receta no encontrada',
    });
  }

  sendSuccess(res, {
    data: {
      recipe,
    },
  });
});

exports.deleteRecipeById = asyncHandler(async (req, res) => {
  const result = await Recipe.deleteOne({
    recipeId: Number(req.params.recipeId),
  });

  if (result.deletedCount === 0) {
    return sendFail(res, {
      statusCode: 404,
      message: 'Receta no encontrada',
    });
  }

  sendSuccess(res);
});
