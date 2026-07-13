import { createDevSampleBusinessData } from './devSampleDataSeeder';

describe('devSampleDataSeeder', () => {
  const makeRepository = (idField) => ({
    create: jest.fn(async (payload) => ({
      ...payload,
      id: `${idField}_${payload.name || payload.description}`,
      [idField]: `${idField}_${payload.name || payload.description}`,
    })),
  });

  test('creates inventory, recipes, and transactions as a manual dev seed', async () => {
    let idCounter = 0;
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
      repositories,
    });

    expect(result).toEqual(
      expect.objectContaining({
        counts: {
          inventory: 3,
          recipes: 2,
          transactions: 3,
        },
        ok: true,
        runId: 'dev_demo_run_1',
      }),
    );
    expect(repositories.inventory.create).toHaveBeenCalledTimes(3);
    expect(repositories.recipes.create).toHaveBeenCalledTimes(2);
    expect(repositories.transactions.create).toHaveBeenCalledTimes(3);
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
});
