import { useCallback, useEffect, useRef, useState } from 'react';

import transactionService from '../../services/TransactionBalance/API/transactionService';

const TRANSACTIONS_PAGE_SIZE = 20;

const getTransactionIdentity = (transaction) =>
  transaction.transactionId ||
  transaction._id ||
  `${transaction.selectedDate}-${transaction.transactionType}-${transaction.amount}`;

export default function useTransactionBalanceData(transactionType) {
  const [transactions, setTransactions] = useState([]);
  const [totalAmountByCategory, setTotalAmountByCategory] = useState([]);
  const [totalAmountByDateCategory, setTotalAmountByDateCategory] = useState(
    []
  );
  const [pagination, setPagination] = useState({
    hasMore: false,
    page: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] =
    useState(false);
  const [error, setError] = useState(null);
  const isLoadingMoreTransactionsRef = useRef(false);

  const fetchTransactionsPage = useCallback(
    async (page) => {
      const response = await transactionService.getAllTransactions({
        limit: TRANSACTIONS_PAGE_SIZE,
        page,
        transactionType,
      });

      return {
        data: response.data || [],
        pagination: response.pagination || {
          hasMore: false,
          page,
        },
      };
    },
    [transactionType]
  );

  const refreshTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [
        transactionsResponse,
        totalAmountByCategoryResponse,
        totalAmountByDateCategoryResponse,
      ] = await Promise.all([
        fetchTransactionsPage(1),
        transactionService.getTotalAmountByCategory(),
        transactionService.getTotalAmountByDateCategory(),
      ]);

      setTransactions(transactionsResponse.data);
      setPagination(transactionsResponse.pagination);
      setTotalAmountByCategory(totalAmountByCategoryResponse);
      setTotalAmountByDateCategory(totalAmountByDateCategoryResponse);
    } catch (requestError) {
      console.error(
        'Error al obtener transacciones desde useTransactionBalanceData:',
        requestError
      );
      setError(requestError);
    } finally {
      setIsLoading(false);
      isLoadingMoreTransactionsRef.current = false;
    }
  }, [fetchTransactionsPage]);

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
          currentTransactions.map(getTransactionIdentity)
        );
        const nextTransactions = transactionsResponse.data.filter(
          (transaction) => {
            const transactionId = getTransactionIdentity(transaction);

            if (loadedTransactionIds.has(transactionId)) {
              return false;
            }

            loadedTransactionIds.add(transactionId);
            return true;
          }
        );

        return [...currentTransactions, ...nextTransactions];
      });
      setPagination(transactionsResponse.pagination);
    } catch (requestError) {
      console.error(
        'Error al cargar más transacciones desde useTransactionBalanceData:',
        requestError
      );
      setError(requestError);
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

  useEffect(() => {
    refreshTransactions();
  }, [refreshTransactions]);

  return {
    error,
    hasMoreTransactions: pagination.hasMore,
    isLoading,
    isLoadingMoreTransactions,
    loadMoreTransactions,
    refreshTransactions,
    totalAmountByCategory,
    totalAmountByDateCategory,
    transactions,
  };
}
