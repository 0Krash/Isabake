import { validateSyncConfig } from '../sync/syncConfig';

export const NETWORK_STATES = {
  BACKEND_REACHABLE: 'backend_reachable',
  BACKEND_UNREACHABLE: 'backend_unreachable',
  OFFLINE: 'offline',
  ONLINE: 'online',
  SYNC_URL_INVALID: 'sync_url_invalid',
  SYNC_URL_MISSING: 'sync_url_missing',
  UNKNOWN: 'unknown',
};

const SECRET_PATTERN =
  /(access|refresh|invite)?token(hash)?|authorization|password(hash)?|api[_-]?key|cookie|bearer/i;

export const getSafeSyncBaseUrlHost = (baseUrl) => {
  try {
    const parsedUrl = new URL(String(baseUrl || ''));

    return SECRET_PATTERN.test(parsedUrl.host) ? null : parsedUrl.host;
  } catch (error) {
    return null;
  }
};

export const isProbablyOffline = ({ navigatorRef } = {}) => {
  const navigatorValue =
    navigatorRef ||
    (typeof navigator !== 'undefined' ? navigator : null);

  return navigatorValue?.onLine === false;
};

export const createNetworkStatus = ({
  baseUrl,
  errorCode = null,
  isOnline = null,
  lastCheckedAt = null,
  state = NETWORK_STATES.UNKNOWN,
} = {}) => ({
  backendReachable: state === NETWORK_STATES.BACKEND_REACHABLE,
  errorCode,
  isOnline,
  lastCheckedAt,
  networkState: state,
  syncBaseUrlConfigured: Boolean(baseUrl),
  syncBaseUrlHost: getSafeSyncBaseUrlHost(baseUrl),
});

export const evaluateSyncUrlStatus = (options = {}) => {
  const validation = validateSyncConfig(options);

  if (validation.ok) {
    return {
      baseUrl: validation.baseUrl,
      status: createNetworkStatus({
        baseUrl: validation.baseUrl,
        state: NETWORK_STATES.UNKNOWN,
      }),
    };
  }

  const state =
    validation.error === 'sync_base_url_missing'
      ? NETWORK_STATES.SYNC_URL_MISSING
      : NETWORK_STATES.SYNC_URL_INVALID;

  return {
    baseUrl: validation.baseUrl,
    status: createNetworkStatus({
      baseUrl: validation.baseUrl,
      errorCode: state,
      state,
    }),
  };
};

export const mapReachabilityError = (error, options = {}) =>
  isProbablyOffline(options)
    ? NETWORK_STATES.OFFLINE
    : NETWORK_STATES.BACKEND_UNREACHABLE;

export default {
  NETWORK_STATES,
  createNetworkStatus,
  evaluateSyncUrlStatus,
  getSafeSyncBaseUrlHost,
  isProbablyOffline,
  mapReachabilityError,
};
