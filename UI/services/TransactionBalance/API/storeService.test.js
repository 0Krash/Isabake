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

  test('postStore sends payload and returns API response', async () => {
    const payload = {
      Address: 'Calle 2',
      Alias: 'NTE',
      Name: 'Norte',
    };
    const apiResponse = {
      status: 'success',
      data: {
        store: {
          storeId: 2,
          ...payload,
        },
      },
    };
    axios.post.mockResolvedValue({ data: apiResponse });

    await expect(storeService.postStore(payload)).resolves.toBe(apiResponse);
    expect(axios.post).toHaveBeenCalledWith(URL_Stores, payload);
  });

  test('updateStoreById sends patch payload and returns API response', async () => {
    const payload = {
      Address: 'Calle 3',
      Alias: 'SUR',
      Name: 'Sur',
    };
    const apiResponse = {
      status: 'success',
      data: {
        store: {
          storeId: 3,
          ...payload,
        },
      },
    };
    axios.patch.mockResolvedValue({ data: apiResponse });

    await expect(storeService.updateStoreById(3, payload)).resolves.toBe(
      apiResponse
    );
    expect(axios.patch).toHaveBeenCalledWith(`${URL_Stores}/3`, payload);
  });

  test('deleteStoreById deletes by URL id and returns API response', async () => {
    const apiResponse = { status: 'success' };
    axios.delete.mockResolvedValue({ data: apiResponse });

    await expect(storeService.deleteStoreById(3)).resolves.toBe(apiResponse);
    expect(axios.delete).toHaveBeenCalledWith(`${URL_Stores}/3`);
  });

  test('propagates request errors', async () => {
    const requestError = new Error('network error');
    axios.get.mockRejectedValue(requestError);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(storeService.getAllStores()).rejects.toBe(requestError);

    console.error.mockRestore();
  });
});
