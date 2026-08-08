import { useCallback, useEffect, useRef, useState } from 'react';

import { transactionRepository } from '../../data/repositories';
import { requestLocalChangeSync } from '../../data/sync/localChangeSync';
import { getCurrentGroupId } from '../../data/workspace/currentWorkspace';
import useCurrentWorkspaceScope from '../workspace/useCurrentWorkspaceScope';

export const TRANSACTIONS_PAGE_SIZE = 20;
const transactionStateCache = new Map();

const CATEGORY_LABELS = {
  1: 'Materia prima',
  2: 'Insumos',
  3: 'Formación',
  4: 'Operativo',
};

const getTransactionIdentity = (transaction) =>
  transaction.transactionId ||
  transaction.id ||
  transaction.localId ||
  `${transaction.selectedDate}-${transaction.transactionType}-${transaction.amount}`;

const normalizeCategory = (category) => {
  if (!category) {
    return null;
  }

  if (typeof category === 'object') {
    const categoryId = category.categoryId ?? category.id ?? '';

    return {
      ...category,
      categoryId: categoryId === '' ? '' : `${categoryId}`,
      description:
        category.description ||
        category.category ||
        CATEGORY_LABELS[categoryId] ||
        '',
      shortDescription:
        category.shortDescription ||
        category.description ||
        CATEGORY_LABELS[categoryId] ||
        '',
    };
  }

  return {
    categoryId: `${category}`,
    description: CATEGORY_LABELS[category] || `${category}`,
    shortDescription: CATEGORY_LABELS[category] || `${category}`,
  };
};

const normalizeStore = (store) => {
  if (!store) {
    return null;
  }

  if (typeof store === 'object') {
    const storeId = store.storeId ?? store.id ?? '';

    return {
      ...store,
      storeId: storeId === '' ? '' : `${storeId}`,
    };
  }

  return { storeId: `${store}` };
};

export const normalizeTransaction = (transaction = {}) => ({
  ...transaction,
  amount: Number(transaction.amount || 0),
  category: normalizeCategory(transaction.category),
  financials: transaction.financials,
  id: `${transaction.transactionId || transaction.id || transaction.localId || ''}`,
  itemQuantity: transaction.itemQuantity || '',
  quantity: transaction.quantity || '',
  selectedDate: transaction.selectedDate || new Date().toISOString(),
  store: normalizeStore(transaction.store),
  transactionId: `${
    transaction.transactionId || transaction.id || transaction.localId || ''
  }`,
  transactionType: transaction.transactionType || '',
  uomId: transaction.uomId || '',
});

export const toStorageTransaction = (transaction = {}) => ({
  // Amounts stay in cents because the existing UI formats them with
  // CurrencyFormatter.convertCentsToCurrency.
  amount: Number(transaction.amount || 0),
  category: normalizeCategory(transaction.category),
  description: transaction.description || '',
  financials: transaction.financials,
  itemQuantity: transaction.itemQuantity || '',
  quantity: transaction.quantity || '',
  selectedDate: transaction.selectedDate || new Date().toISOString(),
  store: normalizeStore(transaction.store),
  transactionId: transaction.transactionId || transaction.id,
  transactionType: transaction.transactionType || '',
  uomId: transaction.uomId || '',
});

const getTransactionType = (transaction) => transaction.transactionType || '';

const getCategoryLabel = (transaction) => {
  if (transaction.transactionType === 'Ventas') {
    return 'Ventas';
  }

  return (
    transaction.category?.description ||
    transaction.category?.category ||
    transaction.category?.shortDescription ||
    'Movimiento'
  );
};

const calculateTotalsByCategory = (transactions) => {
  const groupsByType = transactions.reduce((groups, transaction) => {
    const transactionType = getTransactionType(transaction);
    const categoryLabel = getCategoryLabel(transaction);

    if (!groups[transactionType]) {
      groups[transactionType] = {
        categories: {},
        total: 0,
        transactionType,
      };
    }

    groups[transactionType].total += Number(transaction.amount || 0);
    groups[transactionType].categories[categoryLabel] =
      (groups[transactionType].categories[categoryLabel] || 0) +
      Number(transaction.amount || 0);

    return groups;
  }, {});

  return Object.values(groupsByType).map((group) => ({
    categories: Object.entries(group.categories).map(
      ([category, totalAmount]) => ({
        category,
        totalAmount,
      }),
    ),
    total: group.total,
    transactionType: group.transactionType,
  }));
};

const calculateTotalsByDateCategory = (transactions) => {
  const groups = transactions.reduce((currentGroups, transaction) => {
    const date = new Date(transaction.selectedDate || 0);
    const dateKey = Number.isNaN(date.getTime())
      ? ''
      : date.toISOString().slice(0, 10);
    const transactionType = getTransactionType(transaction);
    const category = getCategoryLabel(transaction);
    const key = `${dateKey}-${transactionType}-${category}`;

    currentGroups[key] = currentGroups[key] || {
      category,
      date: dateKey,
      totalAmount: 0,
      transactionType,
    };
    currentGroups[key].totalAmount += Number(transaction.amount || 0);

    return currentGroups;
  }, {});

  return Object.values(groups);
};

const getTransactionCacheKey = (groupId, transactionType) =>
  groupId ? `${groupId}:${transactionType || ''}` : null;

const getCachedTransactionState = (groupId, transactionType) =>
  transactionStateCache.get(getTransactionCacheKey(groupId, transactionType));

export default function useTransactionBalanceLocal(
  transactionType,
  { autoLoad = true } = {},
) {
  const { groupId, loading: workspaceLoading } = useCurrentWorkspaceScope({
    autoLoad,
  });
  const waitingForWorkspace = Boolean(autoLoad && workspaceLoading && !groupId);
  const cachedState = getCachedTransactionState(groupId, transactionType);
  const [transactions, setTransactions] = useState(
    () => cachedState?.transactions || [],
  );
  const [totalAmountByCategory, setTotalAmountByCategory] = useState(
    () => cachedState?.totalAmountByCategory || [],
  );
  const [totalAmountByDateCategory, setTotalAmountByDateCategory] = useState(
    () => cachedState?.totalAmountByDateCategory || [],
  );
  const [pagination, setPagination] = useState({
    hasMore: cachedState?.pagination?.hasMore || false,
    page: cachedState?.pagination?.page || 0,
  });
  const [isLoading, setIsLoading] = useState(
    () => Boolean(autoLoad) && !cachedState,
  );
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] =
    useState(false);
  const [error, setError] = useState(null);
  const isLoadingMoreTransactionsRef = useRef(false);

  const fetchTransactionsPage = useCallback(
    async (page) => {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const response = await transactionRepository.getPage({
        limit: TRANSACTIONS_PAGE_SIZE,
        page,
        groupId: effectiveGroupId,
        transactionType,
      });

      return {
        data: (response.data || []).map(normalizeTransaction),
        pagination: response.pagination || {
          hasMore: false,
          page,
        },
      };
    },
    [groupId, transactionType],
  );

  const refreshTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const [transactionsResponse, allTransactions] = await Promise.all([
        fetchTransactionsPage(1),
        transactionRepository.getAll({ groupId: effectiveGroupId }),
      ]);
      const normalizedTransactions = allTransactions.map(normalizeTransaction);
      const nextState = {
        pagination: transactionsResponse.pagination,
        totalAmountByCategory: calculateTotalsByCategory(
          normalizedTransactions,
        ),
        totalAmountByDateCategory: calculateTotalsByDateCategory(
          normalizedTransactions,
        ),
        transactions: transactionsResponse.data,
      };
      const cacheKey = getTransactionCacheKey(
        effectiveGroupId,
        transactionType,
      );

      if (cacheKey) {
        transactionStateCache.set(cacheKey, nextState);
      }

      setTransactions(nextState.transactions);
      setPagination(nextState.pagination);
      setTotalAmountByCategory(nextState.totalAmountByCategory);
      setTotalAmountByDateCategory(nextState.totalAmountByDateCategory);
      return nextState.transactions;
    } catch (requestError) {
      console.error(
        'Error al obtener transacciones locales desde useTransactionBalanceData:',
        requestError,
      );
      setError(requestError);
      throw requestError;
    } finally {
      setIsLoading(false);
      isLoadingMoreTransactionsRef.current = false;
    }
  }, [fetchTransactionsPage, groupId]);

  const loadMoreTransactions = useCallback(async () => {
    if (
      isLoading ||
      isLoadingMoreTransactionsRef.current ||
      !pagination.hasMore
    ) {
      return;
    }

    isLoadingMoreTransactionsRef.current = true;
    setIsLoadingMoreTransactions(true);
    setError(null);

    try {
      const nextPage = (pagination.page || 1) + 1;
      const transactionsResponse = await fetchTransactionsPage(nextPage);

      setTransactions((currentTransactions) => {
        const loadedTransactionIds = new Set(
          currentTransactions.map(getTransactionIdentity),
        );
        const nextTransactions = transactionsResponse.data.filter(
          (transaction) => {
            const transactionId = getTransactionIdentity(transaction);

            if (loadedTransactionIds.has(transactionId)) {
              return false;
            }

            loadedTransactionIds.add(transactionId);
            return true;
          },
        );

        return [...currentTransactions, ...nextTransactions];
      });
      setPagination(transactionsResponse.pagination);
    } catch (requestError) {
      console.error(
        'Error al cargar más transacciones locales desde useTransactionBalanceData:',
        requestError,
      );
      setError(requestError);
      throw requestError;
    } finally {
      isLoadingMoreTransactionsRef.current = false;
      setIsLoadingMoreTransactions(false);
    }
  }, [
    fetchTransactionsPage,
    isLoading,
    pagination.hasMore,
    pagination.page,
  ]);

  const createTransaction = useCallback(
    async (data, options = {}) => {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const transaction = normalizeTransaction(
        await transactionRepository.create(toStorageTransaction(data), {
          groupId: effectiveGroupId,
          ...options,
        }),
      );
      requestLocalChangeSync();
      await refreshTransactions();
      return transaction;
    },
    [groupId, refreshTransactions],
  );

  const updateTransaction = useCallback(
    async (id, updates, options = {}) => {
      const transaction = await transactionRepository.update(
        String(id),
        toStorageTransaction(updates),
        options,
      );

      if (!transaction) {
        throw new Error('Transacción no encontrada');
      }

      const normalizedTransaction = normalizeTransaction(transaction);
      requestLocalChangeSync();
      await refreshTransactions();
      return normalizedTransaction;
    },
    [refreshTransactions],
  );

  const deleteTransaction = useCallback(
    async (id, options = {}) => {
      const transaction = await transactionRepository.softDelete(
        String(id),
        options,
      );

      if (!transaction) {
        throw new Error('Transacción no encontrada');
      }

      requestLocalChangeSync();
      await refreshTransactions();
      return normalizeTransaction(transaction);
    },
    [refreshTransactions],
  );

  useEffect(() => {
    if (!autoLoad || waitingForWorkspace) {
      return;
    }

    const nextCachedState = getCachedTransactionState(groupId, transactionType);

    if (nextCachedState) {
      setTransactions(nextCachedState.transactions);
      setPagination(nextCachedState.pagination);
      setTotalAmountByCategory(nextCachedState.totalAmountByCategory);
      setTotalAmountByDateCategory(nextCachedState.totalAmountByDateCategory);
    } else {
      setTransactions([]);
      setPagination({ hasMore: false, page: 0 });
      setTotalAmountByCategory([]);
      setTotalAmountByDateCategory([]);
    }

    refreshTransactions().catch(() => {});
  }, [
    autoLoad,
    groupId,
    refreshTransactions,
    transactionType,
    waitingForWorkspace,
  ]);

  return {
    createTransaction,
    deleteTransaction,
    error,
    hasMoreTransactions: pagination.hasMore,
    isLoading,
    isLoadingMoreTransactions,
    isLoadingTransactions: isLoading,
    loadMoreTransactions,
    refreshTransactions,
    setTransactions,
    totalAmountByCategory,
    totalAmountByDateCategory,
    transactions,
    updateTransaction,
  };
}
