import { initDatabase } from '../db/database';
import recipeRepository from '../repositories/recipeRepository';
import { assignUngroupedLocalDataToCurrentWorkspace } from '../workspace/currentWorkspace';
import { getCurrentWorkspace } from '../workspace/workspaceRepository';
import { runSyncReadinessCheck } from '../validation/syncReadinessCheck';
import defaultSyncClient from './syncClient';
import { AUTO_SYNC_REASONS } from './autoSyncConfig';
import { getAutoSyncDiagnostics, notifyAutoSyncNeeded } from './autoSyncService';
import {
  getSyncHistoryWorkspaceName,
  recordSkippedSyncRun,
  safelyRecordSyncHistory,
} from './syncHistoryService';

const POST_LOGIN_TRIGGER_SOURCE = 'post_login';
const BUSINESS_COLLECTIONS = ['recipes', 'inventory', 'transactions'];
const CHECK_PREFIX = 'dev_check_post_login_sync';

const nowIso = () => new Date().toISOString();

const getDefaultFreshAuthSession = async (...args) => {
  const { getFreshAuthSession } = await import('../auth/authService');

  return getFreshAuthSession(...args);
};

const makeResult = ({
  details = {},
  error = null,
  failedStep = null,
  ok,
  scheduled = false,
  skipped = false,
} = {}) => ({
  checkedAt: nowIso(),
  details,
  error,
  failedStep,
  ok: Boolean(ok),
  scheduled: Boolean(scheduled),
  skipped: Boolean(skipped),
});

const getPendingCount = (readiness = {}) =>
  Number(
    readiness.pendingOutboxCount ??
      Object.values(readiness.pendingOutboxByCollection || {}).reduce(
        (total, count) => total + Number(count || 0),
        0,
      ),
  );

const getConflictCount = (readiness = {}) =>
  Number(readiness.conflictDocumentCount || 0) +
  Number(readiness.conflictOutboxCount || 0);

const getUngroupedCount = (readiness = {}) =>
  Number(
    readiness.documentsMissingGroupIdCount ??
      readiness.blockedFromSyncBecauseGroupIdMissingCount ??
      0,
  );

const getBusinessPendingSummary = (readiness = {}) =>
  BUSINESS_COLLECTIONS.reduce((summary, collection) => {
    const count = Number(readiness.pendingOutboxByCollection?.[collection] || 0);

    if (count > 0) {
      summary[collection] = count;
    }

    return summary;
  }, {});

const recordPostLoginSkip = ({
  groupId = null,
  pendingBefore = null,
  reason,
  workspace = null,
} = {}) =>
  safelyRecordSyncHistory(() =>
    recordSkippedSyncRun({
      actionType: 'full_sync',
      authState: reason === 'no_auth' ? 'auth_required' : 'authenticated',
      groupId,
      pendingBefore,
      reason,
      triggerSource: POST_LOGIN_TRIGGER_SOURCE,
      workspaceName: getSyncHistoryWorkspaceName(workspace),
    }),
  );

export const runPostLoginSyncBootstrap = async ({
  assignUngrouped = assignUngroupedLocalDataToCurrentWorkspace,
  getSession = getDefaultFreshAuthSession,
  getWorkspace = getCurrentWorkspace,
  initializeDb = initDatabase,
  notifyAutoSync = notifyAutoSyncNeeded,
  reason = AUTO_SYNC_REASONS.LOGIN_SUCCESS,
  runReadiness = runSyncReadinessCheck,
} = {}) => {
  await initializeDb();

  let session = null;

  try {
    session = await getSession();
  } catch (error) {
    await recordPostLoginSkip({ reason: 'no_auth' });
    return makeResult({
      error: 'no_auth',
      failedStep: 'auth',
      ok: false,
      skipped: true,
    });
  }

  if (!session) {
    await recordPostLoginSkip({ reason: 'no_auth' });
    return makeResult({
      error: 'no_auth',
      failedStep: 'auth',
      ok: false,
      skipped: true,
    });
  }

  const workspace = await getWorkspace().catch(() => null);

  if (!workspace?.isRemote) {
    await recordPostLoginSkip({
      reason: 'no_shared_workspace_after_login',
      workspace,
    });
    return makeResult({
      details: {
        workspaceMode: workspace?.isRemote ? 'shared' : 'local',
      },
      error: 'no_shared_workspace_after_login',
      failedStep: 'workspace',
      ok: false,
      skipped: true,
    });
  }

  if (!workspace.groupId) {
    await recordPostLoginSkip({
      reason: 'groupId_required',
      workspace,
    });
    return makeResult({
      details: {
        workspaceMode: 'shared',
      },
      error: 'groupId_required',
      failedStep: 'groupId',
      ok: false,
      skipped: true,
    });
  }

  let readiness = await runReadiness();
  let ungroupedAssignment = null;

  if (getUngroupedCount(readiness) > 0) {
    ungroupedAssignment = await assignUngrouped({
      dryRun: false,
    }).catch((error) => ({
      error: String(error?.message || error || 'ungrouped_assignment_failed'),
    }));

    readiness = await runReadiness();
  }

  const conflictCount = getConflictCount(readiness);
  const pendingOutboxCount = getPendingCount(readiness);

  if (conflictCount > 0) {
    await recordPostLoginSkip({
      groupId: workspace.groupId,
      pendingBefore: pendingOutboxCount,
      reason: 'conflicts_pending',
      workspace,
    });
    return makeResult({
      details: {
        conflictCount,
        pendingOutboxCount,
      },
      error: 'conflicts_pending',
      failedStep: 'conflicts',
      ok: false,
      skipped: true,
    });
  }

  const schedule = notifyAutoSync(reason);

  if (!schedule?.scheduled && !schedule?.pending) {
    await recordPostLoginSkip({
      groupId: workspace.groupId,
      pendingBefore: pendingOutboxCount,
      reason: schedule?.reason || 'auto_sync_not_scheduled',
      workspace,
    });
    return makeResult({
      details: {
        pendingOutboxCount,
        scheduleReason: schedule?.reason || null,
      },
      error: schedule?.reason || 'auto_sync_not_scheduled',
      failedStep: 'schedule',
      ok: false,
      skipped: true,
    });
  }

  return makeResult({
    details: {
      businessPendingOutboxByCollection: getBusinessPendingSummary(readiness),
      pendingOutboxCount,
      ungroupedAssignment,
    },
    ok: true,
    scheduled: Boolean(schedule.scheduled || schedule.pending),
  });
};

const defaultWaitForBootstrap = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 1750);
  });

export const runPostLoginSyncBootstrapCheck = async ({
  client = defaultSyncClient,
  createId = (prefix) => `${prefix}_${Date.now()}`,
  getDiagnostics = getAutoSyncDiagnostics,
  getSession = getDefaultFreshAuthSession,
  getWorkspace = getCurrentWorkspace,
  recipeRepo = recipeRepository,
  runBootstrap = runPostLoginSyncBootstrap,
  waitForBootstrap = defaultWaitForBootstrap,
} = {}) => {
  const session = await getSession().catch(() => null);

  if (!session) {
    return makeResult({
      error: 'no_auth',
      failedStep: 'auth',
      ok: false,
      skipped: true,
    });
  }

  const workspace = await getWorkspace().catch(() => null);

  if (!workspace?.isRemote) {
    return makeResult({
      error: 'no_shared_workspace',
      failedStep: 'workspace',
      ok: false,
      skipped: true,
    });
  }

  if (!workspace.groupId) {
    return makeResult({
      error: 'no_groupId',
      failedStep: 'groupId',
      ok: false,
      skipped: true,
    });
  }

  const localId = createId(CHECK_PREFIX);

  await recipeRepo.create(
    {
      cost: 0,
      ingredients: [],
      name: `${CHECK_PREFIX}_${Date.now()}`,
      recipeId: localId,
      servings: 1,
      steps: [],
      type: 'Dev check',
    },
    {
      groupId: workspace.groupId,
      id: localId,
    },
  );

  const result = await runBootstrap({
    getSession,
    getWorkspace,
    reason: AUTO_SYNC_REASONS.LOGIN_SUCCESS,
  });

  if (!result.ok) {
    return {
      ...result,
      error:
        result.error === 'auth_required'
          ? 'no_auth'
          : result.error === 'groupId_required'
            ? 'no_groupId'
            : result.error,
    };
  }

  if (!result.details?.pendingOutboxCount) {
    return makeResult({
      error: 'no_pending_outbox',
      failedStep: 'pending_outbox',
      ok: false,
      skipped: true,
    });
  }

  await waitForBootstrap();

  const diagnostics = await getDiagnostics().catch(() => null);

  if (diagnostics?.autoSyncEnabled === false) {
    return makeResult({
      error: 'auto_sync_disabled',
      failedStep: 'auto_sync_enabled',
      ok: false,
      skipped: true,
    });
  }

  if (diagnostics?.hasConflicts || diagnostics?.lastSkippedReason === 'conflicts_pending') {
    return makeResult({
      error: 'conflicts_pending',
      failedStep: 'conflicts',
      ok: false,
      skipped: true,
    });
  }

  if (diagnostics?.networkState === 'backend_unreachable') {
    return makeResult({
      error: 'backend_unreachable',
      failedStep: 'network',
      ok: false,
      skipped: true,
    });
  }

  if (diagnostics?.lastErrorCode === 'sync_timeout') {
    return makeResult({
      error: 'sync_timeout',
      failedStep: 'sync',
      ok: false,
    });
  }

  const backendVerification = client?.verifyRemoteDocuments
    ? await client.verifyRemoteDocuments({
        documents: [],
        groupId: workspace.groupId,
      }).catch(() => null)
    : null;

  return makeResult({
    details: {
      backendVerified: backendVerification
        ? (backendVerification.results || []).every(
            (item) => item.status === 'ok',
          )
        : null,
      lastRunFinishedAt: diagnostics?.lastRunFinishedAt || null,
      lastRunStartedAt: diagnostics?.lastRunStartedAt || null,
      lastSyncHistoryStatus: diagnostics?.lastSyncHistoryStatus || null,
      pendingOutboxCount: result.details.pendingOutboxCount,
    },
    ok: Boolean(
      result.scheduled &&
        (diagnostics?.lastRunStartedAt ||
          diagnostics?.lastSyncHistoryStatus === 'success' ||
          diagnostics?.scheduled),
    ),
    scheduled: result.scheduled,
  });
};

export default {
  runPostLoginSyncBootstrap,
  runPostLoginSyncBootstrapCheck,
};
