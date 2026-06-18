import axios from 'axios';

import inventoryService from './inventoryService';

jest.mock('axios');

describe('inventoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllInventoryItems returns inventory items from response data payload', async () => {
    const inventoryItems = [
      {
        inventoryId: 1,
        lots: [],
        name: 'Harina',
      },
    ];
    axios.get.mockResolvedValue({
      data: {
        data: inventoryItems,
      },
    });

    await expect(inventoryService.getAllInventoryItems()).resolves.toBe(
      inventoryItems
    );
    expect(axios.get).toHaveBeenCalledWith(inventoryService.inventoryUrl);
  });

  test('postInventoryItem sends payload and returns API response', async () => {
    const payload = {
      category: 'Secos',
      lots: [],
      name: 'Harina',
      storage: 'Seco',
    };
    const apiResponse = {
      status: 'success',
      data: {
        inventoryItem: {
          inventoryId: 2,
          ...payload,
        },
      },
    };
    axios.post.mockResolvedValue({ data: apiResponse });

    await expect(inventoryService.postInventoryItem(payload)).resolves.toBe(
      apiResponse
    );
    expect(axios.post).toHaveBeenCalledWith(
      inventoryService.inventoryUrl,
      payload
    );
  });

  test('updateInventoryItemById sends patch payload and returns API response', async () => {
    const payload = {
      category: 'Lacteos',
      lots: [],
      name: 'Queso crema',
      storage: 'Refrigerado',
    };
    const apiResponse = {
      status: 'success',
      data: {
        inventoryItem: {
          inventoryId: 1,
          ...payload,
        },
      },
    };
    axios.patch.mockResolvedValue({ data: apiResponse });

    await expect(
      inventoryService.updateInventoryItemById(1, payload)
    ).resolves.toBe(apiResponse);
    expect(axios.patch).toHaveBeenCalledWith(
      `${inventoryService.inventoryUrl}/1`,
      payload
    );
  });

  test('deleteInventoryItemById deletes by URL id and returns API response', async () => {
    const apiResponse = { status: 'success' };
    axios.delete.mockResolvedValue({ data: apiResponse });

    await expect(inventoryService.deleteInventoryItemById(1)).resolves.toBe(
      apiResponse
    );
    expect(axios.delete).toHaveBeenCalledWith(
      `${inventoryService.inventoryUrl}/1`
    );
  });

  test('propagates request errors', async () => {
    const requestError = new Error('network error');
    axios.get.mockRejectedValue(requestError);
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(inventoryService.getAllInventoryItems()).rejects.toBe(
      requestError
    );

    console.warn.mockRestore();
  });
});
