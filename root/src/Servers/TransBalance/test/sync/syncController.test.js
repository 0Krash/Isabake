const mockPushChanges = jest.fn();
const mockPullChanges = jest.fn();

jest.mock('../../services/syncService', () => ({
  SyncService: jest.fn(() => ({
    pullChanges: mockPullChanges,
    pushChanges: mockPushChanges,
  })),
}));

const syncController = require('../../controllers/syncController');

const createResponse = () => {
  const res = {
    body: null,
    statusCode: null,
    json: jest.fn((body) => {
      res.body = body;
      return res;
    }),
    status: jest.fn((statusCode) => {
      res.statusCode = statusCode;
      return res;
    }),
  };

  return res;
};

const invoke = (handler, req, res) =>
  new Promise((resolve, reject) => {
    handler(req, res, reject);
    setImmediate(() => resolve(res));
  });

describe('syncController direct handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('pushChanges validates events array without opening an HTTP listener', async () => {
    const res = createResponse();

    await invoke(
      syncController.pushChanges,
      {
        body: {
          deviceId: 'device_1',
          groupId: 'group_1',
        },
        get: jest.fn(),
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({
      message: 'events_array_required',
      status: 'failed',
    });
    expect(mockPushChanges).not.toHaveBeenCalled();
  });

  test('pushChanges delegates valid payload to SyncService', async () => {
    mockPushChanges.mockResolvedValueOnce({
      accepted: [],
      cursor: '0',
      rejected: [],
    });
    const res = createResponse();

    await invoke(
      syncController.pushChanges,
      {
        body: {
          deviceId: 'device_1',
          events: [],
          groupId: 'group_1',
        },
        get: jest.fn(),
      },
      res,
    );

    expect(mockPushChanges).toHaveBeenCalledWith({
      deviceId: 'device_1',
      events: [],
      groupId: 'group_1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      accepted: [],
      cursor: '0',
      rejected: [],
    });
  });

  test('pullChanges delegates group-scoped query to SyncService', async () => {
    mockPullChanges.mockResolvedValueOnce({
      changes: [],
      cursor: '5',
      groupId: 'group_1',
    });
    const res = createResponse();

    await invoke(
      syncController.pullChanges,
      {
        query: {
          cursor: '4',
          groupId: 'group_1',
        },
      },
      res,
    );

    expect(mockPullChanges).toHaveBeenCalledWith({
      cursor: '4',
      groupId: 'group_1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      changes: [],
      cursor: '5',
      groupId: 'group_1',
    });
  });
});
