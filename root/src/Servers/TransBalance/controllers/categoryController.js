const Category = require('../models/categoryModel');
const asyncHandler = require('../utils/asyncHandler');
const { sendFail, sendSuccess } = require('../utils/httpResponses');

exports.getAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find();
  sendSuccess(res, {
    data: categories,
    result: categories.length,
  });
});

exports.getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ categoryId: req.params.id });

  if (!category) {
    return sendFail(res, {
      statusCode: 404,
      message: 'Categoría no encontrada',
    });
  }

  sendSuccess(res, { data: category });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const newCategory = await Category.create(req.body);

  sendSuccess(res, {
    statusCode: 201,
    data: {
      category: newCategory,
    },
  });
});
