import { useCallback, useEffect, useRef, useState } from 'react';

import { inventoryRepository } from '../../data/repositories';
import { requestLocalChangeSync } from '../../data/sync/localChangeSync';
import { getCurrentGroupId } from '../../data/workspace/currentWorkspace';
import useCurrentWorkspaceScope from '../workspace/useCurrentWorkspaceScope';

export const INVENTORY_PAGE_SIZE = 20;
const inventoryCache = new Map();

const getInventoryCacheKey = (groupId, paginated) =>
  `${groupId || 'default'}:${paginated ? 'paged' : 'all'}`;

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

const getInventoryIdentity = (item) =>
  item.inventoryId || item.id || item.localId || item.name;

export default function useInventoryLocal({
  autoLoad = true,
  paginated = true,
} = {}) {
  const { groupId, loading: workspaceLoading } = useCurrentWorkspaceScope({
    autoLoad,
  });
  const waitingForWorkspace = Boolean(autoLoad && workspaceLoading && !groupId);
  const inventoryCacheKey = getInventoryCacheKey(groupId, paginated);
  const cachedInventoryState = inventoryCache.get(inventoryCacheKey);
  const [inventoryItems, setInventoryItems] = useState(
    () => cachedInventoryState?.inventoryItems || [],
  );
  const [pagination, setPagination] = useState(
    () =>
      cachedInventoryState?.pagination || {
        hasMore: false,
        page: 0,
      },
  );
  const [isLoadingInventory, setIsLoadingInventory] = useState(
    () => Boolean(autoLoad) && !cachedInventoryState,
  );
  const [isLoadingMoreInventory, setIsLoadingMoreInventory] = useState(false);
  const [error, setError] = useState(null);
  const isLoadingMoreInventoryRef = useRef(false);

  const fetchInventoryPage = useCallback(
    async (page) => {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const response = await inventoryRepository.getPage({
        groupId: effectiveGroupId,
        limit: INVENTORY_PAGE_SIZE,
        page,
      });

      return {
        data: sortInventoryItems(
          (response.data || []).map(normalizeInventoryItem),
        ),
        pagination: response.pagination || {
          hasMore: false,
          page,
        },
      };
    },
    [groupId],
  );

  const refreshInventory = useCallback(async () => {
    setIsLoadingInventory(true);
    setError(null);

    try {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const inventoryResponse = paginated
        ? await fetchInventoryPage(1)
        : {
            data: sortInventoryItems(
              (
                await inventoryRepository.getAll({
                  groupId: effectiveGroupId,
                })
              ).map(normalizeInventoryItem),
            ),
            pagination: {
              hasMore: false,
              page: 1,
            },
          };
      const nextState = {
        inventoryItems: inventoryResponse.data,
        pagination: inventoryResponse.pagination,
      };

      inventoryCache.set(
        getInventoryCacheKey(effectiveGroupId, paginated),
        nextState,
      );
      setInventoryItems(nextState.inventoryItems);
      setPagination(nextState.pagination);
      return nextState.inventoryItems;
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setIsLoadingInventory(false);
      isLoadingMoreInventoryRef.current = false;
    }
  }, [fetchInventoryPage, groupId, paginated]);

  const loadMoreInventory = useCallback(async () => {
    if (
      !paginated ||
      isLoadingInventory ||
      isLoadingMoreInventoryRef.current ||
      !pagination.hasMore
    ) {
      return;
    }

    isLoadingMoreInventoryRef.current = true;
    setIsLoadingMoreInventory(true);
    setError(null);

    try {
      const nextPage = (pagination.page || 1) + 1;
      const inventoryResponse = await fetchInventoryPage(nextPage);
      const effectiveGroupId = groupId || (await getCurrentGroupId());

      setInventoryItems((currentInventoryItems) => {
        const loadedInventoryIds = new Set(
          currentInventoryItems.map(getInventoryIdentity),
        );
        const nextInventoryItems = inventoryResponse.data.filter((item) => {
          const inventoryId = getInventoryIdentity(item);

          if (loadedInventoryIds.has(inventoryId)) {
            return false;
          }

          loadedInventoryIds.add(inventoryId);
          return true;
        });
        const updatedInventoryItems = [
          ...currentInventoryItems,
          ...nextInventoryItems,
        ];

        inventoryCache.set(getInventoryCacheKey(effectiveGroupId, paginated), {
          inventoryItems: updatedInventoryItems,
          pagination: inventoryResponse.pagination,
        });

        return updatedInventoryItems;
      });
      setPagination(inventoryResponse.pagination);
    } finally {
      isLoadingMoreInventoryRef.current = false;
      setIsLoadingMoreInventory(false);
    }
  }, [
    fetchInventoryPage,
    groupId,
    isLoadingInventory,
    pagination.hasMore,
    pagination.page,
    paginated,
  ]);

  const createInventoryItem = useCallback(
    async (data, options = {}) => {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const item = normalizeInventoryItem(
        await inventoryRepository.create(toApiInventoryItem(data), {
          groupId: effectiveGroupId,
          ...options,
        }),
      );
      requestLocalChangeSync();
      await refreshInventory();
      return item;
    },
    [groupId, refreshInventory],
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
      requestLocalChangeSync();
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

      requestLocalChangeSync();
      await refreshInventory();
      return normalizeInventoryItem(item);
    },
    [refreshInventory],
  );

  useEffect(() => {
    if (!autoLoad || waitingForWorkspace) {
      return;
    }

    if (inventoryCache.has(inventoryCacheKey)) {
      const cached = inventoryCache.get(inventoryCacheKey);
      setInventoryItems(cached.inventoryItems);
      setPagination(cached.pagination);
    } else {
      setInventoryItems([]);
      setPagination({ hasMore: false, page: 0 });
    }

    refreshInventory().catch((requestError) => {
      console.warn('Error al cargar inventario local:', requestError);
    });
  }, [
    autoLoad,
    groupId,
    inventoryCacheKey,
    refreshInventory,
    waitingForWorkspace,
  ]);

  return {
    createInventoryItem,
    deleteInventoryItem,
    error,
    hasMoreInventory: pagination.hasMore,
    inventory: inventoryItems,
    inventoryItems,
    isLoadingInventory,
    isLoadingMoreInventory,
    loadMoreInventory,
    loading: isLoadingInventory,
    refreshInventory,
    setInventory: setInventoryItems,
    setInventoryItems,
    updateInventoryItem,
  };
}
