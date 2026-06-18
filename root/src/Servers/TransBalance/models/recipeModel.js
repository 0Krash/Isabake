const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema(
  {
    ingredientId: {
      type: String,
      required: true,
    },
    inventoryId: {
      type: Number,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      default: '',
      trim: true,
    },
    unit: {
      type: String,
      enum: ['g', 'kg', 'ml', 'l', 'pza', 'cda', 'cdta'],
      required: true,
    },
  },
  { _id: false }
);

const preparationStepSchema = new mongoose.Schema(
  {
    stepId: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    recipeId: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    servings: {
      type: Number,
      default: 1,
      min: 1,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    ingredients: {
      type: [ingredientSchema],
      default: [],
    },
    steps: {
      type: [preparationStepSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const Recipe = mongoose.model('Recipe', recipeSchema);

module.exports = Recipe;
