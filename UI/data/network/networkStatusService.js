import {
  NETWORK_STATES,
  createNetworkStatus,
  evaluateSyncUrlStatus,
  mapReachabilityError,
} from './networkStatusModel';

const DEFAULT_REACHABILITY_TIMEOUT_MS = 4500;

let currentStatus = createNetworkStatus();
let initialized = false;
let monitoring = false;
const listeners = new Set();

const nowIso = () => new Date().toISOString();

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener(currentStatus);
    } catch (error) {
      // Listener failures must never break network state updates.
    }
  });
};

const setNetworkStatus = (nextStatus = {}) => {
  currentStatus = {
    ...currentStatus,
    ...nextStatus,
    lastCheckedAt: nextStatus.lastCheckedAt || currentStatus.lastCheckedAt,
  };
  notifyListeners();
  return currentStatus;
};

const fetchWithTimeout = async (
  url,
  {
    fetchImpl = fetch,
    method = 'GET',
    timeoutMs = DEFAULT_REACHABILITY_TIMEOUT_MS,
  } = {},
) => {
  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('network_timeout'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetchImpl(url, {
        headers: {
          Accept: 'application/json',
        },
        method,
      }),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const initializeNetworkStatus = () => {
  initialized = true;
  return currentStatus;
};

export const startNetworkMonitoring = () => {
  initialized = true;
  monitoring = true;
  return currentStatus;
};

export const stopNetworkMonitoring = () => {
  monitoring = false;
};

export const getNetworkStatus = () => currentStatus;

export const subscribeToNetworkStatus = (listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const refreshNetworkStatus = async ({
  baseUrl,
  fetchImpl,
  method = 'GET',
  navigatorRef,
  timeoutMs,
} = {}) => {
  initialized = true;
  const checkedAt = nowIso();
  const { baseUrl: resolvedBaseUrl, status } = evaluateSyncUrlStatus({
    baseUrl,
  });

  if (
    status.networkState === NETWORK_STATES.SYNC_URL_MISSING ||
    status.networkState === NETWORK_STATES.SYNC_URL_INVALID
  ) {
    return setNetworkStatus({
      ...status,
      lastCheckedAt: checkedAt,
    });
  }

  try {
    await fetchWithTimeout(resolvedBaseUrl, {
      fetchImpl,
      method,
      timeoutMs,
    });

    return setNetworkStatus({
      ...createNetworkStatus({
        baseUrl: resolvedBaseUrl,
        isOnline: true,
        lastCheckedAt: checkedAt,
        state: NETWORK_STATES.BACKEND_REACHABLE,
      }),
    });
  } catch (error) {
    const state = mapReachabilityError(error, { navigatorRef });

    return setNetworkStatus({
      ...createNetworkStatus({
        baseUrl: resolvedBaseUrl,
        errorCode: state,
        isOnline: state === NETWORK_STATES.OFFLINE ? false : null,
        lastCheckedAt: checkedAt,
        state,
      }),
    });
  }
};

export const getNetworkDiagnostics = () => ({
  backendReachable: currentStatus.backendReachable,
  initialized,
  lastNetworkCheckAt: currentStatus.lastCheckedAt || null,
  lastNetworkErrorCode: currentStatus.errorCode || null,
  monitoring,
  networkState: currentStatus.networkState,
  syncBaseUrlConfigured: currentStatus.syncBaseUrlConfigured,
  syncBaseUrlHost: currentStatus.syncBaseUrlHost || null,
});

export const __resetNetworkStatusForTests = () => {
  currentStatus = createNetworkStatus();
  initialized = false;
  monitoring = false;
  listeners.clear();
};

export default {
  __resetNetworkStatusForTests,
  getNetworkDiagnostics,
  getNetworkStatus,
  initializeNetworkStatus,
  refreshNetworkStatus,
  startNetworkMonitoring,
  stopNetworkMonitoring,
  subscribeToNetworkStatus,
};
