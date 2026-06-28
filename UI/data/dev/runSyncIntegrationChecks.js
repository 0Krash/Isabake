import { getSyncBaseUrl, validateSyncConfig } from '../sync/syncConfig';

const DEV_SYNC_PREFIX = 'phase_13_sync_dev';

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

  const { getCurrentGroupId } = await import('../workspace/currentWorkspace');

  return getCurrentGroupId();
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

  const { createSyncClient } = await import('../sync/syncClient');

  return createSyncClient();
};

const getDocumentById = async (collection, id) => {
  const { getDocument } = await import('../db/documentStore');

  return getDocument(collection, id, { includeDeleted: true });
};

const getPendingOutboxForDocument = async (documentId) => {
  const { getPendingOutboxEvents } = await import('../sync/syncOutbox');
  const events = await getPendingOutboxEvents();

  return events.filter((event) => event.documentId === documentId);
};

const getOutboxEventsByIds = async (eventIds) => {
  const { getOutboxEventById } = await import('../sync/syncOutbox');
  const events = [];

  for (const eventId of eventIds) {
    events.push(await getOutboxEventById(eventId));
  }

  return events;
};

const getCursor = async (groupId) => {
  const { getLastSyncCursor } = await import('../sync/syncStateRepository');

  return getLastSyncCursor(groupId);
};

const getRemoteLocalIds = (response) =>
  (Array.isArray(response?.changes) ? response.changes : []).map(
    (change) => change.document?.localId || change.localId || change.remoteId,
  );

const createDevRecipeDocument = async ({ groupId, nameSuffix = Date.now() }) => {
  const { saveDocument } = await import('../db/documentStore');
  const { createLocalId } = await import('../db/localIds');
  const id = createLocalId(`${DEV_SYNC_PREFIX}_recipe`);

  await saveDocument(
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

  return id;
};

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
    const localId = await createDevRecipeDocument({ groupId });
    const outboxBeforePush = await getPendingOutboxForDocument(localId);
    const { pullRemoteChanges, pushPendingChanges } = await import('../sync');
    const push = await pushPendingChanges({
      client,
      groupId,
      limit: options.limit,
    });

    if (!push.accepted?.length) {
      return makeResult({
        details: {
          localId,
          outboxBeforePush,
          push,
        },
        error: 'push_did_not_accept_dev_event',
        failedStep: 'push_acceptance',
        name,
        ok: false,
      });
    }

    const documentAfterPush = await getDocumentById('recipes', localId);
    const acceptedEventIds = push.accepted.map((event) => event.eventId);
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
        debug: {
          acceptedOutboxEvents,
          documentAfterPush,
        },
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

    return makeResult({
      details: {
        acceptedEventIds,
        acceptedEventsSynced,
        cursor,
        localId,
        pendingAfterPullCount: pendingAfterPull.length,
        pendingBeforePullCount: pendingBeforePull.length,
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
        pendingAfterPull.length <= pendingBeforePull.length,
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
    const localIdA = await createDevRecipeDocument({
      groupId: groupA,
      nameSuffix: `group_a_${Date.now()}`,
    });
    const localIdB = await createDevRecipeDocument({
      groupId: groupB,
      nameSuffix: `group_b_${Date.now()}`,
    });
    const { pushPendingChanges } = await import('../sync');
    const pushA = await pushPendingChanges({
      client,
      groupId: groupA,
      limit: options.limit,
    });
    const pushB = await pushPendingChanges({
      client,
      groupId: groupB,
      limit: options.limit,
    });
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
    const hasGroupBLeak = changesA.some(
      (change) => change.document?.groupId && change.document.groupId !== groupA,
    );
    const hasGroupALeak = changesB.some(
      (change) => change.document?.groupId && change.document.groupId !== groupB,
    );
    const { pullRemoteChanges } = await import('../sync');
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
        groupAReceivedGroupBLocalId: localIdsA.includes(localIdB),
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
  runBackendSyncConnectivityCheck,
  runPushPullDevCheck,
  runTwoWorkspaceIsolationDevCheck,
};
