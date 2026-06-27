import { runBackendSyncConnectivityCheck } from './runSyncIntegrationChecks';

describe('runSyncIntegrationChecks', () => {
  test('connectivity check reports backend pull result shape', async () => {
    const client = {
      pullChanges: jest.fn(async () => ({
        changes: [],
        cursor: '7',
        groupId: 'group_1',
      })),
    };

    const result = await runBackendSyncConnectivityCheck({
      client,
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
      changeCount: 0,
      cursor: '7',
      groupId: 'group_1',
    });
    expect(client.pullChanges).toHaveBeenCalledWith({
      cursor: '0',
      groupId: 'group_1',
    });
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
        name: 'backendSyncConnectivity',
        ok: false,
      }),
    );
  });
});
