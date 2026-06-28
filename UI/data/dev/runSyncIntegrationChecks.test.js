const mockDocuments = new Map();
const mockOutboxEvents = [];
let mockIdCounter = 0;

jest.mock('../db/localIds', () => ({
  createLocalId: jest.fn((prefix) => {
    mockIdCounter += 1;
    return `${prefix}_${mockIdCounter}`;
  }),
}));

jest.mock('../db/documentStore', () => ({
  getDocument: jest.fn(async (collection, id) => mockDocuments.get(`${collection}:${id}`)),
  saveDocument: jest.fn(async (collection, id, data, options = {}) => {
    const document = {
      collection,
      data,
      groupId: options.groupId,
      id,
      remoteId: null,
      serverVersion: null,
      syncStatus: 'pending',
    };

    mockDocuments.set(`${collection}:${id}`, document);
    mockOutboxEvents.push({
      collection,
      documentId: id,
      id: `outbox_${id}`,
      operation: 'create',
      payload: { id },
      status: 'pending',
    });

    return document;
  }),
}));

jest.mock('../sync/syncOutbox', () => ({
  getOutboxEventById: jest.fn(async (id) =>
    mockOutboxEvents.find((event) => event.id === id) || null,
  ),
  getPendingOutboxEvents: jest.fn(async () =>
    mockOutboxEvents.filter((event) => event.status === 'pending'),
  ),
}));

jest.mock('../sync/syncStateRepository', () => ({
  getLastSyncCursor: jest.fn(async () => '7'),
}));

jest.mock('../sync', () => ({
  pullRemoteChanges: jest.fn(async () => ({
    applied: [],
    conflicts: [],
    cursor: '7',
    ok: true,
    skipped: [],
  })),
  pushPendingChanges: jest.fn(async ({ eventIds = [], groupId }) => ({
    accepted: [],
    debug: {
      backendResponseRaw: {
        accepted: [],
        rejected: [],
      },
      pushRequestPayload: {
        events: eventIds.map((eventId) => ({ eventId, groupId })),
        groupId,
      },
    },
    ok: true,
    rejected: [],
    skipped: [],
  })),
}));

import {
  runAuthWorkspaceDevCheck,
  runBackendSyncConnectivityCheck,
  runMembershipSyncAccessDevCheck,
  runPushPullDevCheck,
  runTwoWorkspaceIsolationDevCheck,
} from './runSyncIntegrationChecks';
import { pushPendingChanges } from '../sync';

describe('runSyncIntegrationChecks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocuments.clear();
    mockOutboxEvents.length = 0;
    mockIdCounter = 0;
  });

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

  test('push/pull dev check fails with expanded debug when backend accepts zero events', async () => {
    const result = await runPushPullDevCheck({
      groupId: 'phase_13_sync_dev_group',
    });

    expect(result).toEqual(
      expect.objectContaining({
        error: 'push_did_not_accept_dev_event',
        failedStep: 'push_acceptance',
        ok: false,
      }),
    );
    expect(result.debug).toEqual(
      expect.objectContaining({
        expectedCollection: 'recipes',
        expectedDocumentId: expect.stringContaining('phase_13_sync_dev_recipe'),
        expectedEventId: expect.stringContaining('outbox_'),
        groupId: 'phase_13_sync_dev_group',
        outboxBeforePushExpanded: expect.arrayContaining([
          expect.objectContaining({ operation: 'create' }),
        ]),
        pushAcceptedExpanded: [],
        pushRejectedExpanded: [],
        pushRequestPayload: expect.objectContaining({
          groupId: 'phase_13_sync_dev_group',
        }),
        pushSkippedExpanded: [],
      }),
    );
  });

  test('workspace isolation fails when pulls return zero changes', async () => {
    pushPendingChanges.mockImplementation(async ({ eventIds = [], groupId }) => ({
      accepted: eventIds.map((eventId) => ({
        eventId,
        localId: eventId.replace('outbox_', ''),
        remoteId: `remote_${eventId}`,
        serverVersion: 1,
      })),
      ok: true,
      rejected: [],
      skipped: [],
    }));
    const client = {
      pullChanges: jest.fn(async ({ groupId }) => ({
        changes: [],
        cursor: '1',
        groupId,
      })),
    };

    const result = await runTwoWorkspaceIsolationDevCheck({
      client,
      groupA: 'group_a',
      groupB: 'group_b',
    });

    expect(result).toEqual(
      expect.objectContaining({
        error: 'workspace_isolation_no_changes_pulled',
        failedStep: 'workspace_isolation_no_changes_pulled',
        ok: false,
      }),
    );
  });

  test('auth/workspace dev check creates workspace and member through API', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (url.endsWith('/workspaces') && fetchImpl.mock.calls.length === 1) {
        return {
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({
              status: 'success',
              workspace: {
                groupId: 'phase_14_group',
                name: 'Auth workspace',
                ownerUserId: 'phase_14_auth_dev_owner',
                workspaceId: 'phase_14_group',
              },
            }),
        };
      }

      if (url.endsWith('/workspaces/phase_14_group/members')) {
        return {
          ok: true,
          status: 201,
          text: async () =>
            JSON.stringify({
              membership: {
                groupId: 'phase_14_group',
                role: 'member',
                status: 'active',
                userId: 'phase_14_auth_dev_member',
              },
              status: 'success',
            }),
        };
      }

      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'success',
            workspaces: [
              {
                groupId: 'phase_14_group',
              },
            ],
          }),
      };
    });

    const result = await runAuthWorkspaceDevCheck({
      baseUrl: 'http://sync.example.test',
      fetchImpl,
      groupId: 'phase_14_group',
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'authWorkspaceDev',
        ok: true,
      }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://sync.example.test/workspaces',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Bearer '),
          'x-dev-user-id': 'phase_14_auth_dev_owner',
        }),
      }),
    );
  });

  test('membership sync access check validates viewer and non-member failures', async () => {
    pushPendingChanges.mockImplementation(async ({ eventIds = [] }) => ({
      accepted: eventIds.map((eventId) => ({
        eventId,
        localId: eventId.replace('outbox_', ''),
        remoteId: `remote_${eventId}`,
        serverVersion: 1,
      })),
      ok: true,
      rejected: [],
      skipped: [],
    }));
    const fetchImpl = jest.fn(async (url, request) => {
      const headers = request.headers || {};
      const userId = headers['x-dev-user-id'];

      if (url.includes('/workspaces')) {
        return {
          ok: true,
          status: request.method === 'POST' ? 201 : 200,
          text: async () =>
            JSON.stringify({
              membership: {
                role: 'member',
              },
              status: 'success',
              workspace: {
                groupId: 'phase_14_group',
                workspaceId: 'phase_14_group',
              },
            }),
        };
      }

      if (url.includes('/sync/pull')) {
        if (userId.includes('non_member')) {
          return {
            ok: false,
            status: 403,
            text: async () =>
              JSON.stringify({ message: 'workspace_membership_required' }),
          };
        }

        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              changes: [],
              cursor: '1',
              groupId: 'phase_14_group',
            }),
        };
      }

      if (url.includes('/sync/push') && userId.includes('viewer')) {
        return {
          ok: false,
          status: 403,
          text: async () =>
            JSON.stringify({ message: 'workspace_role_cannot_sync' }),
        };
      }

      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            accepted: [],
            cursor: '1',
            rejected: [],
          }),
      };
    });

    const result = await runMembershipSyncAccessDevCheck({
      baseUrl: 'http://sync.example.test',
      fetchImpl,
      groupId: 'phase_14_group',
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'membershipSyncAccessDev',
        ok: true,
      }),
    );
    expect(result.details.viewerPushError).toBe('workspace_role_cannot_sync');
    expect(result.details.nonMemberPullError).toBe(
      'workspace_membership_required',
    );
  });
});
