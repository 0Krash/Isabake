import { useCallback, useEffect, useState } from 'react';

import inventoryService from '../../services/TransactionBalance/API/inventoryService';

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

export const normalizeInventoryItem = (item) => ({
  category: item.category || '',
  id: `${item.inventoryId || item.id || item._id}`,
  inventoryId: Number(item.inventoryId || item.id || item._id),
  lots: (item.lots || []).map((lot) => ({
    brand: lot.brand || '',
    cost: `$${Number(lot.cost || 0).toFixed(2)}`,
    expiryDate: lot.expiryDate || '',
    id: `${lot.lotId || lot.id || lot._id}`,
    location: lot.location || '',
    notes: lot.notes || '',
    purchaseDate: lot.purchaseDate || '',
    quality: normalizeQuality(lot.quality),
    quantity: Number(lot.quantity || 0),
    supplier: lot.supplier || '',
    supplierId:
      lot.supplierId === null || lot.supplierId === undefined
        ? null
        : Number(lot.supplierId),
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

const formatCostForApi = (cost) =>
  Number(String(cost || '0').replace(/[^0-9.]/g, '')) || 0;

export const toApiInventoryItem = (item) => ({
  category: item.category || '',
  lots: (item.lots || []).map((lot) => ({
    brand: lot.brand,
    cost: formatCostForApi(lot.cost),
    expiryDate: lot.expiryDate || '',
    location: lot.location || '',
    lotId: `${lot.id}`,
    notes: lot.notes || '',
    purchaseDate: lot.purchaseDate || '',
    quality: normalizeQuality(lot.quality),
    quantity: Number(lot.quantity || 0),
    supplier: lot.supplier || '',
    supplierId:
      lot.supplierId === null || lot.supplierId === undefined
        ? null
        : Number(lot.supplierId),
    taxApplies: normalizeBoolean(lot.taxApplies),
    taxRate: Number(String(lot.taxRate || '0').replace(/[^0-9.]/g, '')) || 0,
    unit: lot.unit || 'g',
  })),
  minimumStock: Number(item.minimumStock || 0),
  name: item.name,
  notes: item.notes || '',
  storage: item.storage || '',
});

export default function useInventoryData() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [error, setError] = useState(null);

  const refreshInventory = useCallback(async () => {
    setIsLoadingInventory(true);
    setError(null);

    try {
      const apiInventoryItems = await inventoryService.getAllInventoryItems();
      setInventoryItems(apiInventoryItems.map(normalizeInventoryItem));
    } catch (requestError) {
      console.warn('Error al cargar inventario:', requestError);
      setError(requestError);
    } finally {
      setIsLoadingInventory(false);
    }
  }, []);

  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  return {
    error,
    inventoryItems,
    isLoadingInventory,
    refreshInventory,
    setInventoryItems,
  };
}
