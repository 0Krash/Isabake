const Recipe = require('../models/recipeModel');
const RecipeSection = require('../models/recipeSectionModel');
const asyncHandler = require('../utils/asyncHandler');
const { sendFail, sendSuccess } = require('../utils/httpResponses');

const normalizeSectionName = (name) =>
  String(name || '')
    .trim()
    .toLowerCase();

exports.getAllRecipeSections = asyncHandler(async (req, res) => {
  const recipeSections = await RecipeSection.find().sort({
    name: 1,
    recipeSectionId: 1,
  });

  sendSuccess(res, {
    data: recipeSections,
    result: recipeSections.length,
  });
});

exports.createRecipeSection = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();

  if (!name) {
    return sendFail(res, {
      message: 'La sección es requerida',
    });
  }

  const normalizedName = normalizeSectionName(name);
  const existingSection = await RecipeSection.findOne({ normalizedName });

  if (existingSection) {
    return sendSuccess(res, {
      data: {
        recipeSection: existingSection,
      },
    });
  }

  const lastRecipeSection = await RecipeSection.findOne().sort({
    recipeSectionId: -1,
  });
  const nextRecipeSectionId = (lastRecipeSection?.recipeSectionId || 0) + 1;
  const recipeSection = await RecipeSection.create({
    name,
    normalizedName,
    recipeSectionId: req.body.recipeSectionId || nextRecipeSectionId,
  });

  sendSuccess(res, {
    statusCode: 201,
    data: {
      recipeSection,
    },
  });
});

exports.deleteRecipeSectionById = asyncHandler(async (req, res) => {
  const recipeSectionId = Number(req.params.recipeSectionId);
  const recipeSection = await RecipeSection.findOne({ recipeSectionId });

  if (!recipeSection) {
    return sendFail(res, {
      statusCode: 404,
      message: 'Sección no encontrada',
    });
  }

  await Recipe.updateMany(
    { 'ingredients.section': recipeSection.name },
    { $set: { 'ingredients.$[ingredient].section': '' } },
    { arrayFilters: [{ 'ingredient.section': recipeSection.name }] },
  );

  await RecipeSection.deleteOne({ recipeSectionId });

  sendSuccess(res);
});
