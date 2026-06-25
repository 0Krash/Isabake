const mongoose = require('mongoose');

const recipeSectionSchema = new mongoose.Schema(
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
    recipeSectionId: {
      type: Number,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

const RecipeSection = mongoose.model('RecipeSection', recipeSectionSchema);

module.exports = RecipeSection;
