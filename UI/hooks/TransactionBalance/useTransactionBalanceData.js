import { useCallback, useEffect, useState } from 'react';

import transactionService from '../../services/TransactionBalance/API/transactionService';

export default function useTransactionBalanceData({
  addTransactionModalIsVisible,
  deleteTransactionModalIsVisible,
}) {
  const [transactions, setTransactions] = useState([]);
  const [totalAmountByCategory, setTotalAmountByCategory] = useState([]);
  const [totalAmountByDateCategory, setTotalAmountByDateCategory] = useState(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [
        transactionsResponse,
        totalAmountByCategoryResponse,
        totalAmountByDateCategoryResponse,
      ] = await Promise.all([
        transactionService.getAllTransactions(),
        transactionService.getTotalAmountByCategory(),
        transactionService.getTotalAmountByDateCategory(),
      ]);

      setTransactions(transactionsResponse);
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
    }
  }, []);

  useEffect(() => {
    if (!addTransactionModalIsVisible && !deleteTransactionModalIsVisible) {
      refreshTransactions();
    }
  }, [
    addTransactionModalIsVisible,
    deleteTransactionModalIsVisible,
    refreshTransactions,
  ]);

  return {
    error,
    isLoading,
    refreshTransactions,
    totalAmountByCategory,
    totalAmountByDateCategory,
    transactions,
  };
}
