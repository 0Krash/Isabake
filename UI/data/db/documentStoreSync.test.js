const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockRunAsync = jest.fn();
const mockAddOutboxEvent = jest.fn();

jest.mock('./database', () => ({
  initDatabase: jest.fn(async () => ({
    getAllAsync: mockGetAllAsync,
    getFirstAsync: mockGetFirstAsync,
    runAsync: mockRunAsync,
  })),
}));

jest.mock('./localIds', () => ({
  getLocalDeviceId: jest.fn(async () => 'device_1'),
}));

jest.mock('../sync/syncOutbox', () => ({
  addOutboxEvent: (...args) => mockAddOutboxEvent(...args),
}));

import {
  getDocumentsReadyToSync,
  saveDocument,
  softDeleteDocument,
} from './documentStore';

describe('documentStore sync outbox wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddOutboxEvent.mockResolvedValue('outbox_1');
    mockGetAllAsync.mockResolvedValue([]);
    mockGetFirstAsync.mockResolvedValue(null);
    mockRunAsync.mockResolvedValue(undefined);
  });

  test('saveDocument creates an outbox event for business writes', async () => {
    await saveDocument('recipes', 'recipe_1', { name: 'Pan' }, {
      groupId: 'group_1',
    });

    expect(mockAddOutboxEvent).toHaveBeenCalledWith(
      'recipes',
      'recipe_1',
      'create',
      expect.objectContaining({
        data: { name: 'Pan' },
        id: 'recipe_1',
      }),
      expect.objectContaining({
        db: expect.any(Object),
      }),
    );
  });

  test('saveDocument retries when SQLite is temporarily locked', async () => {
    mockRunAsync
      .mockRejectedValueOnce(new Error('database is locked'))
      .mockResolvedValueOnce(undefined);

    await saveDocument('stores', 'store_1', { name: 'Central' }, {
      groupId: 'group_1',
    });

    expect(mockRunAsync).toHaveBeenCalledTimes(2);
    expect(mockAddOutboxEvent).toHaveBeenCalled();
  });

  test('saveDocument does not create outbox for skipOutbox writes', async () => {
    await saveDocument('recipes', 'recipe_1', { name: 'Pan' }, {
      groupId: 'group_1',
      skipOutbox: true,
    });

    expect(mockAddOutboxEvent).not.toHaveBeenCalled();
  });

  test('softDeleteDocument creates a delete outbox event', async () => {
    await softDeleteDocument('transactions', 'transaction_1', {
      groupId: 'group_1',
    });

    expect(mockAddOutboxEvent).toHaveBeenCalledWith(
      'transactions',
      'transaction_1',
      'delete',
      { id: 'transaction_1' },
      expect.objectContaining({
        db: expect.any(Object),
      }),
    );
  });

  test('getDocumentsReadyToSync only reads pending shared documents', async () => {
    mockGetAllAsync.mockResolvedValue([
      {
        collection: 'recipes',
        createdAt: '2026-01-01T00:00:00.000Z',
        data: '{"name":"Pan"}',
        deletedAt: null,
        deviceId: 'device_1',
        groupId: 'group_1',
        id: 'recipe_1',
        localVersion: 1,
        remoteId: 'remote_1',
        serverVersion: 1,
        syncStatus: 'pending',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const result = await getDocumentsReadyToSync();

    expect(mockGetAllAsync.mock.calls[0][0]).toContain(
      "AND syncStatus = 'pending'",
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 'recipe_1',
        syncStatus: 'pending',
      }),
    ]);
  });
});
