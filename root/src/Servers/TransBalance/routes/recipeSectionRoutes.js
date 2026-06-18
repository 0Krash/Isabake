const express = require('express');
const recipeSectionController = require('../controllers/recipeSectionController');

const router = express.Router();

router
  .route('/')
  .get(recipeSectionController.getAllRecipeSections)
  .post(recipeSectionController.createRecipeSection);

router
  .route('/:recipeSectionId')
  .delete(recipeSectionController.deleteRecipeSectionById);

module.exports = router;
