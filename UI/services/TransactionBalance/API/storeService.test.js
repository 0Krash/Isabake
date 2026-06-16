import axios from 'axios';

import storeService from './storeService';
import { URL_Stores } from '@env';

jest.mock('axios');

describe('storeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllStores returns stores from response data payload', async () => {
    const stores = [
      {
        storeId: 1,
        Name: 'Central',
        Alias: 'CENT',
        Address: 'Calle 1',
      },
    ];
    axios.get.mockResolvedValue({
      data: {
        data: stores,
      },
    });

    await expect(storeService.getAllStores()).resolves.toBe(stores);
    expect(axios.get).toHaveBeenCalledWith(URL_Stores);
  });

  test('propagates request errors', async () => {
    const requestError = new Error('network error');
    axios.get.mockRejectedValue(requestError);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(storeService.getAllStores()).rejects.toBe(requestError);

    console.error.mockRestore();
  });
});
