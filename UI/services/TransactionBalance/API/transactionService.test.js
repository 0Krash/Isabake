import axios from 'axios';

import transactionService from './transactionService';
import { URL_Transactions } from '@env';

jest.mock('axios');

describe('transactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllTransactions returns response data payload', async () => {
    const transactions = [
      {
        transactionId: 'tx-1',
        transactionType: 'Ventas',
        description: 'Pastel',
        amount: 15000,
      },
    ];
    const apiResponse = {
      data: transactions,
      pagination: {
        hasMore: true,
        limit: 20,
        page: 1,
        total: 30,
        totalPages: 2,
      },
      result: 1,
      status: 'success',
    };
    axios.get.mockResolvedValue({
      data: apiResponse,
    });

    await expect(
      transactionService.getAllTransactions({
        limit: 20,
        page: 1,
        transactionType: 'Ventas',
      })
    ).resolves.toBe(apiResponse);
    expect(axios.get).toHaveBeenCalledWith(URL_Transactions, {
      params: {
        limit: 20,
        page: 1,
        transactionType: 'Ventas',
      },
    });
  });

  test('postTransaction sends payload and returns API response', async () => {
    const payload = {
      transactionType: 'Gastos',
      description: 'Harina',
      amount: 2500,
      quantity: '1',
    };
    const apiResponse = {
      status: 'success',
      data: {
        transaction: {
          transactionId: 'tx-2',
          ...payload,
        },
      },
    };
    axios.post.mockResolvedValue({ data: apiResponse });

    await expect(transactionService.postTransaction(payload)).resolves.toBe(
      apiResponse
    );
    expect(axios.post).toHaveBeenCalledWith(URL_Transactions, payload);
  });

  test('deleteTransactionById deletes by URL id and returns API response', async () => {
    const apiResponse = { status: 'success' };
    axios.delete.mockResolvedValue({ data: apiResponse });

    await expect(
      transactionService.deleteTransactionById('tx-1')
    ).resolves.toBe(apiResponse);
    expect(axios.delete).toHaveBeenCalledWith(`${URL_Transactions}/tx-1`);
  });

  test('getTotalAmountByCategory returns summary response', async () => {
    const summary = [
      {
        transactionType: 'Ventas',
        categories: [{ category: 'Ventas', totalAmount: 15000 }],
        total: 15000,
      },
    ];
    axios.get.mockResolvedValue({ data: summary });

    await expect(
      transactionService.getTotalAmountByCategory()
    ).resolves.toBe(summary);
    expect(axios.get).toHaveBeenCalledWith(
      `${URL_Transactions}/totalAmountByCategory`
    );
  });

  test('getTotalAmountByDateCategory returns summary response', async () => {
    const summary = [
      {
        transactionType: 'Gastos',
        months: [{ year: 2026, month: 6, monthTotalAmount: 2500 }],
      },
    ];
    axios.get.mockResolvedValue({ data: summary });

    await expect(
      transactionService.getTotalAmountByDateCategory()
    ).resolves.toBe(summary);
    expect(axios.get).toHaveBeenCalledWith(
      `${URL_Transactions}/totalAmountByDateCategory`
    );
  });

  test('propagates request errors', async () => {
    const requestError = new Error('network error');
    axios.get.mockRejectedValue(requestError);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(transactionService.getAllTransactions()).rejects.toBe(
      requestError
    );

    console.error.mockRestore();
  });
});
