export const AUTO_SYNC_COLLECTION = '__local_auto_sync';
export const AUTO_SYNC_SETTINGS_ID = 'settings';
export const AUTO_SYNC_STATE_ID = 'state';

export const AUTO_SYNC_DEFAULTS = {
  cooldownMs: 45 * 1000,
  debounceMs: 15 * 1000,
  failureBackoffMs: 2 * 60 * 1000,
};

export const AUTO_SYNC_REASONS = {
  APP_ACTIVE: 'app_active',
  CONNECTIVITY_RESTORED: 'connectivity_restored',
  LOCAL_CHANGE: 'local_change',
  RETRY_AFTER_FAILURE: 'retry_after_failure',
};

export const AUTO_SYNC_SKIP_REASONS = {
  APP_INACTIVE: 'app_inactive',
  AUTO_SYNC_DISABLED: 'auto_sync_disabled',
  BACKOFF_ACTIVE: 'backoff_active',
  CONFLICTS_PENDING: 'conflicts_pending',
  GROUP_ID_REQUIRED: 'groupId_required',
  LOCAL_ONLY_MODE: 'local_only_mode',
  NO_AUTH_SESSION: 'auth_required',
  RECENT_SYNC: 'recent_sync',
  SYNC_IN_FLIGHT: 'sync_in_flight',
  WORKSPACE_REQUIRED: 'workspace_required',
};

export default {
  AUTO_SYNC_COLLECTION,
  AUTO_SYNC_DEFAULTS,
  AUTO_SYNC_REASONS,
  AUTO_SYNC_SETTINGS_ID,
  AUTO_SYNC_SKIP_REASONS,
  AUTO_SYNC_STATE_ID,
};
