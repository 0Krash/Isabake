export const AUTO_SYNC_COLLECTION = '__local_auto_sync';
export const AUTO_SYNC_SETTINGS_ID = 'settings';
export const AUTO_SYNC_STATE_ID = 'state';

export const AUTO_SYNC_DEFAULTS = {
  cooldownMs: 45 * 1000,
  debounceMs: 1500,
  failureBackoffMs: 2 * 60 * 1000,
  staleInFlightMs: 2 * 60 * 1000,
};

export const AUTO_SYNC_REASONS = {
  APP_ACTIVE: 'app_active',
  CONNECTIVITY_RESTORED: 'connectivity_restored',
  LOGIN_SUCCESS: 'login_success',
  LOCAL_CHANGE: 'local_change',
  RETRY_AFTER_FAILURE: 'retry_after_failure',
};

export const AUTO_SYNC_STATES = {
  BACKOFF: 'backoff',
  BACKEND_UNREACHABLE: 'backend_unreachable',
  COOLDOWN: 'cooldown',
  FAILED: 'failed',
  IDLE: 'idle',
  SCHEDULED: 'scheduled',
  SKIPPED_APP_INACTIVE: 'skipped_app_inactive',
  SKIPPED_CONFLICTS: 'skipped_conflicts',
  SKIPPED_DISABLED: 'skipped_disabled',
  SKIPPED_LOCAL_ONLY: 'skipped_local_only',
  SKIPPED_NO_AUTH: 'skipped_no_auth',
  SKIPPED_NO_WORKSPACE: 'skipped_no_workspace',
  SKIPPED_OFFLINE: 'skipped_offline',
  SYNC_URL_INVALID: 'sync_url_invalid',
  SYNC_URL_MISSING: 'sync_url_missing',
  SYNCING: 'syncing',
};

export const AUTO_SYNC_SKIP_REASONS = {
  APP_INACTIVE: 'app_inactive',
  AUTO_SYNC_DISABLED: 'auto_sync_disabled',
  BACKOFF_ACTIVE: 'backoff_active',
  CONFLICTS_PENDING: 'conflicts_pending',
  GROUP_ID_REQUIRED: 'groupId_required',
  LOCAL_ONLY_MODE: 'local_only_mode',
  NETWORK_OFFLINE: 'network_offline',
  NO_AUTH_SESSION: 'auth_required',
  RECENT_SYNC: 'recent_sync',
  SYNC_URL_INVALID: 'sync_url_invalid',
  SYNC_URL_MISSING: 'sync_url_missing',
  SYNC_IN_FLIGHT: 'sync_in_flight',
  BACKEND_UNREACHABLE: 'backend_unreachable',
  WORKSPACE_REQUIRED: 'workspace_required',
};

export default {
  AUTO_SYNC_COLLECTION,
  AUTO_SYNC_DEFAULTS,
  AUTO_SYNC_REASONS,
  AUTO_SYNC_SETTINGS_ID,
  AUTO_SYNC_STATES,
  AUTO_SYNC_SKIP_REASONS,
  AUTO_SYNC_STATE_ID,
};
