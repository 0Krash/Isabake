const mockGetAllAsync = jest.fn();
const mockRunAsync = jest.fn();
const mockNotifyAutoSyncNeeded = jest.fn();

jest.mock('../db/database', () => ({
  initDatabase: jest.fn(async () => ({
    getAllAsync: mockGetAllAsync,
    runAsync: mockRunAsync,
  })),
}));

jest.mock('../db/localIds', () => ({
  createLocalId: jest.fn(() => 'outbox_1'),
}));

import {
  addOutboxEvent,
  getFailedOutboxCountsByCollection,
  getPendingOutboxCountsByCollection,
} from './syncOutbox';
import {
  __resetAutoSyncNotifierForTests,
  setAutoSyncNotifier,
} from './autoSyncNotifier';

describe('syncOutbox count helpers', () => {
  beforeEach(() => {
    mockGetAllAsync.mockReset();
    mockNotifyAutoSyncNeeded.mockReset();
    mockRunAsync.mockReset();
    __resetAutoSyncNotifierForTests();
  });

  test('adding an outbox event notifies auto-sync after the local write', async () => {
    await expect(
      addOutboxEvent('recipes', 'recipe_1', 'upsert', { name: 'Pan' }, {
        notifyAutoSyncNeeded: mockNotifyAutoSyncNeeded,
      }),
    ).resolves.toBe('outbox_1');

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sync_outbox'),
      expect.arrayContaining(['outbox_1', 'recipes', 'recipe_1', 'upsert']),
    );

    expect(mockNotifyAutoSyncNeeded).toHaveBeenCalledWith('local_change');
    expect(mockNotifyAutoSyncNeeded).toHaveBeenCalledTimes(1);
  });

  test('adding an outbox event retries when SQLite is temporarily locked', async () => {
    mockRunAsync
      .mockRejectedValueOnce(new Error('Call rejected: database is locked'))
      .mockResolvedValueOnce(undefined);

    await expect(
      addOutboxEvent('stores', 'store_1', 'create', { name: 'Central' }, {
        notifyAutoSyncNeeded: mockNotifyAutoSyncNeeded,
      }),
    ).resolves.toBe('outbox_1');

    expect(mockRunAsync).toHaveBeenCalledTimes(2);
    expect(mockNotifyAutoSyncNeeded).toHaveBeenCalledTimes(1);
  });

  test('adding an outbox event notifies the registered auto-sync handler', async () => {
    setAutoSyncNotifier(mockNotifyAutoSyncNeeded);

    await addOutboxEvent('inventory', 'inventory_1', 'update', {
      name: 'Harina',
    });

    expect(mockNotifyAutoSyncNeeded).toHaveBeenCalledWith('local_change');
    expect(mockNotifyAutoSyncNeeded).toHaveBeenCalledTimes(1);
  });

  test('does not notify auto-sync when the outbox insert fails', async () => {
    mockRunAsync.mockRejectedValueOnce(new Error('insert_failed'));

    await expect(
      addOutboxEvent('transactions', 'transaction_1', 'create', {
        amount: 10,
      }, {
        notifyAutoSyncNeeded: mockNotifyAutoSyncNeeded,
      }),
    ).rejects.toThrow('insert_failed');

    expect(mockNotifyAutoSyncNeeded).not.toHaveBeenCalled();
  });

  test('returns pending counts keyed by collection', async () => {
    mockGetAllAsync.mockResolvedValueOnce([
      { collection: 'recipes', count: 2 },
      { collection: 'inventory', count: '3' },
      { collection: null, count: 1 },
    ]);

    await expect(getPendingOutboxCountsByCollection()).resolves.toEqual({
      inventory: 3,
      recipes: 2,
      unknown: 1,
    });
  });

  test('returns failed counts keyed by collection', async () => {
    mockGetAllAsync.mockResolvedValueOnce([
      { collection: 'transactions', count: '4' },
    ]);

    await expect(getFailedOutboxCountsByCollection()).resolves.toEqual({
      transactions: 4,
    });
  });
});
