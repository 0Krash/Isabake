const express = require('express');
const recipeController = require('../controllers/recipeController');

const router = express.Router();

router
  .route('/')
  .get(recipeController.getAllRecipes)
  .post(recipeController.createRecipe);

router
  .route('/:recipeId')
  .patch(recipeController.updateRecipeById)
  .delete(recipeController.deleteRecipeById);

module.exports = router;
