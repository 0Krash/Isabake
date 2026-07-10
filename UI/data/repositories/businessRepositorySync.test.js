const mockSaveDocument = jest.fn();

jest.mock('../db/documentStore', () => ({
  getCollection: jest.fn(async () => []),
  getDocument: jest.fn(),
  saveDocument: (...args) => mockSaveDocument(...args),
  softDeleteDocument: jest.fn(),
}));

jest.mock('../db/localIds', () => ({
  createLocalId: jest.fn((prefix) => `${prefix}_generated`),
}));

jest.mock('../workspace/currentWorkspace', () => ({
  getCurrentGroupId: jest.fn(async () => 'group_1'),
}));

import inventoryRepository from './inventoryRepository';
import recipeRepository from './recipeRepository';
import stockMovementRepository from './stockMovementRepository';
import transactionRepository from './transactionRepository';

describe('business repositories sync coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveDocument.mockImplementation(async (collection, id, data, options) => ({
      collection,
      data,
      deletedAt: null,
      groupId: options.groupId,
      id,
      localVersion: 1,
      remoteId: null,
      serverVersion: null,
      syncStatus: options.syncStatus || 'pending',
    }));
  });

  test('recipe create assigns groupId and leaves outbox enabled', async () => {
    const recipe = await recipeRepository.create({
      name: 'pan',
      recipeId: 'recipe_1',
    });

    expect(recipe.groupId).toBe('group_1');
    expect(recipe.syncStatus).toBe('pending');
    expect(mockSaveDocument).toHaveBeenCalledWith(
      'recipes',
      expect.any(String),
      expect.objectContaining({
        name: 'Pan',
      }),
      expect.objectContaining({
        groupId: 'group_1',
        skipOutbox: undefined,
      }),
    );
  });

  test('recipe update and delete leave outbox enabled', async () => {
    const getDocument = require('../db/documentStore').getDocument;
    const softDeleteDocument = require('../db/documentStore').softDeleteDocument;

    getDocument.mockResolvedValueOnce({
      data: {
        cost: 0,
        ingredients: [],
        name: 'Pan',
        recipeId: 'recipe_1',
        servings: 1,
        steps: [],
        type: 'Dulce',
      },
      deletedAt: null,
      groupId: 'group_1',
      id: 'recipe_1',
      localVersion: 1,
      remoteId: null,
      serverVersion: null,
      syncStatus: 'pending',
    });

    await recipeRepository.update('recipe_1', { name: 'bolillo' });
    await recipeRepository.softDelete('recipe_1');

    expect(mockSaveDocument).toHaveBeenCalledWith(
      'recipes',
      'recipe_1',
      expect.objectContaining({
        name: 'Bolillo',
      }),
      expect.objectContaining({
        skipOutbox: undefined,
      }),
    );
    expect(softDeleteDocument).toHaveBeenCalledWith(
      'recipes',
      'recipe_1',
      expect.objectContaining({}),
    );
  });

  test('inventory create assigns groupId and leaves outbox enabled', async () => {
    const item = await inventoryRepository.create({
      inventoryId: 'inventory_1',
      name: 'harina',
    });

    expect(item.groupId).toBe('group_1');
    expect(item.syncStatus).toBe('pending');
    expect(mockSaveDocument).toHaveBeenCalledWith(
      'inventory',
      expect.any(String),
      expect.objectContaining({
        name: 'Harina',
      }),
      expect.objectContaining({
        groupId: 'group_1',
        skipOutbox: undefined,
      }),
    );
  });

  test('inventory update and delete leave outbox enabled', async () => {
    const getDocument = require('../db/documentStore').getDocument;
    const softDeleteDocument = require('../db/documentStore').softDeleteDocument;

    getDocument.mockResolvedValueOnce({
      data: {
        inventoryId: 'inventory_1',
        lots: [],
        name: 'Harina',
      },
      deletedAt: null,
      groupId: 'group_1',
      id: 'inventory_1',
      localVersion: 1,
      remoteId: null,
      serverVersion: null,
      syncStatus: 'pending',
    });

    await inventoryRepository.update('inventory_1', { name: 'azucar' });
    await inventoryRepository.softDelete('inventory_1');

    expect(mockSaveDocument).toHaveBeenCalledWith(
      'inventory',
      'inventory_1',
      expect.objectContaining({
        name: 'Azucar',
      }),
      expect.objectContaining({
        skipOutbox: undefined,
      }),
    );
    expect(softDeleteDocument).toHaveBeenCalledWith(
      'inventory',
      'inventory_1',
      expect.objectContaining({}),
    );
  });

  test('transaction create assigns groupId and leaves outbox enabled', async () => {
    const transaction = await transactionRepository.create({
      amount: 10,
      transactionId: 'transaction_1',
      transactionType: 'income',
    });

    expect(transaction.groupId).toBe('group_1');
    expect(transaction.syncStatus).toBe('pending');
    expect(mockSaveDocument).toHaveBeenCalledWith(
      'transactions',
      expect.any(String),
      expect.objectContaining({
        amount: 10,
      }),
      expect.objectContaining({
        groupId: 'group_1',
        skipOutbox: undefined,
      }),
    );
  });

  test('transaction delete leaves outbox enabled', async () => {
    const softDeleteDocument = require('../db/documentStore').softDeleteDocument;

    await transactionRepository.softDelete('transaction_1');

    expect(softDeleteDocument).toHaveBeenCalledWith(
      'transactions',
      'transaction_1',
      expect.objectContaining({}),
    );
  });

  test('stock movement create assigns groupId and leaves outbox enabled', async () => {
    const movement = await stockMovementRepository.create({
      inventoryId: 'inventory_1',
      movementId: 'movement_1',
      quantityDelta: 2,
      type: 'purchase',
    });

    expect(movement.groupId).toBe('group_1');
    expect(movement.syncStatus).toBe('pending');
    expect(mockSaveDocument).toHaveBeenCalledWith(
      'stockMovements',
      expect.any(String),
      expect.objectContaining({
        inventoryId: 'inventory_1',
        quantityDelta: 2,
      }),
      expect.objectContaining({
        groupId: 'group_1',
        skipOutbox: undefined,
      }),
    );
  });
});
