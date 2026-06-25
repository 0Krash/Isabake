const Recipe = require('../models/recipeModel');
const RecipeType = require('../models/recipeTypeModel');
const asyncHandler = require('../utils/asyncHandler');
const { sendFail, sendSuccess } = require('../utils/httpResponses');

const normalizeTypeName = (name) =>
  String(name || '')
    .trim()
    .toLowerCase();

exports.getAllRecipeTypes = asyncHandler(async (req, res) => {
  const recipeTypes = await RecipeType.find().sort({
    name: 1,
    recipeTypeId: 1,
  });

  sendSuccess(res, {
    data: recipeTypes,
    result: recipeTypes.length,
  });
});

exports.createRecipeType = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();

  if (!name) {
    return sendFail(res, {
      message: 'El tipo de receta es requerido',
    });
  }

  const normalizedName = normalizeTypeName(name);
  const existingType = await RecipeType.findOne({ normalizedName });

  if (existingType) {
    return sendSuccess(res, {
      data: {
        recipeType: existingType,
      },
    });
  }

  const lastRecipeType = await RecipeType.findOne().sort({
    recipeTypeId: -1,
  });
  const nextRecipeTypeId = (lastRecipeType?.recipeTypeId || 0) + 1;
  const recipeType = await RecipeType.create({
    name,
    normalizedName,
    recipeTypeId: req.body.recipeTypeId || nextRecipeTypeId,
  });

  sendSuccess(res, {
    statusCode: 201,
    data: {
      recipeType,
    },
  });
});

exports.deleteRecipeTypeById = asyncHandler(async (req, res) => {
  const recipeTypeId = Number(req.params.recipeTypeId);
  const recipeType = await RecipeType.findOne({ recipeTypeId });

  if (!recipeType) {
    return sendFail(res, {
      statusCode: 404,
      message: 'Tipo de receta no encontrado',
    });
  }

  await Recipe.updateMany({ type: recipeType.name }, { $set: { type: '' } });
  await RecipeType.deleteOne({ recipeTypeId });

  sendSuccess(res);
});
