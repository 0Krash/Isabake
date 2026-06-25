import { createRepository } from './repositoryUtils';

export const INVENTORY_COLLECTION = 'inventory';

const normalizeLot = (lot = {}) => ({
  brand: lot.brand || '',
  cost: Number(lot.cost || 0),
  expiryDate: lot.expiryDate || '',
  location: lot.location || '',
  lotId: lot.lotId || lot.id || '',
  notes: lot.notes || '',
  purchaseDate: lot.purchaseDate || '',
  quality: lot.quality ?? 3,
  quantity: Number(lot.quantity || 0),
  supplier: lot.supplier || '',
  supplierId:
    lot.supplierId === null || lot.supplierId === undefined
      ? null
      : lot.supplierId,
  taxApplies: Boolean(lot.taxApplies),
  taxRate: Number(lot.taxRate || 0),
  unit: lot.unit || 'g',
});

const normalizeInventoryItem = (item = {}) => ({
  category: item.category || '',
  lots: Array.isArray(item.lots) ? item.lots.map(normalizeLot) : [],
  minimumStock: Number(item.minimumStock || 0),
  name: item.name || '',
  notes: item.notes || '',
  storage: item.storage || '',
});

const repository = createRepository({
  collection: INVENTORY_COLLECTION,
  idField: 'inventoryId',
  idPrefix: 'inventory',
  prepareCreate: (item, id) => ({
    ...normalizeInventoryItem(item),
    inventoryId: item.inventoryId || id,
  }),
  prepareUpdate: (item, id) => ({
    ...item,
    ...normalizeInventoryItem(item),
    inventoryId: item.inventoryId || id,
  }),
});

const getAll = async (options = {}) => {
  const inventoryItems = await repository.getAll(options);

  return inventoryItems.sort((itemA, itemB) =>
    String(itemA.name || '').localeCompare(String(itemB.name || ''), 'es', {
      sensitivity: 'base',
    }),
  );
};

const getByInventoryId = repository.getById;

export default {
  ...repository,
  getAll,
  getByInventoryId,
};
