import { createRepository } from './repositoryUtils';

export const INVENTORY_COLLECTION = 'inventory';

const capitalizeFirstLetter = (value = '') => {
  const trimmedValue = String(value || '').trim();

  if (!trimmedValue) {
    return '';
  }

  return `${trimmedValue.charAt(0).toLocaleUpperCase('es-MX')}${trimmedValue.slice(1)}`;
};

const normalizeLot = (lot = {}) => ({
  brand: capitalizeFirstLetter(lot.brand),
  cost: Number(lot.cost || 0),
  expiryDate: lot.expiryDate || '',
  location: lot.location || '',
  lotId: lot.lotId || lot.id || '',
  notes: lot.notes || '',
  purchaseDate: lot.purchaseDate || '',
  quality: lot.quality ?? 3,
  quantity: Number(lot.quantity || 0),
  supplier: capitalizeFirstLetter(lot.supplier),
  supplierId:
    lot.supplierId === null || lot.supplierId === undefined
      ? null
      : lot.supplierId,
  taxApplies: Boolean(lot.taxApplies),
  taxRate: Number(lot.taxRate || 0),
  unit: lot.unit || 'g',
});

const normalizeInventoryItem = (item = {}) => ({
  category: capitalizeFirstLetter(item.category),
  lots: Array.isArray(item.lots) ? item.lots.map(normalizeLot) : [],
  minimumStock: Number(item.minimumStock || 0),
  name: capitalizeFirstLetter(item.name),
  notes: item.notes || '',
  storage: capitalizeFirstLetter(item.storage),
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

const getPage = async ({ groupId, limit = 20, page = 1 } = {}) => {
  const allInventoryItems = await getAll({ groupId });
  const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const start = (normalizedPage - 1) * normalizedLimit;
  const data = allInventoryItems.slice(start, start + normalizedLimit);

  return {
    data,
    pagination: {
      hasMore: start + data.length < allInventoryItems.length,
      limit: normalizedLimit,
      page: normalizedPage,
      total: allInventoryItems.length,
      totalPages: Math.ceil(allInventoryItems.length / normalizedLimit),
    },
    result: data.length,
    status: 'success',
  };
};

const getByInventoryId = repository.getById;

export default {
  ...repository,
  getAll,
  getByInventoryId,
  getPage,
};
