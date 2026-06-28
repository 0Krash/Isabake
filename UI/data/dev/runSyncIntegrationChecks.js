import { getSyncBaseUrl, validateSyncConfig } from '../sync/syncConfig';
import { createDevAuthSession, getAuthHeaders } from '../auth/authSession';
import { createSyncClient } from '../sync/syncClient';
import { createWorkspaceApiClient } from '../workspace/workspaceApiClient';

const DEV_SYNC_PREFIX = 'phase_13_sync_dev';
const DEV_AUTH_PREFIX = 'phase_14_auth_dev';
const DEV_AUTH_SYNC_PREFIX = 'phase_14_auth_sync_dev';
const DEV_CONFLICT_PREFIX = 'phase_15_conflict_dev';

const nowIso = () => new Date().toISOString();

const createRunId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

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

const hasAuthOptions = (options = {}) =>
  Boolean(
    options.authHeaders ||
      options.authSession ||
      options.userId ||
      options.requireAuth,
  );

const getAuthSessionForOptions = (options = {}, fallbackUserId) =>
  options.authSession ||
  (options.userId || fallbackUserId
    ? createDevSession(options.userId || fallbackUserId)
    : null);

const getAuthDebug = (options = {}, fallbackUserId = null) => {
  const authSession = getAuthSessionForOptions(options, fallbackUserId);
  const headers = options.authHeaders || getAuthHeaders(authSession);

  return {
    authHeadersPresent: Boolean(headers.Authorization),
    userId: authSession?.userId || options.userId || fallbackUserId || null,
  };
};

const getDefaultClient = async (client, options = {}) => {
  if (client) {
    return client;
  }

  if (hasAuthOptions(options)) {
    return createSyncClient({
      ...options,
      authSession: getAuthSessionForOptions(options),
    });
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

const createDevRecipeDocument = async ({
  groupId,
  nameSuffix = Date.now(),
  prefix = DEV_SYNC_PREFIX,
}) => {
  const { saveDocument } = require('../db/documentStore');
  const { createLocalId } = require('../db/localIds');
  const id = createLocalId(`${prefix}_recipe`);

  const document = await saveDocument(
    'recipes',
    id,
    {
      cost: 0,
      ingredients: [],
      localId: id,
      name: `${prefix}_${nameSuffix}`,
      servings: 1,
      steps: [],
      type: prefix,
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

const updateDevRecipeDocument = async ({ groupId, id, nameSuffix }) => {
  const { saveDocument } = require('../db/documentStore');

  return saveDocument(
    'recipes',
    id,
    {
      cost: 0,
      ingredients: [],
      localId: id,
      name: `${DEV_CONFLICT_PREFIX}_${nameSuffix}`,
      servings: 1,
      steps: [],
      type: DEV_CONFLICT_PREFIX,
    },
    {
      groupId,
    },
  );
};

const getCreatedEvent = (outboxEvents) =>
  outboxEvents.find((event) => event.operation === 'create') || outboxEvents[0];

const buildPushFailureDebug = ({
  authHeadersPresent,
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
  userId,
}) => ({
  authHeadersPresent,
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
  userId,
});

const ensureDevWorkspaceMembership = async ({
  groupId,
  role = 'member',
  status = 'active',
  userId,
  workspaceOwnerUserId = `${DEV_AUTH_PREFIX}_owner`,
  ...options
} = {}) => {
  const ownerClient = createAuthedWorkspaceClient(options, workspaceOwnerUserId);

  await ownerClient.createWorkspace({
    groupId,
    name: `${DEV_AUTH_PREFIX} workspace`,
  });

  if (userId && userId !== workspaceOwnerUserId) {
    await ownerClient.addMember({
      groupId,
      role,
      status,
      userId,
    });
  }

  return {
    groupId,
    role: userId === workspaceOwnerUserId ? 'owner' : role,
    status: 'active',
    userId: userId || workspaceOwnerUserId,
  };
};

const isAuthRequiredPushFailure = (push) => push?.error === 'auth_required';

const makeAuthRequiredResult = ({
  authDebug,
  groupId,
  name,
  push = null,
  extraDebug = {},
}) =>
  makeResult({
    debug: {
      ...extraDebug,
      authHeadersPresent: authDebug.authHeadersPresent,
      groupId,
      push,
      userId: authDebug.userId,
    },
    error: 'auth_required',
    failedStep: 'auth_required_for_push_pull',
    name,
    ok: false,
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
    const invitedUserId = options.invitedUserId || `${DEV_AUTH_PREFIX}_invited`;
    const removedUserId = options.removedUserId || `${DEV_AUTH_PREFIX}_removed`;
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
    await ownerWorkspaceClient.addMember({
      groupId,
      role: 'member',
      status: 'invited',
      userId: invitedUserId,
    });
    await ownerWorkspaceClient.addMember({
      groupId,
      role: 'member',
      status: 'removed',
      userId: removedUserId,
    });

    const ownerClient = createAuthedSyncClient(options, ownerUserId);
    const memberClient = createAuthedSyncClient(options, memberUserId);
    const viewerClient = createAuthedSyncClient(options, viewerUserId);
    const invitedClient = createAuthedSyncClient(options, invitedUserId);
    const removedClient = createAuthedSyncClient(options, removedUserId);
    const nonMemberClient = createAuthedSyncClient(options, nonMemberUserId);
    const { id: localId } = await createDevRecipeDocument({
      groupId,
      nameSuffix: `auth_${Date.now()}`,
      prefix: DEV_AUTH_SYNC_PREFIX,
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
    const { id: memberLocalId } = await createDevRecipeDocument({
      groupId,
      nameSuffix: `member_${Date.now()}`,
      prefix: DEV_AUTH_SYNC_PREFIX,
    });
    const memberOutbox = await getPendingOutboxForDocument(memberLocalId);
    const memberExpectedEvent = getCreatedEvent(memberOutbox);
    const memberPush = await pushPendingChanges({
      client: memberClient,
      eventIds: [memberExpectedEvent.id],
      groupId,
      includeDebug: true,
      limit: options.limit,
    });
    const memberPull = await memberClient.pullChanges({
      cursor: '0',
      groupId,
    });
    const viewerPull = await viewerClient.pullChanges({
      cursor: '0',
      groupId,
    });

    let viewerPushError = null;
    let nonMemberPullError = null;
    let nonMemberPushError = null;
    let invitedPullError = null;
    let invitedPushError = null;
    let removedPullError = null;
    let removedPushError = null;

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

    try {
      await nonMemberClient.pushChanges({
        deviceId: 'dev-non-member-device',
        events: [],
        groupId,
      });
    } catch (error) {
      nonMemberPushError = String(error?.message || error);
    }

    try {
      await invitedClient.pullChanges({
        cursor: '0',
        groupId,
      });
    } catch (error) {
      invitedPullError = String(error?.message || error);
    }

    try {
      await invitedClient.pushChanges({
        deviceId: 'dev-invited-device',
        events: [],
        groupId,
      });
    } catch (error) {
      invitedPushError = String(error?.message || error);
    }

    try {
      await removedClient.pullChanges({
        cursor: '0',
        groupId,
      });
    } catch (error) {
      removedPullError = String(error?.message || error);
    }

    try {
      await removedClient.pushChanges({
        deviceId: 'dev-removed-device',
        events: [],
        groupId,
      });
    } catch (error) {
      removedPushError = String(error?.message || error);
    }

    const ownerAccepted = (ownerPush.accepted || []).some(
      (event) => event.eventId === expectedOutboxEvent.id,
    );
    const memberAccepted = (memberPush.accepted || []).some(
      (event) => event.eventId === memberExpectedEvent.id,
    );
    const memberPullChangeCount = memberPull.changes?.length || 0;
    const memberPushAcceptedCount = memberPush.accepted?.length || 0;
    const viewerPullChangeCount = viewerPull.changes?.length || 0;
    const checks = {
      invitedPullRejected: invitedPullError === 'workspace_membership_required',
      invitedPushRejected: invitedPushError === 'workspace_membership_required',
      memberPullHasChanges: memberPullChangeCount > 0,
      memberPushAccepted: memberPushAcceptedCount > 0 && memberAccepted,
      nonMemberPullRejected:
        nonMemberPullError === 'workspace_membership_required',
      nonMemberPushRejected:
        nonMemberPushError === 'workspace_membership_required',
      ownerPushAccepted: ownerPush.accepted?.length > 0 && ownerAccepted,
      removedPullRejected: removedPullError === 'workspace_membership_required',
      removedPushRejected: removedPushError === 'workspace_membership_required',
      viewerPullHasChanges: viewerPullChangeCount > 0,
      viewerPushRejected: viewerPushError === 'workspace_role_cannot_sync',
    };

    return makeResult({
      details: {
        checks,
        groupId,
        invitedPullError,
        invitedPushError,
        memberPullChangeCount,
        memberPush,
        memberPushAccepted: memberAccepted,
        memberPushAcceptedCount,
        nonMemberPushError,
        nonMemberPullError,
        ownerAccepted,
        ownerPush,
        removedPullError,
        removedPushError,
        viewerPullChangeCount,
        viewerPushError,
      },
      name,
      ok: Object.values(checks).every(Boolean),
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
    const authDebug = getAuthDebug(options);

    if (!groupId) {
      return makeResult({
        error: 'groupId_required',
        failedStep: 'group_id',
        name,
        ok: false,
      });
    }

    if (options.requireAuth && !authDebug.authHeadersPresent) {
      return makeAuthRequiredResult({
        authDebug,
        groupId,
        name,
      });
    }

    const client = await getDefaultClient(options.client, options);
    const { document: createdDocument, id: localId } = await createDevRecipeDocument({
      groupId,
      prefix: options.prefix || DEV_SYNC_PREFIX,
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

    if (isAuthRequiredPushFailure(push)) {
      return makeAuthRequiredResult({
        authDebug,
        extraDebug: buildPushFailureDebug({
          authHeadersPresent: authDebug.authHeadersPresent,
          createdDocument,
          expectedDocumentId: localId,
          expectedEventId,
          groupId,
          localDocumentAfterPush,
          outboxAfterPushExpanded: outboxAfterPush,
          outboxBeforePushExpanded: outboxBeforePush,
          push,
          syncStateAfterPush,
          userId: authDebug.userId,
        }),
        groupId,
        name,
        push,
      });
    }

    if (!pushAcceptedForExpectedEvent) {
      return makeResult({
        debug: buildPushFailureDebug({
          authHeadersPresent: authDebug.authHeadersPresent,
          createdDocument,
          expectedDocumentId: localId,
          expectedEventId,
          groupId,
          localDocumentAfterPush,
          outboxAfterPushExpanded: outboxAfterPush,
          outboxBeforePushExpanded: outboxBeforePush,
          push,
          syncStateAfterPush,
          userId: authDebug.userId,
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
          authHeadersPresent: authDebug.authHeadersPresent,
          createdDocument,
          expectedDocumentId: localId,
          expectedEventId,
          groupId,
          localDocumentAfterPush: documentAfterPush,
          outboxAfterPushExpanded: acceptedOutboxEvents,
          outboxBeforePushExpanded: outboxBeforePush,
          push,
          syncStateAfterPush,
          userId: authDebug.userId,
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
        authHeadersPresent: authDebug.authHeadersPresent,
        createdDocument,
        expectedDocumentId: localId,
        expectedEventId,
        groupId,
        localDocumentAfterPush: documentAfterPush,
        outboxAfterPushExpanded: acceptedOutboxEvents,
        outboxBeforePushExpanded: outboxBeforePush,
        push,
        syncStateAfterPush,
        userId: authDebug.userId,
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

export const runAuthenticatedPushPullDevCheck = async (options = {}) => {
  const groupId = getDevAuthGroupId(options);
  const userId = options.userId || `${DEV_AUTH_SYNC_PREFIX}_member`;
  const role = options.role || 'member';

  await ensureDevWorkspaceMembership({
    ...options,
    groupId,
    role,
    status: 'active',
    userId,
  });

  return runPushPullDevCheck({
    ...options,
    authSession: getAuthSessionForOptions(options, userId),
    groupId,
    prefix: DEV_AUTH_SYNC_PREFIX,
    requireAuth: true,
    userId,
  });
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

    const authDebugA = getAuthDebug(options.groupAAuth || options);
    const authDebugB = getAuthDebug(options.groupBAuth || options);

    if (
      options.requireAuth &&
      (!authDebugA.authHeadersPresent || !authDebugB.authHeadersPresent)
    ) {
      return makeResult({
        debug: {
          groupA,
          groupAAuthHeadersPresent: authDebugA.authHeadersPresent,
          groupAUserId: authDebugA.userId,
          groupB,
          groupBAuthHeadersPresent: authDebugB.authHeadersPresent,
          groupBUserId: authDebugB.userId,
        },
        error: 'auth_required',
        failedStep: 'auth_required_for_workspace_isolation',
        name,
        ok: false,
      });
    }

    const clientA = await getDefaultClient(
      options.clientA || options.client,
      options.groupAAuth || options,
    );
    const clientB = await getDefaultClient(
      options.clientB || options.client,
      options.groupBAuth || options,
    );
    const { id: localIdA } = await createDevRecipeDocument({
      groupId: groupA,
      nameSuffix: `group_a_${Date.now()}`,
      prefix: options.prefix || DEV_SYNC_PREFIX,
    });
    const { id: localIdB } = await createDevRecipeDocument({
      groupId: groupB,
      nameSuffix: `group_b_${Date.now()}`,
      prefix: options.prefix || DEV_SYNC_PREFIX,
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
      client: clientA,
      eventIds: [eventA.id],
      groupId: groupA,
      includeDebug: true,
      limit: options.limit,
    });
    const pushB = await pushPendingChanges({
      client: clientB,
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

    if (isAuthRequiredPushFailure(pushA) || isAuthRequiredPushFailure(pushB)) {
      return makeResult({
        debug: {
          eventA,
          eventB,
          groupA,
          groupAAuthHeadersPresent: authDebugA.authHeadersPresent,
          groupAUserId: authDebugA.userId,
          groupB,
          groupBAuthHeadersPresent: authDebugB.authHeadersPresent,
          groupBUserId: authDebugB.userId,
          localIdA,
          localIdB,
          pushA,
          pushB,
        },
        error: 'auth_required',
        failedStep: 'auth_required_for_workspace_isolation',
        name,
        ok: false,
      });
    }

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

    const pullA = await clientA.pullChanges({
      cursor: '0',
      groupId: groupA,
    });
    const pullB = await clientB.pullChanges({
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

export const runAuthenticatedWorkspaceIsolationDevCheck = async (options = {}) => {
  const ownerUserId = options.ownerUserId || `${DEV_AUTH_SYNC_PREFIX}_owner`;
  const groupA = options.groupA || `${DEV_AUTH_SYNC_PREFIX}_group_a`;
  const groupB = options.groupB || `${DEV_AUTH_SYNC_PREFIX}_group_b`;
  const authSession = getAuthSessionForOptions(options, ownerUserId);

  await ensureDevWorkspaceMembership({
    ...options,
    groupId: groupA,
    role: 'owner',
    userId: ownerUserId,
    workspaceOwnerUserId: ownerUserId,
  });
  await ensureDevWorkspaceMembership({
    ...options,
    groupId: groupB,
    role: 'owner',
    userId: ownerUserId,
    workspaceOwnerUserId: ownerUserId,
  });

  return runTwoWorkspaceIsolationDevCheck({
    ...options,
    groupA,
    groupAAuth: {
      ...options,
      authSession,
      userId: ownerUserId,
    },
    groupB,
    groupBAuth: {
      ...options,
      authSession,
      userId: ownerUserId,
    },
    prefix: DEV_AUTH_SYNC_PREFIX,
    requireAuth: true,
  });
};

export const runConflictSimulationDevCheck = async (options = {}) => {
  const name = 'conflictSimulationDev';

  try {
    const groupId = options.groupId || `${DEV_CONFLICT_PREFIX}_group`;
    const userId = options.userId || `${DEV_CONFLICT_PREFIX}_member`;

    await ensureDevWorkspaceMembership({
      ...options,
      groupId,
      role: 'member',
      status: 'active',
      userId,
    });

    const client = createAuthedSyncClient(options, userId);
    const { pullRemoteChanges, pushPendingChanges } = require('../sync');
    const { runSyncReadinessCheck } = require('../validation/syncReadinessCheck');
    const { document: createdDocument, id: localId } =
      await createDevRecipeDocument({
        groupId,
        nameSuffix: `base_${Date.now()}`,
        prefix: DEV_CONFLICT_PREFIX,
      });
    const createdOutbox = await getPendingOutboxForDocument(localId);
    const createEvent = getCreatedEvent(createdOutbox);
    const createPush = await pushPendingChanges({
      client,
      eventIds: [createEvent.id],
      groupId,
      includeDebug: true,
      limit: options.limit,
    });
    const createAccepted = (createPush.accepted || []).find(
      (event) => event.eventId === createEvent.id,
    );

    if (!createAccepted) {
      return makeResult({
        details: {
          createPush,
          localId,
        },
        error: 'conflict_simulation_initial_push_failed',
        failedStep: 'initial_push',
        name,
        ok: false,
      });
    }

    await client.pushChanges({
      deviceId: 'dev-conflict-remote-device',
      events: [
        {
          baseServerVersion: createAccepted.serverVersion,
          collection: 'recipes',
          createdAt: nowIso(),
          document: {
            cost: 0,
            groupId,
            ingredients: [],
            localId,
            name: `${DEV_CONFLICT_PREFIX}_remote_update`,
            remoteId: createAccepted.remoteId,
            servings: 1,
            steps: [],
            type: DEV_CONFLICT_PREFIX,
          },
          documentId: localId,
          eventId: `${DEV_CONFLICT_PREFIX}_remote_${Date.now()}`,
          localVersion: 1,
          operation: 'update',
        },
      ],
      groupId,
    });

    await updateDevRecipeDocument({
      groupId,
      id: localId,
      nameSuffix: `local_stale_${Date.now()}`,
    });
    const updateOutbox = await getPendingOutboxForDocument(localId);
    const staleEvent =
      updateOutbox.find(
        (event) => event.id !== createEvent.id && event.operation === 'update',
      ) ||
      getCreatedEvent(updateOutbox);
    const stalePush = await pushPendingChanges({
      client,
      eventIds: [staleEvent.id],
      groupId,
      includeDebug: true,
      limit: options.limit,
    });
    const localDocumentAfterConflict = await getDocumentById('recipes', localId);
    const outboxAfterConflict = await getOutboxEventsByIds([staleEvent.id]);
    const readiness = await runSyncReadinessCheck();
    const conflictRejected = (stalePush.rejected || []).some(
      (event) => event.eventId === staleEvent.id && event.reason === 'conflict',
    );
    const outboxIsConflict = outboxAfterConflict.some(
      (event) => event?.status === 'conflict',
    );
    const documentIsConflict =
      localDocumentAfterConflict?.syncStatus === 'conflict';

    return makeResult({
      details: {
        conflictRejected,
        createAccepted,
        createPush,
        documentIsConflict,
        groupId,
        localDocumentAfterConflict,
        localId,
        outboxAfterConflict,
        outboxIsConflict,
        readinessConflictDocumentCount: readiness.conflictDocumentCount,
        readinessConflictOutboxCount: readiness.conflictOutboxCount,
        staleEventId: staleEvent.id,
        stalePush,
      },
      name,
      ok:
        conflictRejected &&
        documentIsConflict &&
        outboxIsConflict &&
        readiness.conflictDocumentCount > 0,
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

export const runPullOverPendingConflictDevCheck = async (options = {}) => {
  const name = 'pullOverPendingConflictDev';

  try {
    const runId = options.runId || createRunId(`${DEV_CONFLICT_PREFIX}_pull`);
    const baseGroupId = options.groupId || `${DEV_CONFLICT_PREFIX}_pull_group`;
    const groupId = options.isolate === false ? baseGroupId : `${baseGroupId}_${runId}`;
    const localId = options.localId || `${runId}_local`;
    const remoteId = options.remoteId || `${runId}_remote`;
    const remoteChangeUsed = {
      collection: 'recipes',
      document: {
        groupId,
        localId,
        name: `${DEV_CONFLICT_PREFIX}_remote_pull_${runId}`,
      },
      remoteId,
      serverVersion: options.serverVersion || 99,
      updatedAt: nowIso(),
    };
    const { pullRemoteChanges } = require('../sync');
    const syncStateBeforePull = await getCursor(groupId);

    await ensureDevWorkspaceMembership({
      ...options,
      groupId,
      role: 'member',
      status: 'active',
      userId: options.userId || `${DEV_CONFLICT_PREFIX}_pull_member`,
    });

    await updateDevRecipeDocument({
      groupId,
      id: localId,
      nameSuffix: `pending_${runId}`,
    });
    const localDocumentBeforePull = await getDocumentById('recipes', localId);
    const outboxBeforePull = await getPendingOutboxForDocument(localId);
    const cursorBeforePull = await getCursor(groupId);

    const pull = await pullRemoteChanges({
      client: {
        pullChanges: async () => ({
          changes: [remoteChangeUsed],
          cursor: String(remoteChangeUsed.serverVersion),
          groupId,
        }),
      },
      groupId,
    });
    const localDocumentAfterPull = await getDocumentById('recipes', localId);
    const outboxAfterPull = await getPendingOutboxForDocument(localId);
    const cursorAfterPull = await getCursor(groupId);
    const syncStateAfterPull = cursorAfterPull;
    const conflictCount = pull.conflicts?.length || 0;
    const noDuplicateOutbox = outboxAfterPull.length <= outboxBeforePull.length;
    const conflictDetected = (pull.conflicts || []).some(
      (conflict) =>
        conflict.localId === localId &&
        conflict.reason === 'local_pending_or_conflict',
    );
    const details = {
      conflictCount,
      cursorAfterPull,
      cursorBeforePull,
      groupId,
      localDocumentAfterPull,
      localDocumentBeforePull,
      localId,
      noDuplicateOutbox,
      outboxAfterPull,
      outboxBeforePull,
      pull,
      remoteChangeUsed,
      remoteId,
      runId,
      syncStateAfterPull,
      syncStateBeforePull,
    };
    const ok =
      pull.ok === false &&
      conflictDetected &&
      localDocumentAfterPull?.syncStatus === 'conflict' &&
      noDuplicateOutbox;

    if (!ok) {
      return makeResult({
        details,
        error:
          conflictCount === 0
            ? 'pull_over_pending_conflict_not_detected'
            : 'pull_over_pending_conflict_failed',
        failedStep:
          conflictCount === 0
            ? 'pull_over_pending_conflict_missing'
            : 'pull_over_pending_conflict_validation',
        name,
        ok: false,
      });
    }

    return makeResult({
      details,
      name,
      ok: true,
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
  runAuthenticatedPushPullDevCheck,
  runAuthenticatedWorkspaceIsolationDevCheck,
  runBackendSyncConnectivityCheck,
  runConflictSimulationDevCheck,
  runMembershipSyncAccessDevCheck,
  runPullOverPendingConflictDevCheck,
  runPushPullDevCheck,
  runTwoWorkspaceIsolationDevCheck,
};
