import {
  normalizeTransaction,
  toStorageTransaction,
} from './useTransactionBalanceLocal';

describe('transaction client metadata', () => {
  test('keeps selected client on stored sales', () => {
    expect(
      toStorageTransaction({
        amount: 100,
        client: { clientId: 'client_1' },
        transactionType: 'Ventas',
      }).client,
    ).toEqual({ clientId: 'client_1' });
  });

  test('normalizes client ids from stored transactions', () => {
    expect(
      normalizeTransaction({
        client: { id: 42, name: 'Ana' },
        transactionId: 'transaction_1',
      }).client,
    ).toEqual({ clientId: '42', id: 42, name: 'Ana' });
  });
});
