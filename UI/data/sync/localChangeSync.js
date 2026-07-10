import { AUTO_SYNC_REASONS } from './autoSyncConfig';
import { runAutoSyncNow } from './autoSyncService';

const getSafeErrorCode = (error) =>
  String(error?.code || error?.message || error || 'unknown_sync_error').slice(
    0,
    120,
  );

export const requestLocalChangeSync = ({
  runAutoSync = runAutoSyncNow,
} = {}) =>
  Promise.resolve()
    .then(() =>
      runAutoSync({
        appState: 'active',
        reason: AUTO_SYNC_REASONS.LOCAL_CHANGE,
      }),
    )
    .catch((error) => ({
      errorCode: getSafeErrorCode(error),
      ok: false,
      skipped: false,
    }));

export default {
  requestLocalChangeSync,
};
