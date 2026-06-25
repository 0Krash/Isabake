import { initDatabase } from '../db/database';
import { getPendingOutboxEvents } from '../sync/syncOutbox';
import {
  categoryRepository,
  inventoryRepository,
  recipeRepository,
  recipeSectionRepository,
  recipeTypeRepository,
  storeRepository,
  transactionRepository,
} from './index';

const SMOKE_PREFIX = 'smoke_test';

const assertCondition = (condition, message, details = {}) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const createStep = async (name, action) => {
  try {
    const data = await action();
    return {
      data,
      name,
      success: true,
    };
  } catch (error) {
    return {
      error: error?.message || String(error),
      errorDetails: error?.details || null,
      name,
      success: false,
    };
  }
};

export const runRepositorySmokeTest = async () => {
  const isDev = typeof __DEV__ === 'undefined' ? true : __DEV__;

  if (!isDev) {
    return {
      skipped: true,
      reason: 'repository smoke test is dev-only',
      success: false,
    };
  }

  const result = {
    createdIds: {},
    failedStep: null,
    outbox: {
      pendingCount: 0,
      verified: false,
    },
    steps: [],
    success: false,
  };

  const runStep = async (name, action) => {
    const step = await createStep(name, action);
    result.steps.push(step);

    if (!step.success) {
      result.failedStep = name;
      throw new Error(step.error);
    }

    return step.data;
  };

  try {
    await runStep('initDatabase', () => initDatabase());

    const store = await runStep('create store', () =>
      storeRepository.create({
        Address: 'smoke_test_address',
        Alias: 'SMOKE',
        Name: `${SMOKE_PREFIX}_store`,
      }),
    );
    result.createdIds.storeId = store.id;

    await runStep('read store by id', async () => {
      const foundStore = await storeRepository.getById(store.id);
      assertCondition(Boolean(foundStore), 'Store was not found after create', {
        storeId: store.id,
      });
      return foundStore;
    });

    await runStep('update store', () =>
      storeRepository.update(store.id, {
        Alias: 'SMOKE_UPDATED',
        Name: `${SMOKE_PREFIX}_store_updated`,
      }),
    );

    await runStep('read all stores', async () => {
      const stores = await storeRepository.getAll();
      assertCondition(
        stores.some((currentStore) => currentStore.id === store.id),
        'Created store was not present in getAll()',
        { storeId: store.id },
      );
      return {
        count: stores.length,
      };
    });

    await runStep('soft delete store', () =>
      storeRepository.softDelete(store.id),
    );

    await runStep('confirm deleted store is hidden', async () => {
      const stores = await storeRepository.getAll();
      assertCondition(
        !stores.some((currentStore) => currentStore.id === store.id),
        'Soft-deleted store still appears in getAll()',
        { storeId: store.id },
      );
      return {
        count: stores.length,
      };
    });

    const category = await runStep('create category', () =>
      categoryRepository.create({
        categoryId: `${SMOKE_PREFIX}_category`,
        description: 'Smoke test category',
        shortDescription: 'SmokeCat',
      }),
    );
    result.createdIds.categoryId = category.id;

    const recipeType = await runStep('create recipe type', () =>
      recipeTypeRepository.create({
        name: `${SMOKE_PREFIX}_recipe_type`,
      }),
    );
    result.createdIds.recipeTypeId = recipeType.id;

    const recipeSection = await runStep('create recipe section', () =>
      recipeSectionRepository.create({
        name: `${SMOKE_PREFIX}_recipe_section`,
      }),
    );
    result.createdIds.recipeSectionId = recipeSection.id;

    const inventoryItem = await runStep('create inventory item', () =>
      inventoryRepository.create({
        category: 'smoke_test_category',
        lots: [
          {
            brand: 'smoke_test_brand',
            cost: 10,
            lotId: `${SMOKE_PREFIX}_lot`,
            quantity: 1000,
            unit: 'g',
          },
        ],
        minimumStock: 100,
        name: `${SMOKE_PREFIX}_inventory_item`,
        storage: 'smoke_test_storage',
      }),
    );
    result.createdIds.inventoryId = inventoryItem.id;

    const recipe = await runStep('create recipe', () =>
      recipeRepository.create({
        ingredients: [
          {
            ingredientId: `${SMOKE_PREFIX}_ingredient`,
            inventoryId: inventoryItem.inventoryId,
            name: inventoryItem.name,
            quantity: '100',
            section: recipeSection.name,
            unit: 'g',
          },
        ],
        name: `${SMOKE_PREFIX}_recipe`,
        servings: 4,
        steps: [
          {
            description: 'Smoke test preparation step',
            order: 1,
            stepId: `${SMOKE_PREFIX}_step`,
          },
        ],
        type: recipeType.name,
      }),
    );
    result.createdIds.recipeId = recipe.id;

    const transaction = await runStep('create transaction', () =>
      transactionRepository.create({
        amount: 12345,
        category: {
          categoryId: category.categoryId,
          description: category.description,
          shortDescription: category.shortDescription,
        },
        description: `${SMOKE_PREFIX}_transaction`,
        quantity: '1',
        selectedDate: new Date().toISOString(),
        store: {
          alias: 'SMOKE_UPDATED',
          name: `${SMOKE_PREFIX}_store_updated`,
          storeId: store.storeId,
        },
        transactionType: 'Ventas',
      }),
    );
    result.createdIds.transactionId = transaction.id;

    await runStep('verify pending outbox events', async () => {
      const pendingOutboxEvents = await getPendingOutboxEvents();
      assertCondition(
        pendingOutboxEvents.length > 0,
        'No pending outbox events found after repository writes',
      );
      result.outbox = {
        pendingCount: pendingOutboxEvents.length,
        verified: true,
      };
      return result.outbox;
    });

    result.success = true;
    return result;
  } catch (error) {
    return {
      ...result,
      error: error?.message || String(error),
      success: false,
    };
  }
};
