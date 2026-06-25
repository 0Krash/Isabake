import { idsMatch } from './idUtils';

const units = {
  cda: ['spoon', 3],
  cdta: ['spoon', 1],
  g: ['weight', 1],
  kg: ['weight', 1000],
  l: ['volume', 1000],
  ml: ['volume', 1],
  pza: ['piece', 1],
};

const number = (value) =>
  Number(String(value || '0').replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;

export const calculateRecipeCost = (recipe, inventoryItems) => {
  const ingredients = (recipe.ingredients || []).map((ingredient) => {
    const inventoryItem = inventoryItems.find(
      (item) => idsMatch(item.inventoryId, ingredient.inventoryId),
    );
    const [group, factor] = units[ingredient.unit] || [];
    const lots = (inventoryItem?.lots || []).filter(
      (lot) => units[lot.unit]?.[0] === group && number(lot.quantity) > 0,
    );
    const stock = lots.reduce(
      (total, lot) => total + number(lot.quantity) * units[lot.unit][1],
      0,
    );
    const stockCost = lots.reduce(
      (total, lot) =>
        total +
        number(lot.cost) *
          (lot.taxApplies ? 1 + number(lot.taxRate) / 100 : 1),
      0,
    );
    const cost = stock ? number(ingredient.quantity) * factor * (stockCost / stock) : 0;

    return { ...ingredient, cost, hasCost: stock > 0, lotId: lots[0]?.id };
  });
  const total = ingredients.reduce((sum, ingredient) => sum + ingredient.cost, 0);

  return {
    ingredients,
    missingCost: ingredients.some((ingredient) => !ingredient.hasCost),
    portionCost: total / Math.max(number(recipe.servings), 1),
    total,
  };
};

export const calculateSaleMetrics = ({
  extraExpenses,
  portionCost,
  quantity,
  saleTotal,
  targetMargin,
}) => {
  const productionCost = number(portionCost) * Math.max(number(quantity), 0);
  const marginRate = Math.min(Math.max(number(targetMargin), 0), 99) / 100;
  const normalizedExtraExpenses = Math.max(number(extraExpenses), 0);
  const suggestedUnitPrice = number(portionCost) / (1 - marginRate);
  const suggestedTotal = suggestedUnitPrice * Math.max(number(quantity), 0);
  const amount = saleTotal === null ? suggestedTotal : Math.max(number(saleTotal), 0);
  const grossProfit = amount - productionCost;
  const netProfit = grossProfit - normalizedExtraExpenses;

  return {
    amount,
    extraExpenses: normalizedExtraExpenses,
    grossMargin: amount ? (grossProfit / amount) * 100 : 0,
    grossProfit,
    netMargin: amount ? (netProfit / amount) * 100 : 0,
    netProfit,
    productionCost,
    suggestedTotal,
    suggestedUnitPrice,
    targetMargin: marginRate * 100,
  };
};
