import { calculateRecipeCost, calculateSaleMetrics } from './recipeCost';

test('calculates recipe and portion cost from inventory lots', () => {
  const result = calculateRecipeCost(
    {
      ingredients: [{ inventoryId: 1, name: 'Harina', quantity: '500', unit: 'g' }],
      servings: 5,
    },
    [{ inventoryId: 1, lots: [{ cost: '$20', id: 'lot-1', quantity: 1, unit: 'kg' }] }],
  );

  expect(result.total).toBe(10);
  expect(result.portionCost).toBe(2);
  expect(result.missingCost).toBe(false);
  expect(result.ingredients[0].lotId).toBe('lot-1');
});

test('recalculates profit and margins from an edited sale total', () => {
  const result = calculateSaleMetrics({
    extraExpenses: 10,
    portionCost: 20,
    quantity: 2,
    saleTotal: 100,
    targetMargin: 30,
  });

  expect(result.productionCost).toBe(40);
  expect(result.grossProfit).toBe(60);
  expect(result.netProfit).toBe(50);
  expect(result.netMargin).toBe(50);
});
