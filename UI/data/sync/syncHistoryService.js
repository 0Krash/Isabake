import { createLocalId } from '../db/localIds';
import {
  clearOldSyncHistory,
  getLatestSyncHistory,
  getRecentSyncHistory,
  getSyncHistoryCount,
  insertSyncHistoryRecord,
  recoverStartedSyncHistoryOlderThan,
  updateSyncHistoryRecord,
} from './syncHistoryRepository';

const DEFAULT_KEEP_LATEST = 100;
export const DEFAULT_STALE_SYNC_HISTORY_MS = 2 * 60 * 1000;
const SAFE_ERROR_CODES = new Set([
  'auth_required',
  'auto_sync_disabled',
  'backend_unreachable',
  'conflict_detected',
  'conflicts_pending',
  'groupId_required',
  'local_only',
  'local_only_mode',
  'membership_required',
  'no_auth',
  'no_pending_outbox',
  'no_shared_workspace',
  'no_shared_workspace_after_login',
  'network_error',
  'network_offline',
  'request_aborted',
  'session_expired',
  'sync_timeout',
  'sync_url_invalid',
  'sync_url_missing',
  'unknown_sync_error',
  'workspace_membership_required',
  'workspace_required',
  'workspace_role_cannot_sync',
]);

const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/-]+=*/i,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /(access|refresh|invite)?token(hash)?/i,
  /authorization/i,
  /password(hash)?/i,
  /api[_-]?key/i,
  /cookie/i,
  /stack/i,
  /request\s*body/i,
  /response\s*body/i,
];

const nowIso = () => new Date().toISOString();
const safeNumber = (value) => Number(value || 0);

export const sanitizeSyncHistoryText = (value) => {
  const text = String(value || '').trim();

  if (!text) {
    return null;
  }

  if (SECRET_PATTERNS.some((pattern) => pattern.test(text))) {
    return 'unknown_sync_error';
  }

  return text.slice(0, 160);
};

export const sanitizeSyncHistoryError = (error) => {
  const rawMessage = String(error?.message || error || '').trim();

  if (!rawMessage) {
    return {
      errorCode: null,
      safeErrorMessage: null,
    };
  }

  const knownCode = [...SAFE_ERROR_CODES].find((code) =>
    rawMessage.includes(code),
  );

  if (knownCode) {
    return {
      errorCode: knownCode,
      safeErrorMessage: knownCode,
    };
  }

  if (/network|fetch|failed to fetch|Network request failed/i.test(rawMessage)) {
    return {
      errorCode: 'network_error',
      safeErrorMessage: 'network_error',
    };
  }

  if (/timeout|timed out|tard[oó] demasiado|sync_timeout/i.test(rawMessage)) {
    return {
      errorCode: 'sync_timeout',
      safeErrorMessage: 'La sincronizacion tardo demasiado.',
    };
  }

  if (/abort|request_aborted|AbortError/i.test(rawMessage)) {
    return {
      errorCode: 'request_aborted',
      safeErrorMessage: 'request_aborted',
    };
  }

  if (/Sync API URL|Auth API URL|backend|ECONNREFUSED|ENOTFOUND/i.test(rawMessage)) {
    return {
      errorCode: 'backend_unreachable',
      safeErrorMessage: 'backend_unreachable',
    };
  }

  const safeMessage = sanitizeSyncHistoryText(rawMessage);

  return {
    errorCode: SAFE_ERROR_CODES.has(safeMessage)
      ? safeMessage
      : 'unknown_sync_error',
    safeErrorMessage: SAFE_ERROR_CODES.has(safeMessage)
      ? safeMessage
      : 'unknown_sync_error',
  };
};

export const getSyncHistoryAuthState = (status = {}) => {
  if (status.authStatus) {
    return status.authStatus;
  }

  if (status.session?.sessionState === 'expired') {
    return 'session_expired';
  }

  return status.session ? 'authenticated' : 'auth_required';
};

export const getSyncHistoryWorkspaceName = (workspace = {}) => {
  const name = String(workspace?.name || '').trim();

  if (!name || /^(phase_|ws_|workspace_|group_|local_)/i.test(name)) {
    return workspace?.isRemote ? 'Proyecto compartido' : 'Solo local';
  }

  return name.slice(0, 80);
};

export const summarizeSyncHistoryResult = (actionType, result = {}) => {
  if (actionType === 'push') {
    return {
      acceptedCount: safeNumber(result.accepted?.length),
      conflictCount: safeNumber(
        result.rejected?.filter?.((item) => item.reason === 'conflict')?.length,
      ),
      rejectedCount: safeNumber(result.rejected?.length),
      skippedCount: safeNumber(result.skipped?.length),
      pushedCount: safeNumber(result.accepted?.length),
    };
  }

  if (actionType === 'pull') {
    return {
      conflictCount: safeNumber(result.conflicts?.length),
      pulledCount: safeNumber(result.applied?.length),
      skippedCount: safeNumber(result.skipped?.length),
    };
  }

  if (actionType === 'full_sync') {
    return {
      acceptedCount: safeNumber(result.push?.accepted?.length),
      conflictCount:
        safeNumber(
          result.push?.rejected?.filter?.((item) => item.reason === 'conflict')
            ?.length,
        ) + safeNumber(result.pull?.conflicts?.length),
      pulledCount: safeNumber(result.pull?.applied?.length),
      pushedCount: safeNumber(result.push?.accepted?.length),
      rejectedCount: safeNumber(result.push?.rejected?.length),
      skippedCount:
        safeNumber(result.push?.skipped?.length) +
        safeNumber(result.pull?.skipped?.length),
    };
  }

  return {};
};

const deriveFinalStatus = ({ error, result, status }) => {
  if (status) {
    return status;
  }

  if (error) {
    return 'failed';
  }

  if (result?.ok === false) {
    return 'partial';
  }

  if (result?.push || result?.pull) {
    return result.ok ? 'success' : 'partial';
  }

  return 'success';
};

export const startSyncHistoryRun = async ({
  actionType,
  authState = 'unknown',
  groupId = null,
  networkState = 'unknown',
  pendingBefore = null,
  triggerSource = 'manual',
  workspaceName = null,
} = {}) => {
  await recoverStaleSyncHistoryRuns().catch(() => null);

  const timestamp = nowIso();
  const runId = createLocalId('sync_run');
  const record = {
    actionType,
    authState,
    createdAt: timestamp,
    groupId,
    id: createLocalId('sync_history'),
    networkState,
    pendingBefore,
    runId,
    startedAt: timestamp,
    status: 'started',
    triggerSource,
    updatedAt: timestamp,
    workspaceName,
  };

  await insertSyncHistoryRecord(record);
  await clearOldSyncHistory({ keepLatest: DEFAULT_KEEP_LATEST });
  return record;
};

export const recoverStaleSyncHistoryRuns = async ({
  olderThanMs = DEFAULT_STALE_SYNC_HISTORY_MS,
  now = Date.now(),
} = {}) => {
  const finishedAt = new Date(now).toISOString();
  const olderThanIso = new Date(now - olderThanMs).toISOString();

  return recoverStartedSyncHistoryOlderThan({
    errorCode: 'sync_timeout',
    finishedAt,
    olderThanIso,
    safeErrorMessage: 'La sincronizacion tardo demasiado.',
  });
};

export const finishSyncHistoryRun = async ({
  authState = 'unknown',
  error = null,
  networkState = 'unknown',
  pendingAfter = null,
  result = null,
  run,
  runId,
  status = null,
} = {}) => {
  const startedAt = run?.startedAt || new Date().toISOString();
  const finishedAt = nowIso();
  const actionType = run?.actionType || 'full_sync';
  const sanitizedError = sanitizeSyncHistoryError(error || result?.error);
  const counts = summarizeSyncHistoryResult(actionType, result);

  await updateSyncHistoryRecord(run?.runId || runId, {
    ...counts,
    authState,
    durationMs: Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt)),
    errorCode: sanitizedError.errorCode,
    finishedAt,
    networkState,
    pendingAfter,
    safeErrorMessage: sanitizedError.safeErrorMessage,
    status: deriveFinalStatus({ error, result, status }),
  });

  await clearOldSyncHistory({ keepLatest: DEFAULT_KEEP_LATEST });
};

export const recordSkippedSyncRun = async ({
  actionType,
  authState = 'unknown',
  error = null,
  groupId = null,
  networkState = 'unknown',
  pendingBefore = null,
  reason = 'unknown_sync_error',
  triggerSource = 'manual',
  workspaceName = null,
} = {}) => {
  const timestamp = nowIso();
  const sanitizedError = sanitizeSyncHistoryError(error || reason);

  await insertSyncHistoryRecord({
    actionType,
    authState,
    createdAt: timestamp,
    errorCode: sanitizedError.errorCode || reason,
    finishedAt: timestamp,
    groupId,
    id: createLocalId('sync_history'),
    networkState,
    pendingBefore,
    runId: createLocalId('sync_run'),
    safeErrorMessage: sanitizedError.safeErrorMessage || reason,
    skippedCount: 1,
    startedAt: timestamp,
    status: 'skipped',
    triggerSource,
    updatedAt: timestamp,
    workspaceName,
  });
  await clearOldSyncHistory({ keepLatest: DEFAULT_KEEP_LATEST });
};

export const safelyRecordSyncHistory = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    return null;
  }
};

export {
  clearOldSyncHistory,
  getLatestSyncHistory,
  getRecentSyncHistory,
  getSyncHistoryCount,
};

export default {
  clearOldSyncHistory,
  finishSyncHistoryRun,
  getLatestSyncHistory,
  getRecentSyncHistory,
  getSyncHistoryAuthState,
  getSyncHistoryCount,
  getSyncHistoryWorkspaceName,
  recordSkippedSyncRun,
  recoverStaleSyncHistoryRuns,
  safelyRecordSyncHistory,
  sanitizeSyncHistoryError,
  startSyncHistoryRun,
  summarizeSyncHistoryResult,
};
