const mockPushChanges = jest.fn();
const mockPullChanges = jest.fn();
const mockVerifyDocuments = jest.fn();
const mockAssertCanSyncWorkspace = jest.fn();

jest.mock('../../services/syncService', () => ({
  SyncService: jest.fn(() => ({
    pullChanges: mockPullChanges,
    pushChanges: mockPushChanges,
    verifyDocuments: mockVerifyDocuments,
  })),
}));

jest.mock('../../services/workspaceService', () => ({
  WorkspaceService: jest.fn(() => ({
    assertCanSyncWorkspace: mockAssertCanSyncWorkspace,
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
    mockAssertCanSyncWorkspace.mockResolvedValue({
      role: 'member',
    });
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
        user: {
          userId: 'user_1',
        },
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
        user: {
          userId: 'user_1',
        },
      },
      res,
    );

    expect(mockAssertCanSyncWorkspace).toHaveBeenCalledWith({
      action: 'push',
      groupId: 'group_1',
      userId: 'user_1',
    });
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
        user: {
          userId: 'user_1',
        },
      },
      res,
    );

    expect(mockAssertCanSyncWorkspace).toHaveBeenCalledWith({
      action: 'pull',
      groupId: 'group_1',
      userId: 'user_1',
    });
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

  test('verifyDocuments requires membership and returns safe results', async () => {
    mockVerifyDocuments.mockResolvedValueOnce({
      groupId: 'group_1',
      results: [
        {
          collection: 'recipes',
          deleted: false,
          exists: true,
          remoteId: 'remote_1',
          serverVersion: 1,
          status: 'ok',
        },
      ],
    });
    const res = createResponse();

    await invoke(
      syncController.verifyDocuments,
      {
        body: {
          documents: [
            {
              collection: 'recipes',
              remoteId: 'remote_1',
              serverVersion: 1,
            },
          ],
          groupId: 'group_1',
        },
        user: {
          userId: 'user_1',
        },
      },
      res,
    );

    expect(mockAssertCanSyncWorkspace).toHaveBeenCalledWith({
      action: 'pull',
      groupId: 'group_1',
      userId: 'user_1',
    });
    expect(mockVerifyDocuments).toHaveBeenCalledWith({
      documents: [
        {
          collection: 'recipes',
          remoteId: 'remote_1',
          serverVersion: 1,
        },
      ],
      groupId: 'group_1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.results[0].document).toBeUndefined();
  });
});
