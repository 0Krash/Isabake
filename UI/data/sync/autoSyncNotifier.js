import {
  recordNotifierFlushed,
  recordNotifierQueued,
} from './autoSyncDecisionTrace';

let autoSyncHandler = null;
let pendingReasons = [];

export const setAutoSyncNotifier = (handler) => {
  autoSyncHandler = typeof handler === 'function' ? handler : null;

  if (autoSyncHandler && pendingReasons.length) {
    const reasons = [...new Set(pendingReasons)];
    pendingReasons = [];
    reasons.forEach((reason) => {
      recordNotifierFlushed(reason);
      autoSyncHandler(reason);
    });
  }
};

export const notifyAutoSyncFromLocalChange = (reason = 'local_change') => {
  if (!autoSyncHandler) {
    pendingReasons.push(reason);
    recordNotifierQueued(reason);
    return {
      reason: 'auto_sync_not_initialized',
      scheduled: false,
    };
  }

  return autoSyncHandler(reason);
};

export const __resetAutoSyncNotifierForTests = () => {
  autoSyncHandler = null;
  pendingReasons = [];
};

export default {
  __resetAutoSyncNotifierForTests,
  notifyAutoSyncFromLocalChange,
  setAutoSyncNotifier,
};
