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

describe('syncOutbox count helpers', () => {
  beforeEach(() => {
    mockGetAllAsync.mockReset();
    mockNotifyAutoSyncNeeded.mockReset();
    mockRunAsync.mockReset();
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
