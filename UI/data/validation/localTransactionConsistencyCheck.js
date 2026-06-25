import {
  storeRepository,
  transactionRepository,
} from '../repositories';
import { idsMatch, normalizeId } from '../../utils/idUtils';

const hasValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== '';

const getTransactionId = (transaction = {}) =>
  normalizeId(transaction.transactionId || transaction.id || transaction.localId);

const getStoreId = (store = {}) => {
  if (!store) {
    return '';
  }

  if (typeof store === 'object') {
    return normalizeId(store.storeId || store.id || store.localId);
  }

  return normalizeId(store);
};

export const runLocalTransactionConsistencyCheck = async () => {
  const warnings = [];
  const [transactions, stores] = await Promise.all([
    transactionRepository.getAll(),
    storeRepository.getAll(),
  ]);
  const storeIds = stores.map((store) =>
    normalizeId(store.storeId || store.id || store.localId),
  );

  transactions.forEach((transaction) => {
    const transactionId = getTransactionId(transaction);
    const amount = Number(transaction.amount);
    const selectedDate = transaction.selectedDate;
    const storeId = getStoreId(transaction.store);

    if (!transactionId) {
      warnings.push({
        code: 'transaction_missing_transaction_id',
        description: transaction.description || '',
      });
    }

    if (!Number.isFinite(amount)) {
      warnings.push({
        code: 'transaction_invalid_amount',
        amount: transaction.amount,
        transactionId,
      });
    }

    if (!hasValue(selectedDate) || Number.isNaN(new Date(selectedDate).getTime())) {
      warnings.push({
        code: 'transaction_missing_or_invalid_selected_date',
        selectedDate,
        transactionId,
      });
    }

    if (!hasValue(transaction.transactionType)) {
      warnings.push({
        code: 'transaction_missing_transaction_type',
        transactionId,
      });
    }

    if (
      transaction.transactionType === 'Ventas' &&
      String(transaction.category?.description || '').trim() === 'Recetas' &&
      !transaction.financials
    ) {
      warnings.push({
        code: 'recipe_sale_transaction_missing_financials',
        transactionId,
      });
    }

    if (
      storeId &&
      storeIds.length > 0 &&
      !storeIds.some((localStoreId) => idsMatch(localStoreId, storeId))
    ) {
      warnings.push({
        code: 'transaction_store_not_found',
        storeId,
        transactionId,
      });
    }
  });

  return {
    checkedAt: new Date().toISOString(),
    ok: warnings.length === 0,
    storesChecked: stores.length,
    transactionsChecked: transactions.length,
    warningCount: warnings.length,
    warnings,
  };
};

export default runLocalTransactionConsistencyCheck;
