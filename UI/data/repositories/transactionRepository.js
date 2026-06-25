import { createRepository } from './repositoryUtils';

export const TRANSACTION_COLLECTION = 'transactions';

const normalizeTransaction = (transaction = {}) => ({
  amount: Number(transaction.amount || 0),
  category: transaction.category || null,
  description: transaction.description || '',
  financials: transaction.financials || undefined,
  itemQuantity: transaction.itemQuantity || '',
  quantity: transaction.quantity || '',
  selectedDate: transaction.selectedDate || new Date().toISOString(),
  store: transaction.store || null,
  transactionType: transaction.transactionType || '',
  uomId: transaction.uomId || '',
});

const repository = createRepository({
  collection: TRANSACTION_COLLECTION,
  idField: 'transactionId',
  idPrefix: 'transaction',
  prepareCreate: (transaction, id) => ({
    ...normalizeTransaction(transaction),
    transactionId: transaction.transactionId || id,
  }),
  prepareUpdate: (transaction, id) => ({
    ...transaction,
    ...normalizeTransaction(transaction),
    transactionId: transaction.transactionId || id,
  }),
});

const sortTransactions = (transactions) =>
  [...transactions].sort((transactionA, transactionB) => {
    const dateA = new Date(transactionA.selectedDate || 0).getTime();
    const dateB = new Date(transactionB.selectedDate || 0).getTime();

    if (dateA !== dateB) {
      return dateB - dateA;
    }

    return String(transactionB.transactionId || '').localeCompare(
      String(transactionA.transactionId || ''),
    );
  });

const getAll = async (options = {}) => {
  const transactions = await repository.getAll(options);
  const filteredTransactions = options.transactionType
    ? transactions.filter(
        (transaction) => transaction.transactionType === options.transactionType,
      )
    : transactions;

  return sortTransactions(filteredTransactions);
};

const getPage = async ({ limit = 20, page = 1, transactionType } = {}) => {
  const allTransactions = await getAll({ transactionType });
  const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const start = (normalizedPage - 1) * normalizedLimit;
  const data = allTransactions.slice(start, start + normalizedLimit);

  return {
    data,
    pagination: {
      hasMore: start + data.length < allTransactions.length,
      limit: normalizedLimit,
      page: normalizedPage,
      total: allTransactions.length,
      totalPages: Math.ceil(allTransactions.length / normalizedLimit),
    },
    result: data.length,
    status: 'success',
  };
};

const getByTransactionId = repository.getById;

export default {
  ...repository,
  getAll,
  getByTransactionId,
  getPage,
};
