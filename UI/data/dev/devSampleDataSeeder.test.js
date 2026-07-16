import { createDevSampleBusinessData } from './devSampleDataSeeder';

describe('devSampleDataSeeder', () => {
  const makeRepository = (idField) => ({
    create: jest.fn(async (payload) => ({
      ...payload,
      id: `${idField}_${payload.name || payload.description}`,
      [idField]: `${idField}_${payload.name || payload.description}`,
    })),
  });

  test('creates random inventory, recipes, and transactions as a manual dev seed', async () => {
    let idCounter = 0;
    const randomValues = [0, 0.49, 0.99];
    const repositories = {
      inventory: makeRepository('inventoryId'),
      recipes: makeRepository('recipeId'),
      transactions: makeRepository('transactionId'),
    };

    const result = await createDevSampleBusinessData({
      createId: (prefix) => {
        idCounter += 1;
        return `${prefix}_${idCounter}`;
      },
      now: () => new Date('2026-07-12T10:00:00.000Z'),
      random: () => randomValues.shift() ?? 0,
      repositories,
    });

    expect(result).toEqual(
      expect.objectContaining({
        counts: {
          inventory: 1,
          recipes: 5,
          transactions: 10,
        },
        ok: true,
        runId: 'dev_demo_run_1',
      }),
    );
    expect(repositories.inventory.create).toHaveBeenCalledTimes(1);
    expect(repositories.recipes.create).toHaveBeenCalledTimes(5);
    expect(repositories.transactions.create).toHaveBeenCalledTimes(10);
    expect(repositories.recipes.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ingredients: expect.arrayContaining([
          expect.objectContaining({
            inventoryId: expect.stringContaining('inventoryId_'),
          }),
        ]),
      }),
    );
    expect(repositories.transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: 'Ventas',
      }),
    );
    expect(repositories.transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: 'Gastos',
      }),
    );
  });

  test('never creates more than ten records per collection', async () => {
    const repositories = {
      inventory: makeRepository('inventoryId'),
      recipes: makeRepository('recipeId'),
      transactions: makeRepository('transactionId'),
    };

    let idCounter = 0;
    await createDevSampleBusinessData({
      createId: (prefix) => {
        idCounter += 1;
        return `${prefix}_${idCounter}`;
      },
      now: () => new Date('2026-07-12T10:00:00.000Z'),
      random: () => 0.9999,
      repositories,
    });

    expect(repositories.inventory.create).toHaveBeenCalledTimes(10);
    expect(repositories.recipes.create).toHaveBeenCalledTimes(10);
    expect(repositories.transactions.create).toHaveBeenCalledTimes(10);
  });
});
