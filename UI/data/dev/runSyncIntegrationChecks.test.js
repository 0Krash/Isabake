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
  getConflictDocuments: jest.fn(async () =>
    Array.from(mockDocuments.values()).filter(
      (document) => document.syncStatus === 'conflict',
    ),
  ),
  getDocument: jest.fn(async (collection, id) => mockDocuments.get(`${collection}:${id}`)),
  markDocumentConflict: jest.fn(async (collection, id, { serverVersion } = {}) => {
    const key = `${collection}:${id}`;
    const document = mockDocuments.get(key);

    if (document) {
      document.serverVersion = serverVersion || document.serverVersion;
      document.syncStatus = 'conflict';
    }

    return document || null;
  }),
  preferRemoteVersion: jest.fn(async (collection, id, remoteDocument) => {
    const document = {
      collection,
      data: remoteDocument.document || remoteDocument.data || {},
      groupId: remoteDocument.document?.groupId || remoteDocument.data?.groupId,
      id,
      remoteId: remoteDocument.remoteId,
      serverVersion: remoteDocument.serverVersion,
      syncStatus: 'synced',
    };
    mockDocuments.set(`${collection}:${id}`, document);
    return document;
  }),
  saveDocument: jest.fn(async (collection, id, data, options = {}) => {
    const existingDocument = mockDocuments.get(`${collection}:${id}`);
    const document = {
      collection,
      data,
      groupId: options.groupId,
      id,
      remoteId: existingDocument?.remoteId || null,
      serverVersion: existingDocument?.serverVersion || null,
      syncStatus: 'pending',
    };

    mockDocuments.set(`${collection}:${id}`, document);
    mockOutboxEvents.push({
      collection,
      documentId: id,
      id: `outbox_${id}_${mockOutboxEvents.length + 1}`,
      operation: existingDocument ? 'update' : 'create',
      payload: { id },
      status: 'pending',
    });

    return document;
  }),
}));

jest.mock('../sync/syncOutbox', () => ({
  addOutboxEvent: jest.fn(async (collection, documentId, operation, payload) => {
    const event = {
      collection,
      documentId,
      id: `outbox_${documentId}_${mockOutboxEvents.length + 1}`,
      operation,
      payload,
      status: 'pending',
    };
    mockOutboxEvents.push(event);
    return event.id;
  }),
  getConflictOutboxEvents: jest.fn(async () =>
    mockOutboxEvents.filter((event) => event.status === 'conflict'),
  ),
  getOutboxEventById: jest.fn(async (id) =>
    mockOutboxEvents.find((event) => event.id === id) || null,
  ),
  getPendingOutboxEventsForDocument: jest.fn(async (collection, documentId) =>
    mockOutboxEvents.filter(
      (event) =>
        event.collection === collection &&
        event.documentId === documentId &&
        event.status === 'pending',
    ),
  ),
  getPendingOutboxEvents: jest.fn(async () =>
    mockOutboxEvents.filter((event) => event.status === 'pending'),
  ),
  markOutboxEventResolved: jest.fn(async (id, resolution) => {
    const event = mockOutboxEvents.find((item) => item.id === id);

    if (event) {
      event.lastError = JSON.stringify(resolution);
      event.status = 'done';
    }
  }),
}));

jest.mock('../validation/syncReadinessCheck', () => ({
  runSyncReadinessCheck: jest.fn(async () => ({
    conflictDocumentCount: Array.from(mockDocuments.values()).filter(
      (document) => document.syncStatus === 'conflict',
    ).length,
    conflictOutboxCount: mockOutboxEvents.filter(
      (event) => event.status === 'conflict',
    ).length,
    ok: false,
  })),
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
  runAuthenticatedPushPullDevCheck,
  runAuthenticatedWorkspaceIsolationDevCheck,
  runBackendSyncConnectivityCheck,
  runConflictSimulationDevCheck,
  runMembershipSyncAccessDevCheck,
  runPullOverPendingConflictDevCheck,
  runPushPullDevCheck,
  runResolveLatestConflictPreferRemoteDevCheck,
  runTwoWorkspaceIsolationDevCheck,
} from './runSyncIntegrationChecks';
import { pullRemoteChanges, pushPendingChanges } from '../sync';

const acceptPushEvents = async ({ eventIds = [] }) => {
  eventIds.forEach((eventId) => {
    const outboxEvent = mockOutboxEvents.find((event) => event.id === eventId);

    if (outboxEvent) {
      outboxEvent.status = 'done';
      const document = mockDocuments.get(
        `${outboxEvent.collection}:${outboxEvent.documentId}`,
      );

      if (document) {
        document.remoteId = `remote_${outboxEvent.documentId}`;
        document.serverVersion = 1;
        document.syncStatus = 'synced';
      }
    }
  });

  return {
    accepted: eventIds.map((eventId) => ({
      eventId,
      localId: eventId.replace('outbox_', ''),
      remoteId: `remote_${eventId}`,
      serverVersion: 1,
    })),
    ok: true,
    rejected: [],
    skipped: [],
  };
};

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

  test('unauthenticated push/pull reports auth_required_for_push_pull', async () => {
    pushPendingChanges.mockImplementation(async () => ({
      accepted: [],
      error: 'auth_required',
      ok: false,
      rejected: [],
      skipped: [],
    }));

    const result = await runPushPullDevCheck({
      groupId: 'phase_14_group',
    });

    expect(result).toEqual(
      expect.objectContaining({
        error: 'auth_required',
        failedStep: 'auth_required_for_push_pull',
        ok: false,
      }),
    );
    expect(result.debug).toEqual(
      expect.objectContaining({
        authHeadersPresent: false,
        groupId: 'phase_14_group',
        userId: null,
      }),
    );
  });

  test('authenticated push/pull passes when backend accepts exact event', async () => {
    pushPendingChanges.mockImplementation(acceptPushEvents);

    const result = await runAuthenticatedPushPullDevCheck({
      baseUrl: 'http://sync.example.test',
      fetchImpl: jest.fn(async (url) => ({
        ok: true,
        status: url.includes('/workspaces') ? 201 : 200,
        text: async () =>
          JSON.stringify(
            url.includes('/workspaces')
              ? {
                  membership: { role: 'member' },
                  status: 'success',
                  workspace: {
                    groupId: 'phase_14_group',
                    workspaceId: 'phase_14_group',
                  },
                }
              : {},
          ),
      })),
      groupId: 'phase_14_group',
      userId: 'phase_14_user',
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'pushPullDev',
        ok: true,
      }),
    );
    expect(result.details.acceptedEventsSynced).toBe(true);
    expect(result.details.expectedEventId).toEqual(expect.stringContaining('outbox_'));
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

  test('workspace isolation fails if auth is required and missing', async () => {
    const result = await runTwoWorkspaceIsolationDevCheck({
      groupA: 'group_a',
      groupB: 'group_b',
      requireAuth: true,
    });

    expect(result).toEqual(
      expect.objectContaining({
        error: 'auth_required',
        failedStep: 'auth_required_for_workspace_isolation',
        ok: false,
      }),
    );
    expect(result.debug.groupAAuthHeadersPresent).toBe(false);
    expect(result.debug.groupBAuthHeadersPresent).toBe(false);
  });

  test('authenticated workspace isolation passes with valid auth', async () => {
    pushPendingChanges.mockImplementation(acceptPushEvents);
    pullRemoteChanges.mockImplementationOnce(async () => ({
      applied: [],
      conflicts: [],
      cursor: '999',
      ok: true,
      skipped: [
        {
          reason: 'change_groupId_mismatch',
        },
      ],
    }));
    const fetchImpl = jest.fn(async (url, request = {}) => {
      if (url.includes('/workspaces')) {
        return {
          ok: true,
          status: request.method === 'POST' ? 201 : 200,
          text: async () =>
            JSON.stringify({
              membership: { role: 'owner' },
              status: 'success',
              workspace: {
                groupId: url.includes('group_b') ? 'group_b' : 'group_a',
                workspaceId: url.includes('group_b') ? 'group_b' : 'group_a',
              },
            }),
        };
      }

      const query = url.includes('group_b') ? 'group_b' : 'group_a';
      const localIds = Array.from(mockDocuments.values())
        .filter((document) => document.groupId === query)
        .map((document) => document.id);

      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            changes: localIds.map((localId, index) => ({
              collection: 'recipes',
              document: {
                groupId: query,
                localId,
              },
              remoteId: `remote_${localId}`,
              serverVersion: index + 1,
            })),
            cursor: '1',
            groupId: query,
          }),
      };
    });

    const result = await runAuthenticatedWorkspaceIsolationDevCheck({
      baseUrl: 'http://sync.example.test',
      fetchImpl,
      groupA: 'group_a',
      groupB: 'group_b',
      ownerUserId: 'phase_14_owner',
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'twoWorkspaceIsolationDev',
        ok: true,
      }),
    );
    expect(result.details.pullAChangeCount).toBeGreaterThan(0);
    expect(result.details.pullBChangeCount).toBeGreaterThan(0);
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
    pushPendingChanges.mockImplementation(acceptPushEvents);
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
        if (
          userId.includes('non_member') ||
          userId.includes('invited') ||
          userId.includes('removed')
        ) {
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
              changes: [
                {
                  collection: 'recipes',
                  document: {
                    groupId: 'phase_14_group',
                    localId: 'remote_visible_doc',
                  },
                  remoteId: 'remote_visible_doc',
                  serverVersion: 1,
                },
              ],
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

      if (
        url.includes('/sync/push') &&
        (userId.includes('non_member') ||
          userId.includes('invited') ||
          userId.includes('removed'))
      ) {
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
    expect(result.details.nonMemberPushError).toBe(
      'workspace_membership_required',
    );
    expect(result.details.invitedPullError).toBe(
      'workspace_membership_required',
    );
    expect(result.details.invitedPushError).toBe(
      'workspace_membership_required',
    );
    expect(result.details.removedPullError).toBe(
      'workspace_membership_required',
    );
    expect(result.details.removedPushError).toBe(
      'workspace_membership_required',
    );
    expect(result.details.memberPushAcceptedCount).toBeGreaterThan(0);
    expect(result.details.memberPullChangeCount).toBeGreaterThan(0);
    expect(result.details.viewerPullChangeCount).toBeGreaterThan(0);
  });

  test('membership access fails if member push accepted count is zero', async () => {
    pushPendingChanges.mockImplementationOnce(acceptPushEvents);
    pushPendingChanges.mockImplementationOnce(async () => ({
      accepted: [],
      ok: true,
      rejected: [],
      skipped: [],
    }));
    const fetchImpl = jest.fn(async (url, request) => {
      const userId = request.headers?.['x-dev-user-id'] || '';

      if (url.includes('/workspaces')) {
        return {
          ok: true,
          status: request.method === 'POST' ? 201 : 200,
          text: async () =>
            JSON.stringify({
              membership: { role: 'member' },
              status: 'success',
              workspace: {
                groupId: 'phase_14_group',
                workspaceId: 'phase_14_group',
              },
            }),
        };
      }

      if (
        userId.includes('viewer') &&
        url.includes('/sync/push')
      ) {
        return {
          ok: false,
          status: 403,
          text: async () =>
            JSON.stringify({ message: 'workspace_role_cannot_sync' }),
        };
      }

      if (
        userId.includes('non_member') ||
        userId.includes('invited') ||
        userId.includes('removed')
      ) {
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
            changes: [
              {
                collection: 'recipes',
                document: {
                  groupId: 'phase_14_group',
                  localId: 'visible',
                },
                remoteId: 'visible',
                serverVersion: 1,
              },
            ],
            cursor: '1',
            groupId: 'phase_14_group',
          }),
      };
    });

    const result = await runMembershipSyncAccessDevCheck({
      baseUrl: 'http://sync.example.test',
      fetchImpl,
      groupId: 'phase_14_group',
    });

    expect(result.ok).toBe(false);
    expect(result.details.memberPushAcceptedCount).toBe(0);
    expect(result.details.checks.memberPushAccepted).toBe(false);
  });

  test('conflict simulation returns ok only when conflict is detected and preserved', async () => {
    pushPendingChanges.mockImplementation(async ({ eventIds = [] }) => {
      const eventId = eventIds[0];
      const outboxEvent = mockOutboxEvents.find((event) => event.id === eventId);

      if (eventId?.includes('outbox_') && outboxEvent?.operation === 'update') {
        outboxEvent.status = 'conflict';
        const document = mockDocuments.get(
          `${outboxEvent.collection}:${outboxEvent.documentId}`,
        );

        if (document) {
          document.syncStatus = 'conflict';
          document.serverVersion = 2;
        }

        return {
          accepted: [],
          ok: false,
          rejected: [
            {
              attemptedBaseServerVersion: 1,
              currentServerVersion: 2,
              eventId,
              reason: 'conflict',
            },
          ],
          skipped: [],
        };
      }

      return acceptPushEvents({ eventIds });
    });
    const fetchImpl = jest.fn(async (url, request = {}) => ({
      ok: true,
      status: url.includes('/workspaces') && request.method === 'POST' ? 201 : 200,
      text: async () =>
        JSON.stringify(
          url.includes('/sync/push')
            ? {
                accepted: [
                  {
                    eventId: 'remote_update',
                    localId: 'remote_update',
                    remoteId: 'remote_update',
                    serverVersion: 2,
                  },
                ],
                cursor: '2',
                rejected: [],
              }
            : {
                membership: { role: 'member' },
                status: 'success',
                workspace: {
                  groupId: 'phase_15_group',
                  workspaceId: 'phase_15_group',
                },
              },
        ),
    }));

    const result = await runConflictSimulationDevCheck({
      baseUrl: 'http://sync.example.test',
      fetchImpl,
      groupId: 'phase_15_group',
      userId: 'phase_15_user',
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'conflictSimulationDev',
        ok: true,
      }),
    );
    expect(result.details.documentIsConflict).toBe(true);
    expect(result.details.outboxIsConflict).toBe(true);
    expect(result.details.readinessConflictDocumentCount).toBeGreaterThan(0);
  });

  test('pull-over-pending conflict check preserves local document', async () => {
    const { pullRemoteChanges } = require('../sync');

    pullRemoteChanges.mockImplementationOnce(async ({ groupId }) => {
      const document = Array.from(mockDocuments.values()).find(
        (item) => item.groupId === groupId,
      );

      if (document) {
        document.syncStatus = 'conflict';
        document.serverVersion = 99;
      }

      return {
        applied: [],
        conflicts: [
          {
            collection: 'recipes',
            localId: document?.id,
            reason: 'local_pending_or_conflict',
          },
        ],
        cursor: '99',
        ok: false,
        skipped: [],
      };
    });

    const result = await runPullOverPendingConflictDevCheck({
      baseUrl: 'http://sync.example.test',
      fetchImpl: jest.fn(async () => ({
        ok: true,
        status: 201,
        text: async () =>
          JSON.stringify({
            membership: { role: 'member' },
            status: 'success',
            workspace: {
              groupId: 'phase_15_pull_group',
              workspaceId: 'phase_15_pull_group',
            },
          }),
      })),
      groupId: 'phase_15_pull_group',
    });

    expect(result).toEqual(
      expect.objectContaining({
        name: 'pullOverPendingConflictDev',
        ok: true,
      }),
    );
    expect(result.details.localDocumentAfterPull.syncStatus).toBe('conflict');
    expect(result.details.noDuplicateOutbox).toBe(true);
    expect(result.details.localId).toContain('phase_15_conflict_dev_pull');
    expect(result.details.remoteId).toContain('phase_15_conflict_dev_pull');
  });

  test('pull-over-pending conflict check uses unique ids and passes twice', async () => {
    const { pullRemoteChanges } = require('../sync');

    pullRemoteChanges.mockImplementation(async ({ groupId }) => {
      const document = Array.from(mockDocuments.values()).find(
        (item) => item.groupId === groupId,
      );

      if (document) {
        document.syncStatus = 'conflict';
        document.serverVersion = 99;
      }

      return {
        applied: [],
        conflicts: [
          {
            collection: 'recipes',
            localId: document?.id,
            reason: 'local_pending_or_conflict',
          },
        ],
        cursor: '99',
        ok: false,
        skipped: [],
      };
    });
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 201,
      text: async () =>
        JSON.stringify({
          membership: { role: 'member' },
          status: 'success',
          workspace: {
            groupId: 'phase_15_pull_group',
            workspaceId: 'phase_15_pull_group',
          },
        }),
    }));

    const first = await runPullOverPendingConflictDevCheck({
      baseUrl: 'http://sync.example.test',
      fetchImpl,
      groupId: 'phase_15_pull_group',
    });
    const second = await runPullOverPendingConflictDevCheck({
      baseUrl: 'http://sync.example.test',
      fetchImpl,
      groupId: 'phase_15_pull_group',
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(first.details.runId).not.toBe(second.details.runId);
    expect(first.details.groupId).not.toBe(second.details.groupId);
    expect(first.details.localId).not.toBe(second.details.localId);
    expect(first.details.remoteId).not.toBe(second.details.remoteId);
  });

  test('pull-over-pending conflict check reports useful debug when conflict count is zero', async () => {
    const { pullRemoteChanges } = require('../sync');

    pullRemoteChanges.mockResolvedValueOnce({
      applied: [],
      conflicts: [],
      cursor: '99',
      ok: true,
      skipped: [],
    });

    const result = await runPullOverPendingConflictDevCheck({
      baseUrl: 'http://sync.example.test',
      fetchImpl: jest.fn(async () => ({
        ok: true,
        status: 201,
        text: async () =>
          JSON.stringify({
            membership: { role: 'member' },
            status: 'success',
            workspace: {
              groupId: 'phase_15_pull_group',
              workspaceId: 'phase_15_pull_group',
            },
          }),
      })),
      groupId: 'phase_15_pull_group',
    });

    expect(result).toEqual(
      expect.objectContaining({
        error: 'pull_over_pending_conflict_not_detected',
        failedStep: 'pull_over_pending_conflict_missing',
        ok: false,
      }),
    );
    expect(result.details).toEqual(
      expect.objectContaining({
        conflictCount: 0,
        cursorAfterPull: expect.any(String),
        cursorBeforePull: expect.any(String),
        groupId: expect.stringContaining('phase_15_pull_group'),
        localDocumentAfterPull: expect.any(Object),
        localDocumentBeforePull: expect.any(Object),
        localId: expect.any(String),
        outboxAfterPull: expect.any(Array),
        outboxBeforePull: expect.any(Array),
        remoteChangeUsed: expect.any(Object),
        remoteId: expect.any(String),
        runId: expect.any(String),
        syncStateAfterPull: expect.any(String),
        syncStateBeforePull: expect.any(String),
      }),
    );
  });

  test('prefer-remote latest conflict check skips missing remote document', async () => {
    mockDocuments.set('recipes:old_resolvable', {
      collection: 'recipes',
      data: { name: 'Old local' },
      groupId: 'group_1',
      id: 'old_resolvable',
      syncStatus: 'conflict',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mockDocuments.set('recipes:new_missing_remote', {
      collection: 'recipes',
      data: { name: 'New local' },
      groupId: 'group_1',
      id: 'new_missing_remote',
      syncStatus: 'conflict',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    mockOutboxEvents.push({
      collection: 'recipes',
      documentId: 'old_resolvable',
      id: 'outbox_old_resolvable',
      lastError: JSON.stringify({
        conflictDocument: {
          document: { groupId: 'group_1', name: 'Old remote' },
          remoteId: 'remote_old',
          serverVersion: 2,
        },
      }),
      status: 'conflict',
    });

    const result = await runResolveLatestConflictPreferRemoteDevCheck();

    expect(result.ok).toBe(true);
    expect(result.details.conflict.localDocument.id).toBe('old_resolvable');
    expect(result.details.after.syncStatus).toBe('synced');
    expect(result.details.skippedConflictIds).toEqual(['new_missing_remote']);
    expect(result.details.skippedReasons).toEqual([
      {
        localId: 'new_missing_remote',
        reason: 'missing_remote_document',
      },
    ]);
  });

  test('prefer-remote latest conflict check returns controlled failure with no resolvable conflict', async () => {
    mockDocuments.set('recipes:missing_remote', {
      collection: 'recipes',
      data: { name: 'Local' },
      groupId: 'group_1',
      id: 'missing_remote',
      syncStatus: 'conflict',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    const result = await runResolveLatestConflictPreferRemoteDevCheck();

    expect(result).toEqual(
      expect.objectContaining({
        error: 'no_prefer_remote_resolvable_conflict',
        failedStep: 'no_prefer_remote_resolvable_conflict',
        name: 'resolveLatestConflictPreferRemoteDev',
        ok: false,
      }),
    );
    expect(result.details).toEqual({
      preferRemoteResolvableCount: 0,
      skippedConflictIds: ['missing_remote'],
      skippedReasons: [
        {
          localId: 'missing_remote',
          reason: 'missing_remote_document',
        },
      ],
      totalConflictCount: 1,
    });
  });
});
