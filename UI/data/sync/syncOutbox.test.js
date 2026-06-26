const mockGetAllAsync = jest.fn();

jest.mock('../db/database', () => ({
  initDatabase: jest.fn(async () => ({
    getAllAsync: mockGetAllAsync,
  })),
}));

jest.mock('../db/localIds', () => ({
  createLocalId: jest.fn(() => 'outbox_1'),
}));

import {
  getFailedOutboxCountsByCollection,
  getPendingOutboxCountsByCollection,
} from './syncOutbox';

describe('syncOutbox count helpers', () => {
  beforeEach(() => {
    mockGetAllAsync.mockReset();
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
