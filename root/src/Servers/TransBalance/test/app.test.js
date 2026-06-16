const request = require('supertest');

jest.mock('../models/transactionModel', () => ({
  aggregate: jest.fn(),
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
  find: jest.fn(),
}));

const app = require('../app');
const Category = require('../models/categoryModel');
const Store = require('../models/storeModel');
const Transaction = require('../models/transactionModel');

describe('TransBalance API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/transactions', () => {
    test('responds with all transactions', async () => {
      const transactions = [
        {
          transactionId: 'tx-1',
          transactionType: 'Ventas',
          description: 'Pastel',
          amount: 15000,
        },
      ];
      Transaction.find.mockResolvedValue(transactions);

      const response = await request(app).get('/api/v1/transactions');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        result: 1,
        data: transactions,
      });
      expect(Transaction.find).toHaveBeenCalledTimes(1);
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
      Store.find.mockResolvedValue(stores);

      const response = await request(app).get('/api/v1/stores');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        result: 1,
        data: stores,
      });
    });
  });
});
