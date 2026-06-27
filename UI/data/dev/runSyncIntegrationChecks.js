const DEV_SYNC_PREFIX = 'phase_13_sync_dev';

const nowIso = () => new Date().toISOString();

const makeResult = ({
  details = {},
  error,
  name,
  ok,
  skipped = false,
}) => ({
  checkedAt: nowIso(),
  details,
  error,
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

const getDefaultClient = async (client) => {
  if (client) {
    return client;
  }

  const { createSyncClient } = await import('../sync/syncClient');

  return createSyncClient();
};

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
    const groupId = await getGroupId(options);

    if (!groupId) {
      return makeResult({
        error: 'groupId_required',
        name,
        ok: false,
      });
    }

    const client = await getDefaultClient(options.client);
    const response = await client.pullChanges({
      cursor: options.cursor || '0',
      groupId,
    });
    const changes = Array.isArray(response.changes) ? response.changes : [];

    return makeResult({
      details: {
        changeCount: changes.length,
        cursor: response.cursor || null,
        groupId,
      },
      name,
      ok: response.groupId === undefined || response.groupId === groupId,
    });
  } catch (error) {
    return makeResult({
      error: String(error?.message || error),
      name,
      ok: false,
    });
  }
};

export const runPushPullDevCheck = async (options = {}) => {
  const name = 'pushPullDev';

  try {
    const groupId = await getGroupId(options);

    if (!groupId) {
      return makeResult({
        error: 'groupId_required',
        name,
        ok: false,
      });
    }

    const client = await getDefaultClient(options.client);
    const localId = await createDevRecipeDocument({ groupId });
    const { pullRemoteChanges, pushPendingChanges } = await import('../sync');
    const push = await pushPendingChanges({
      client,
      groupId,
      limit: options.limit,
    });
    const pull = await pullRemoteChanges({
      client,
      groupId,
    });

    return makeResult({
      details: {
        localId,
        pull,
        push,
      },
      name,
      ok: push.ok && pull.ok,
    });
  } catch (error) {
    return makeResult({
      error: String(error?.message || error),
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
      : await getGroupId(options);
    const groupB = options.groupB || `${groupA}_${DEV_SYNC_PREFIX}_other`;

    if (!groupA || !groupB) {
      return makeResult({
        error: 'groupId_required',
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
    const changesA = Array.isArray(pullA.changes) ? pullA.changes : [];
    const hasGroupBLeak = changesA.some(
      (change) => change.document?.groupId && change.document.groupId !== groupA,
    );

    return makeResult({
      details: {
        groupA,
        groupB,
        localIdA,
        localIdB,
        pullAChangeCount: changesA.length,
        pushA,
        pushB,
      },
      name,
      ok: pushA.ok && pushB.ok && !hasGroupBLeak,
    });
  } catch (error) {
    return makeResult({
      error: String(error?.message || error),
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
