const request = require('supertest');

jest.mock('../models/transactionModel', () => ({
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  deleteOne: jest.fn(),
  find: jest.fn(),
}));

jest.mock('../models/categoryModel', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../models/storeModel', () => ({
  create: jest.fn(),
  deleteOne: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock('../models/recipeModel', () => ({
  create: jest.fn(),
  deleteOne: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

const app = require('../app');
const Category = require('../models/categoryModel');
const Recipe = require('../models/recipeModel');
const Store = require('../models/storeModel');
const Transaction = require('../models/transactionModel');

describe('TransBalance API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/transactions', () => {
    test('responds with paginated transactions', async () => {
      const transactions = [
        {
          transactionId: 'tx-1',
          transactionType: 'Ventas',
          description: 'Pastel',
          amount: 15000,
        },
      ];
      const limit = jest.fn().mockResolvedValue(transactions);
      const skip = jest.fn().mockReturnValue({ limit });
      const sort = jest.fn().mockReturnValue({ skip });
      Transaction.find.mockReturnValue({ sort });
      Transaction.countDocuments.mockResolvedValue(21);

      const response = await request(app).get(
        '/api/v1/transactions?page=2&limit=20&transactionType=Ventas'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        result: 1,
        pagination: {
          hasMore: false,
          limit: 20,
          page: 2,
          total: 21,
          totalPages: 2,
        },
        data: transactions,
      });
      expect(Transaction.find).toHaveBeenCalledWith({
        transactionType: 'Ventas',
      });
      expect(sort).toHaveBeenCalledWith({
        _id: -1,
        selectedDate: -1,
        transactionId: -1,
      });
      expect(skip).toHaveBeenCalledWith(20);
      expect(limit).toHaveBeenCalledWith(20);
      expect(Transaction.countDocuments).toHaveBeenCalledWith({
        transactionType: 'Ventas',
      });
    });
  });

  describe('POST /api/v1/transactions', () => {
    test('creates a transaction', async () => {
      const payload = {
        transactionType: 'Gastos',
        description: 'Harina',
        amount: 2500,
        quantity: '1',
      };
      const createdTransaction = {
        transactionId: 'tx-2',
        ...payload,
      };
      Transaction.create.mockResolvedValue(createdTransaction);

      const response = await request(app)
        .post('/api/v1/transactions')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          transaction: createdTransaction,
        },
      });
      expect(Transaction.create).toHaveBeenCalledWith(payload);
    });

    test('returns failed response when creation throws', async () => {
      Transaction.create.mockRejectedValue(new Error('invalid payload'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/v1/transactions')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'failed',
        message: 'invalid payload',
      });

      console.error.mockRestore();
    });
  });

  describe('DELETE /api/v1/transactions/:transactionId', () => {
    test('deletes a transaction by transactionId', async () => {
      Transaction.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const response = await request(app).delete('/api/v1/transactions/tx-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
      expect(Transaction.deleteOne).toHaveBeenCalledWith({
        transactionId: 'tx-1',
      });
    });

    test('returns 404 when transaction does not exist', async () => {
      Transaction.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const response = await request(app).delete('/api/v1/transactions/tx-404');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'failed',
        message: 'No se encontró la transacción',
      });
    });
  });

  describe('transaction summaries', () => {
    test('returns total amount by category', async () => {
      const summary = [
        {
          transactionType: 'Ventas',
          categories: [{ category: 'Ventas', totalAmount: 12000 }],
          total: 12000,
        },
      ];
      Transaction.aggregate.mockResolvedValue(summary);

      const response = await request(app).get(
        '/api/v1/transactions/totalAmountByCategory'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(summary);
      expect(Transaction.aggregate).toHaveBeenCalledTimes(1);
    });

    test('returns total amount by date and category', async () => {
      const summary = [
        {
          transactionType: 'Gastos',
          months: [{ year: 2026, month: 6, monthTotalAmount: 5000 }],
          transactionTotalAmount: 5000,
        },
      ];
      Transaction.aggregate.mockResolvedValue(summary);

      const response = await request(app).get(
        '/api/v1/transactions/totalAmountByDateCategory'
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(summary);
      expect(Transaction.aggregate).toHaveBeenCalledTimes(1);
    });
  });

  describe('categories', () => {
    test('returns all categories', async () => {
      const categories = [
        {
          categoryId: '1',
          description: 'Materia prima',
          shortDescription: 'MP',
        },
      ];
      Category.find.mockResolvedValue(categories);

      const response = await request(app).get('/api/v1/categories');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        result: 1,
        data: categories,
      });
    });

    test('returns 404 when category is not found', async () => {
      Category.findOne.mockResolvedValue(null);

      const response = await request(app).get('/api/v1/categories/missing');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'failed',
        message: 'Categoría no encontrada',
      });
    });
  });

  describe('stores', () => {
    test('returns all stores', async () => {
      const stores = [
        {
          storeId: 1,
          Name: 'Central',
          Alias: 'CENT',
          Address: 'Calle 1',
        },
      ];
      const sort = jest.fn().mockResolvedValue(stores);
      Store.find.mockReturnValue({ sort });

      const response = await request(app).get('/api/v1/stores');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        result: 1,
        data: stores,
      });
      expect(sort).toHaveBeenCalledWith({ storeId: 1 });
    });

    test('creates a store with next storeId', async () => {
      const payload = {
        Name: 'Norte',
        Alias: 'NTE',
        Address: 'Calle 2',
      };
      const createdStore = {
        storeId: 2,
        ...payload,
      };
      const sort = jest.fn().mockResolvedValue({ storeId: 1 });
      Store.findOne.mockReturnValue({ sort });
      Store.create.mockResolvedValue(createdStore);

      const response = await request(app).post('/api/v1/stores').send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          store: createdStore,
        },
      });
      expect(Store.create).toHaveBeenCalledWith({
        ...payload,
        storeId: 2,
      });
    });

    test('updates a store by storeId', async () => {
      const payload = {
        Name: 'Sur',
        Alias: 'SUR',
        Address: 'Calle 3',
      };
      const updatedStore = {
        storeId: 3,
        ...payload,
      };
      Store.findOneAndUpdate.mockResolvedValue(updatedStore);

      const response = await request(app).patch('/api/v1/stores/3').send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          store: updatedStore,
        },
      });
      expect(Store.findOneAndUpdate).toHaveBeenCalledWith(
        { storeId: 3 },
        payload,
        {
          new: true,
          runValidators: true,
        }
      );
    });

    test('returns 404 when updating a missing store', async () => {
      Store.findOneAndUpdate.mockResolvedValue(null);

      const response = await request(app).patch('/api/v1/stores/404').send({
        Name: 'Missing',
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'failed',
        message: 'Tienda no encontrada',
      });
    });

    test('deletes a store by storeId', async () => {
      Store.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const response = await request(app).delete('/api/v1/stores/3');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
      expect(Store.deleteOne).toHaveBeenCalledWith({ storeId: 3 });
    });

    test('returns 404 when deleting a missing store', async () => {
      Store.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const response = await request(app).delete('/api/v1/stores/404');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'failed',
        message: 'Tienda no encontrada',
      });
    });
  });

  describe('recipes', () => {
    test('returns all recipes', async () => {
      const recipes = [
        {
          recipeId: 1,
          name: 'Cheesecake',
          servings: 10,
        cost: 128.4,
        ingredients: [],
        steps: [],
      },
      ];
      const sort = jest.fn().mockResolvedValue(recipes);
      Recipe.find.mockReturnValue({ sort });

      const response = await request(app).get('/api/v1/recipes');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        result: 1,
        data: recipes,
      });
      expect(sort).toHaveBeenCalledWith({ recipeId: 1 });
    });

    test('creates a recipe with next recipeId', async () => {
      const payload = {
        name: 'Brownies',
        servings: 12,
        cost: 90,
        ingredients: [
          {
            ingredientId: 'ing-1',
            name: 'Chocolate',
            quantity: '250',
            unit: 'g',
          },
        ],
        steps: [
          {
            description: 'Mezclar ingredientes secos.',
            order: 1,
            stepId: 'step-1',
          },
        ],
      };
      const createdRecipe = {
        recipeId: 2,
        ...payload,
      };
      const sort = jest.fn().mockResolvedValue({ recipeId: 1 });
      Recipe.findOne.mockReturnValue({ sort });
      Recipe.create.mockResolvedValue(createdRecipe);

      const response = await request(app).post('/api/v1/recipes').send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          recipe: createdRecipe,
        },
      });
      expect(Recipe.create).toHaveBeenCalledWith({
        ...payload,
        recipeId: 2,
      });
    });

    test('updates a recipe by recipeId', async () => {
      const payload = {
        name: 'Cheesecake',
        servings: 8,
        cost: 120,
        ingredients: [],
        steps: [],
      };
      const updatedRecipe = {
        recipeId: 1,
        ...payload,
      };
      Recipe.findOneAndUpdate.mockResolvedValue(updatedRecipe);

      const response = await request(app).patch('/api/v1/recipes/1').send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          recipe: updatedRecipe,
        },
      });
      expect(Recipe.findOneAndUpdate).toHaveBeenCalledWith(
        { recipeId: 1 },
        payload,
        {
          new: true,
          runValidators: true,
        }
      );
    });

    test('returns 404 when updating a missing recipe', async () => {
      Recipe.findOneAndUpdate.mockResolvedValue(null);

      const response = await request(app).patch('/api/v1/recipes/404').send({
        name: 'Missing',
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'failed',
        message: 'Receta no encontrada',
      });
    });

    test('deletes a recipe by recipeId', async () => {
      Recipe.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const response = await request(app).delete('/api/v1/recipes/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'success' });
      expect(Recipe.deleteOne).toHaveBeenCalledWith({ recipeId: 1 });
    });

    test('returns 404 when deleting a missing recipe', async () => {
      Recipe.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const response = await request(app).delete('/api/v1/recipes/404');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'failed',
        message: 'Receta no encontrada',
      });
    });
  });
});
