import { runBackendSyncConnectivityCheck } from './runSyncIntegrationChecks';

describe('runSyncIntegrationChecks', () => {
  test('connectivity check reports backend pull result shape', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          changes: [],
          cursor: '7',
          groupId: 'group_1',
        }),
    }));

    const result = await runBackendSyncConnectivityCheck({
      baseUrl: 'http://sync.example.test',
      fetchImpl,
      groupId: 'group_1',
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'backendSyncConnectivity',
        ok: true,
        skipped: false,
      }),
    );
    expect(result.details).toEqual({
      baseUrl: 'http://sync.example.test',
      changeCount: 0,
      cursor: '7',
      groupId: 'group_1',
      httpStatus: 200,
      reachable: true,
      requestAttempted: true,
      responseShapeLooksValid: true,
      url: 'http://sync.example.test/sync/pull?cursor=0&groupId=group_1',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('connectivity check fails clearly without groupId', async () => {
    const result = await runBackendSyncConnectivityCheck({
      client: {
        pullChanges: jest.fn(),
      },
      groupId: '',
    });

    expect(result).toEqual(
      expect.objectContaining({
        error: 'groupId_required',
        failedStep: 'group_id',
        name: 'backendSyncConnectivity',
        ok: false,
      }),
    );
  });

  test('connectivity check validates missing sync URL before request', async () => {
    const fetchImpl = jest.fn();
    const result = await runBackendSyncConnectivityCheck({
      baseUrl: '',
      fetchImpl,
      groupId: 'group_1',
    });

    expect(result).toEqual(
      expect.objectContaining({
        error: 'sync_base_url_missing',
        failedStep: 'sync_config',
        name: 'backendSyncConnectivity',
        ok: false,
      }),
    );
    expect(result.details).toEqual({
      baseUrl: '',
      requestAttempted: false,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
