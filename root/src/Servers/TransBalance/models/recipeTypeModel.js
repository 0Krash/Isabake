const mongoose = require('mongoose');

const recipeTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    recipeTypeId: {
      type: Number,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

const RecipeType = mongoose.model('RecipeType', recipeTypeSchema);

module.exports = RecipeType;
