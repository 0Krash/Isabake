import { useCallback, useEffect, useState } from 'react';

import { inventoryRepository } from '../../data/repositories';

const normalizeQuality = (quality) => {
  const qualityMap = {
    alta: 4,
    baja: 2,
    media: 3,
    premium: 5,
  };
  const numericQuality = Number(quality);

  if (!Number.isNaN(numericQuality)) {
    return Math.min(Math.max(numericQuality, 1), 5);
  }

  return qualityMap[String(quality || '').trim().toLowerCase()] || 3;
};

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  return String(value || '').trim().toLowerCase() === 'true';
};

const formatCost = (cost) => {
  if (typeof cost === 'string' && cost.trim().startsWith('$')) {
    return cost;
  }

  return `$${Number(cost || 0).toFixed(2)}`;
};

export const normalizeInventoryItem = (item = {}) => ({
  category: item.category || '',
  id: `${item.inventoryId || item.id || item.localId || ''}`,
  inventoryId: `${item.inventoryId || item.id || item.localId || ''}`,
  lots: (item.lots || []).map((lot) => ({
    brand: lot.brand || '',
    cost: formatCost(lot.cost),
    expiryDate: lot.expiryDate || '',
    id: `${lot.lotId || lot.id || lot.localId || ''}`,
    location: lot.location || '',
    lotId: `${lot.lotId || lot.id || lot.localId || ''}`,
    notes: lot.notes || '',
    purchaseDate: lot.purchaseDate || '',
    quality: normalizeQuality(lot.quality),
    quantity: Number(lot.quantity || 0),
    supplier: lot.supplier || '',
    supplierId:
      lot.supplierId === null || lot.supplierId === undefined
        ? null
        : lot.supplierId,
    taxApplies: normalizeBoolean(lot.taxApplies),
    taxRate:
      lot.taxRate === null || lot.taxRate === undefined ? '' : `${lot.taxRate}`,
    unit: lot.unit || 'g',
  })),
  minimumStock: Number(item.minimumStock || 0),
  name: item.name || '',
  notes: item.notes || '',
  storage: item.storage || '',
});

const formatCostForStorage = (cost) =>
  Number(String(cost || '0').replace(/[^0-9.]/g, '')) || 0;

export const toApiInventoryItem = (item = {}) => ({
  category: item.category || '',
  inventoryId: item.inventoryId || item.id,
  lots: (item.lots || []).map((lot) => ({
    brand: lot.brand || '',
    cost: formatCostForStorage(lot.cost),
    expiryDate: lot.expiryDate || '',
    location: lot.location || '',
    lotId: `${lot.lotId || lot.id || ''}`,
    notes: lot.notes || '',
    purchaseDate: lot.purchaseDate || '',
    quality: normalizeQuality(lot.quality),
    quantity: Number(lot.quantity || 0),
    supplier: lot.supplier || '',
    supplierId:
      lot.supplierId === null || lot.supplierId === undefined
        ? null
        : lot.supplierId,
    taxApplies: normalizeBoolean(lot.taxApplies),
    taxRate: Number(String(lot.taxRate || '0').replace(/[^0-9.]/g, '')) || 0,
    unit: lot.unit || 'g',
  })),
  minimumStock: Number(item.minimumStock || 0),
  name: item.name || '',
  notes: item.notes || '',
  storage: item.storage || '',
});

const sortInventoryItems = (items) =>
  [...items].sort((itemA, itemB) =>
    String(itemA.name || '').localeCompare(String(itemB.name || ''), 'es', {
      sensitivity: 'base',
    }),
  );

export default function useInventoryLocal({ autoLoad = true } = {}) {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [error, setError] = useState(null);

  const refreshInventory = useCallback(async () => {
    setIsLoadingInventory(true);
    setError(null);

    try {
      const localInventoryItems = await inventoryRepository.getAll();
      const normalizedInventoryItems = sortInventoryItems(
        localInventoryItems.map(normalizeInventoryItem),
      );
      setInventoryItems(normalizedInventoryItems);
      return normalizedInventoryItems;
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setIsLoadingInventory(false);
    }
  }, []);

  const createInventoryItem = useCallback(
    async (data, options = {}) => {
      const item = normalizeInventoryItem(
        await inventoryRepository.create(toApiInventoryItem(data), options),
      );
      await refreshInventory();
      return item;
    },
    [refreshInventory],
  );

  const updateInventoryItem = useCallback(
    async (id, updates, options = {}) => {
      const item = await inventoryRepository.update(
        String(id),
        toApiInventoryItem(updates),
        options,
      );

      if (!item) {
        throw new Error('Ingrediente no encontrado');
      }

      const normalizedItem = normalizeInventoryItem(item);
      await refreshInventory();
      return normalizedItem;
    },
    [refreshInventory],
  );

  const deleteInventoryItem = useCallback(
    async (id, options = {}) => {
      const item = await inventoryRepository.softDelete(String(id), options);

      if (!item) {
        throw new Error('Ingrediente no encontrado');
      }

      await refreshInventory();
      return normalizeInventoryItem(item);
    },
    [refreshInventory],
  );

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    refreshInventory().catch((requestError) => {
      console.warn('Error al cargar inventario local:', requestError);
    });
  }, [autoLoad, refreshInventory]);

  return {
    createInventoryItem,
    deleteInventoryItem,
    error,
    inventory: inventoryItems,
    inventoryItems,
    isLoadingInventory,
    loading: isLoadingInventory,
    refreshInventory,
    setInventory: setInventoryItems,
    setInventoryItems,
    updateInventoryItem,
  };
}
