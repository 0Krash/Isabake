import { getSyncBaseUrl, validateSyncConfig } from '../sync/syncConfig';
import { createDevAuthSession, getAuthHeaders } from '../auth/authSession';
import { createSyncClient } from '../sync/syncClient';
import { createWorkspaceApiClient } from '../workspace/workspaceApiClient';

const DEV_SYNC_PREFIX = 'phase_13_sync_dev';
const DEV_AUTH_PREFIX = 'phase_14_auth_dev';

const nowIso = () => new Date().toISOString();

const makeResult = ({
  details = {},
  error,
  failedStep = null,
  debug = {},
  name,
  ok,
  skipped = false,
}) => ({
  checkedAt: nowIso(),
  debug,
  details,
  error,
  failedStep,
  name,
  ok: Boolean(ok),
  skipped,
});

const getGroupId = async (options, key = 'groupId') => {
  if (Object.prototype.hasOwnProperty.call(options, key)) {
    return options[key];
  }

  return require('../workspace/currentWorkspace').getCurrentGroupId();
};

const getDevGroupId = (options, key = 'groupId') => {
  if (Object.prototype.hasOwnProperty.call(options, key)) {
    return options[key];
  }

  return `${DEV_SYNC_PREFIX}_group`;
};

const getDefaultClient = async (client) => {
  if (client) {
    return client;
  }

  return require('../sync/syncClient').createSyncClient();
};

const createDevSession = (userId) =>
  createDevAuthSession({
    email: `${userId}@example.test`,
    userId,
  });

const createAuthedSyncClient = (options = {}, userId = `${DEV_AUTH_PREFIX}_a`) =>
  createSyncClient({
    ...options,
    authSession: options.authSession || createDevSession(userId),
    requireAuth: true,
  });

const createAuthedWorkspaceClient = (
  options = {},
  userId = `${DEV_AUTH_PREFIX}_a`,
) =>
  createWorkspaceApiClient({
    ...options,
    authSession: options.authSession || createDevSession(userId),
    requireAuth: true,
  });

const getDevAuthGroupId = (options = {}) =>
  options.groupId || `${DEV_AUTH_PREFIX}_group`;

const getDocumentById = async (collection, id) => {
  const { getDocument } = require('../db/documentStore');

  return getDocument(collection, id, { includeDeleted: true });
};

const getPendingOutboxForDocument = async (documentId) => {
  const { getPendingOutboxEvents } = require('../sync/syncOutbox');
  const events = await getPendingOutboxEvents();

  return events.filter((event) => event.documentId === documentId);
};

const getOutboxEventsByIds = async (eventIds) => {
  const { getOutboxEventById } = require('../sync/syncOutbox');
  const events = [];

  for (const eventId of eventIds) {
    events.push(await getOutboxEventById(eventId));
  }

  return events;
};

const getCursor = async (groupId) => {
  const { getLastSyncCursor } = require('../sync/syncStateRepository');

  return getLastSyncCursor(groupId);
};

const getRemoteLocalIds = (response) =>
  (Array.isArray(response?.changes) ? response.changes : []).map(
    (change) => change.document?.localId || change.localId || change.remoteId,
  );

const createDevRecipeDocument = async ({ groupId, nameSuffix = Date.now() }) => {
  const { saveDocument } = require('../db/documentStore');
  const { createLocalId } = require('../db/localIds');
  const id = createLocalId(`${DEV_SYNC_PREFIX}_recipe`);

  const document = await saveDocument(
    'recipes',
    id,
    {
      cost: 0,
      ingredients: [],
      localId: id,
      name: `${DEV_SYNC_PREFIX}_${nameSuffix}`,
      servings: 1,
      steps: [],
      type: DEV_SYNC_PREFIX,
    },
    {
      groupId,
    },
  );

  return {
    document,
    id,
  };
};

const getCreatedEvent = (outboxEvents) =>
  outboxEvents.find((event) => event.operation === 'create') || outboxEvents[0];

const buildPushFailureDebug = ({
  createdDocument,
  expectedCollection = 'recipes',
  expectedDocumentId,
  expectedEventId,
  groupId,
  localDocumentAfterPush = null,
  outboxAfterPushExpanded = [],
  outboxBeforePushExpanded = [],
  push = null,
  syncStateAfterPush = null,
}) => ({
  backendResponseRaw: push?.debug?.backendResponseRaw || null,
  createdDocument,
  expectedCollection,
  expectedDocumentId,
  expectedEventId,
  groupId,
  localDocumentAfterPush,
  outboxAfterPushExpanded,
  outboxBeforePushExpanded,
  pushAcceptedExpanded: push?.accepted || [],
  pushRejectedExpanded: push?.rejected || [],
  pushRequestPayload: push?.debug?.pushRequestPayload || null,
  pushSkippedExpanded: push?.skipped || [],
  syncStateAfterPush,
});

export const runBackendSyncConnectivityCheck = async (options = {}) => {
  const name = 'backendSyncConnectivity';

  try {
    const groupId = getDevGroupId(options);

    if (!groupId) {
      return makeResult({
        error: 'groupId_required',
        failedStep: 'group_id',
        name,
        ok: false,
      });
    }

    const config = validateSyncConfig(options);
    const baseUrl = getSyncBaseUrl(options);

    if (!config.ok) {
      return makeResult({
        details: {
          baseUrl,
          requestAttempted: false,
        },
        error: config.error,
        failedStep: 'sync_config',
        name,
        ok: false,
      });
    }

    const fetchImpl = options.fetchImpl || fetch;
    const query = new URLSearchParams({
      cursor: options.cursor || '0',
      groupId,
    }).toString();
    const url = `${baseUrl}/sync/pull?${query}`;
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(options.authSession),
      },
      method: 'GET',
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    const changes = Array.isArray(payload.changes) ? payload.changes : [];
    const responseShapeLooksValid =
      typeof payload === 'object' &&
      Array.isArray(payload.changes) &&
      Object.prototype.hasOwnProperty.call(payload, 'cursor');

    return makeResult({
      details: {
        baseUrl,
        changeCount: changes.length,
        cursor: payload.cursor || null,
        groupId,
        httpStatus: response.status,
        reachable: response.ok,
        requestAttempted: true,
        responseShapeLooksValid,
        url,
      },
      name,
      ok:
        response.ok &&
        responseShapeLooksValid &&
        (payload.groupId === undefined || payload.groupId === groupId),
    });
  } catch (error) {
    return makeResult({
      error: String(error?.message || error),
      failedStep: 'request',
      name,
      ok: false,
    });
  }
};

export const runAuthWorkspaceDevCheck = async (options = {}) => {
  const name = 'authWorkspaceDev';

  try {
    const groupId = getDevAuthGroupId(options);
    const ownerUserId = options.ownerUserId || `${DEV_AUTH_PREFIX}_owner`;
    const memberUserId = options.memberUserId || `${DEV_AUTH_PREFIX}_member`;
    const ownerClient = createAuthedWorkspaceClient(options, ownerUserId);
    const memberClient = createAuthedWorkspaceClient(options, memberUserId);

    const workspaceResponse = await ownerClient.createWorkspace({
      groupId,
      name: `${DEV_AUTH_PREFIX} workspace`,
    });
    const memberResponse = await ownerClient.addMember({
      groupId,
      role: 'member',
      status: 'active',
      userId: memberUserId,
    });
    const ownerList = await ownerClient.listWorkspaces();
    const memberList = await memberClient.listWorkspaces();
    const ownerHasWorkspace = (ownerList.workspaces || []).some(
      (workspace) => workspace.groupId === groupId,
    );
    const memberHasWorkspace = (memberList.workspaces || []).some(
      (workspace) => workspace.groupId === groupId,
    );

    return makeResult({
      details: {
        groupId,
        memberHasWorkspace,
        memberRole: memberResponse.membership?.role,
        memberUserId,
        ownerHasWorkspace,
        ownerUserId,
        workspace: workspaceResponse.workspace,
      },
      name,
      ok:
        Boolean(workspaceResponse.workspace?.groupId) &&
        memberResponse.membership?.role === 'member' &&
        ownerHasWorkspace &&
        memberHasWorkspace,
    });
  } catch (error) {
    return makeResult({
      error: String(error?.message || error),
      failedStep: 'unexpected_exception',
      name,
      ok: false,
    });
  }
};

export const runMembershipSyncAccessDevCheck = async (options = {}) => {
  const name = 'membershipSyncAccessDev';

  try {
    const groupId = getDevAuthGroupId(options);
    const ownerUserId = options.ownerUserId || `${DEV_AUTH_PREFIX}_owner`;
    const memberUserId = options.memberUserId || `${DEV_AUTH_PREFIX}_member`;
    const viewerUserId = options.viewerUserId || `${DEV_AUTH_PREFIX}_viewer`;
    const nonMemberUserId =
      options.nonMemberUserId || `${DEV_AUTH_PREFIX}_non_member`;
    const ownerWorkspaceClient = createAuthedWorkspaceClient(
      options,
      ownerUserId,
    );

    await ownerWorkspaceClient.createWorkspace({
      groupId,
      name: `${DEV_AUTH_PREFIX} workspace`,
    });
    await ownerWorkspaceClient.addMember({
      groupId,
      role: 'member',
      status: 'active',
      userId: memberUserId,
    });
    await ownerWorkspaceClient.addMember({
      groupId,
      role: 'viewer',
      status: 'active',
      userId: viewerUserId,
    });

    const ownerClient = createAuthedSyncClient(options, ownerUserId);
    const memberClient = createAuthedSyncClient(options, memberUserId);
    const viewerClient = createAuthedSyncClient(options, viewerUserId);
    const nonMemberClient = createAuthedSyncClient(options, nonMemberUserId);
    const { id: localId } = await createDevRecipeDocument({
      groupId,
      nameSuffix: `auth_${Date.now()}`,
    });
    const outboxBeforePush = await getPendingOutboxForDocument(localId);
    const expectedOutboxEvent = getCreatedEvent(outboxBeforePush);
    const { pushPendingChanges } = require('../sync');
    const ownerPush = await pushPendingChanges({
      client: ownerClient,
      eventIds: [expectedOutboxEvent.id],
      groupId,
      includeDebug: true,
      limit: options.limit,
    });
    const memberPull = await memberClient.pullChanges({
      cursor: '0',
      groupId,
    });
    const memberPush = await memberClient.pushChanges({
      deviceId: 'dev-member-device',
      events: [],
      groupId,
    });
    const viewerPull = await viewerClient.pullChanges({
      cursor: '0',
      groupId,
    });

    let viewerPushError = null;
    let nonMemberPullError = null;

    try {
      await viewerClient.pushChanges({
        deviceId: 'dev-viewer-device',
        events: [],
        groupId,
      });
    } catch (error) {
      viewerPushError = String(error?.message || error);
    }

    try {
      await nonMemberClient.pullChanges({
        cursor: '0',
        groupId,
      });
    } catch (error) {
      nonMemberPullError = String(error?.message || error);
    }

    const ownerAccepted = (ownerPush.accepted || []).some(
      (event) => event.eventId === expectedOutboxEvent.id,
    );

    return makeResult({
      details: {
        groupId,
        memberPullChangeCount: memberPull.changes?.length || 0,
        memberPushAcceptedCount: memberPush.accepted?.length || 0,
        nonMemberPullError,
        ownerAccepted,
        ownerPush,
        viewerPullChangeCount: viewerPull.changes?.length || 0,
        viewerPushError,
      },
      name,
      ok:
        ownerPush.ok &&
        ownerAccepted &&
        Array.isArray(memberPull.changes) &&
        Array.isArray(memberPush.accepted) &&
        Array.isArray(viewerPull.changes) &&
        viewerPushError === 'workspace_role_cannot_sync' &&
        nonMemberPullError === 'workspace_membership_required',
    });
  } catch (error) {
    return makeResult({
      error: String(error?.message || error),
      failedStep: 'unexpected_exception',
      name,
      ok: false,
    });
  }
};

export const runPushPullDevCheck = async (options = {}) => {
  const name = 'pushPullDev';

  try {
    const groupId = getDevGroupId(options);

    if (!groupId) {
      return makeResult({
        error: 'groupId_required',
        failedStep: 'group_id',
        name,
        ok: false,
      });
    }

    const client = await getDefaultClient(options.client);
    const { document: createdDocument, id: localId } = await createDevRecipeDocument({
      groupId,
    });
    const outboxBeforePush = await getPendingOutboxForDocument(localId);
    const expectedOutboxEvent = getCreatedEvent(outboxBeforePush);
    const expectedEventId = expectedOutboxEvent?.id || null;

    if (!createdDocument || !expectedOutboxEvent) {
      return makeResult({
        debug: buildPushFailureDebug({
          createdDocument,
          expectedDocumentId: localId,
          expectedEventId,
          groupId,
          outboxBeforePushExpanded: outboxBeforePush,
        }),
        error: 'dev_document_or_outbox_event_missing',
        failedStep: 'dev_document_created',
        name,
        ok: false,
      });
    }

    const { pullRemoteChanges, pushPendingChanges } = require('../sync');
    const push = await pushPendingChanges({
      client,
      eventIds: [expectedEventId],
      groupId,
      includeDebug: true,
      limit: options.limit,
    });
    const pushAcceptedForExpectedEvent = (push.accepted || []).find(
      (event) => event.eventId === expectedEventId,
    );
    const localDocumentAfterPush = await getDocumentById('recipes', localId);
    const outboxAfterPush = await getOutboxEventsByIds([expectedEventId]);
    const syncStateAfterPush = await getCursor(groupId);

    if (!pushAcceptedForExpectedEvent) {
      return makeResult({
        debug: buildPushFailureDebug({
          createdDocument,
          expectedDocumentId: localId,
          expectedEventId,
          groupId,
          localDocumentAfterPush,
          outboxAfterPushExpanded: outboxAfterPush,
          outboxBeforePushExpanded: outboxBeforePush,
          push,
          syncStateAfterPush,
        }),
        details: {
          expectedCollection: 'recipes',
          expectedDocumentId: localId,
          expectedEventId,
          localId,
          push,
        },
        error: 'push_did_not_accept_dev_event',
        failedStep: 'push_acceptance',
        name,
        ok: false,
      });
    }

    const documentAfterPush = localDocumentAfterPush;
    const acceptedEventIds = [expectedEventId];
    const acceptedOutboxEvents = await getOutboxEventsByIds(acceptedEventIds);
    const acceptedEventsSynced = acceptedOutboxEvents.every(
      (event) => event?.status === 'done',
    );

    if (
      !documentAfterPush?.remoteId ||
      !documentAfterPush?.serverVersion ||
      !acceptedEventsSynced
    ) {
      return makeResult({
        debug: buildPushFailureDebug({
          createdDocument,
          expectedDocumentId: localId,
          expectedEventId,
          groupId,
          localDocumentAfterPush: documentAfterPush,
          outboxAfterPushExpanded: acceptedOutboxEvents,
          outboxBeforePushExpanded: outboxBeforePush,
          push,
          syncStateAfterPush,
        }),
        details: {
          localId,
          push,
        },
        error: 'push_local_state_not_synced',
        failedStep: 'push_local_state',
        name,
        ok: false,
      });
    }

    const pendingBeforePull = await getPendingOutboxForDocument(localId);
    const pull = await pullRemoteChanges({
      client,
      groupId,
    });
    const pendingAfterPull = await getPendingOutboxForDocument(localId);
    const cursor = await getCursor(groupId);
    const pullDidNotCreateDuplicateOutbox =
      pendingAfterPull.length <= pendingBeforePull.length;

    return makeResult({
      debug: buildPushFailureDebug({
        createdDocument,
        expectedDocumentId: localId,
        expectedEventId,
        groupId,
        localDocumentAfterPush: documentAfterPush,
        outboxAfterPushExpanded: acceptedOutboxEvents,
        outboxBeforePushExpanded: outboxBeforePush,
        push,
        syncStateAfterPush,
      }),
      details: {
        acceptedEventIds,
        acceptedEventsSynced,
        cursor,
        expectedEventId,
        localId,
        pendingAfterPullCount: pendingAfterPull.length,
        pendingBeforePullCount: pendingBeforePull.length,
        pullDidNotCreateDuplicateOutbox,
        pull,
        push,
        remoteId: documentAfterPush.remoteId,
        serverVersion: documentAfterPush.serverVersion,
      },
      name,
      ok:
        push.ok &&
        pull.ok &&
        Boolean(cursor) &&
        pullDidNotCreateDuplicateOutbox,
    });
  } catch (error) {
    return makeResult({
      error: String(error?.message || error),
      failedStep: 'unexpected_exception',
      name,
      ok: false,
    });
  }
};

export const runTwoWorkspaceIsolationDevCheck = async (options = {}) => {
  const name = 'twoWorkspaceIsolationDev';

  try {
    const groupA = Object.prototype.hasOwnProperty.call(options, 'groupA')
      ? options.groupA
      : getDevGroupId(options);
    const groupB = options.groupB || `${groupA}_${DEV_SYNC_PREFIX}_other`;

    if (!groupA || !groupB) {
      return makeResult({
        error: 'groupId_required',
        failedStep: 'group_id',
        name,
        ok: false,
      });
    }

    const client = await getDefaultClient(options.client);
    const { id: localIdA } = await createDevRecipeDocument({
      groupId: groupA,
      nameSuffix: `group_a_${Date.now()}`,
    });
    const { id: localIdB } = await createDevRecipeDocument({
      groupId: groupB,
      nameSuffix: `group_b_${Date.now()}`,
    });
    const outboxA = await getPendingOutboxForDocument(localIdA);
    const outboxB = await getPendingOutboxForDocument(localIdB);
    const eventA = getCreatedEvent(outboxA);
    const eventB = getCreatedEvent(outboxB);

    if (!eventA || !eventB) {
      return makeResult({
        debug: {
          groupA,
          groupB,
          localIdA,
          localIdB,
          outboxA,
          outboxB,
        },
        error: 'workspace_isolation_outbox_event_missing',
        failedStep: 'workspace_isolation_outbox',
        name,
        ok: false,
      });
    }

    const { pullRemoteChanges, pushPendingChanges } = require('../sync');
    const pushA = await pushPendingChanges({
      client,
      eventIds: [eventA.id],
      groupId: groupA,
      includeDebug: true,
      limit: options.limit,
    });
    const pushB = await pushPendingChanges({
      client,
      eventIds: [eventB.id],
      groupId: groupB,
      includeDebug: true,
      limit: options.limit,
    });
    const acceptedA = (pushA.accepted || []).some(
      (event) => event.eventId === eventA.id,
    );
    const acceptedB = (pushB.accepted || []).some(
      (event) => event.eventId === eventB.id,
    );

    if (!acceptedA || !acceptedB) {
      return makeResult({
        debug: {
          eventA,
          eventB,
          groupA,
          groupB,
          localIdA,
          localIdB,
          pushA,
          pushB,
        },
        error: 'workspace_isolation_push_not_accepted',
        failedStep: 'workspace_isolation_push_acceptance',
        name,
        ok: false,
      });
    }

    const pullA = await client.pullChanges({
      cursor: '0',
      groupId: groupA,
    });
    const pullB = await client.pullChanges({
      cursor: '0',
      groupId: groupB,
    });
    const changesA = Array.isArray(pullA.changes) ? pullA.changes : [];
    const changesB = Array.isArray(pullB.changes) ? pullB.changes : [];
    const localIdsA = getRemoteLocalIds(pullA);
    const localIdsB = getRemoteLocalIds(pullB);
    const groupAOwnDataPulled = localIdsA.includes(localIdA);
    const groupBOwnDataPulled = localIdsB.includes(localIdB);

    if (!changesA.length || !changesB.length) {
      return makeResult({
        debug: {
          changesA,
          changesB,
          eventA,
          eventB,
          groupA,
          groupB,
          localIdA,
          localIdB,
          pullA,
          pullB,
          pushA,
          pushB,
        },
        error: 'workspace_isolation_no_changes_pulled',
        failedStep: 'workspace_isolation_no_changes_pulled',
        name,
        ok: false,
      });
    }

    const hasGroupBLeak = changesA.some(
      (change) => change.document?.groupId && change.document.groupId !== groupA,
    );
    const hasGroupALeak = changesB.some(
      (change) => change.document?.groupId && change.document.groupId !== groupB,
    );
    const mismatchedClientResult = await pullRemoteChanges({
      client: {
        pullChanges: async () => ({
          changes: [
            {
              collection: 'recipes',
              document: {
                groupId: groupB,
                localId: `${DEV_SYNC_PREFIX}_mismatched`,
              },
              remoteId: `${DEV_SYNC_PREFIX}_mismatched_remote`,
              serverVersion: 999,
            },
          ],
          cursor: '999',
          groupId: groupA,
        }),
      },
      groupId: groupA,
    });
    const clientIgnoredMismatchedGroup =
      mismatchedClientResult.skipped?.[0]?.reason === 'change_groupId_mismatch';

    return makeResult({
      details: {
        clientIgnoredMismatchedGroup,
        groupA,
        groupB,
        groupAOwnDataPulled,
        groupAReceivedGroupBLocalId: localIdsA.includes(localIdB),
        groupBOwnDataPulled,
        groupBReceivedGroupALocalId: localIdsB.includes(localIdA),
        localIdA,
        localIdB,
        pullAChangeCount: changesA.length,
        pullBChangeCount: changesB.length,
        pushA,
        pushB,
      },
      name,
      ok:
        pushA.ok &&
        pushB.ok &&
        !hasGroupBLeak &&
        !hasGroupALeak &&
        groupAOwnDataPulled &&
        groupBOwnDataPulled &&
        !localIdsA.includes(localIdB) &&
        !localIdsB.includes(localIdA) &&
        clientIgnoredMismatchedGroup,
    });
  } catch (error) {
    return makeResult({
      error: String(error?.message || error),
      failedStep: 'unexpected_exception',
      name,
      ok: false,
    });
  }
};

export default {
  runAuthWorkspaceDevCheck,
  runBackendSyncConnectivityCheck,
  runMembershipSyncAccessDevCheck,
  runPushPullDevCheck,
  runTwoWorkspaceIsolationDevCheck,
};
