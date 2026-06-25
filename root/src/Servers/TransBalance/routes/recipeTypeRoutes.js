const express = require('express');
const recipeTypeController = require('../controllers/recipeTypeController');

const router = express.Router();

router
  .route('/')
  .get(recipeTypeController.getAllRecipeTypes)
  .post(recipeTypeController.createRecipeType);

router.route('/:recipeTypeId').delete(recipeTypeController.deleteRecipeTypeById);

module.exports = router;
