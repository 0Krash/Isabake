import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'transbalance.auth.session';
const ACCESS_TOKEN_KEY = 'transbalance.auth.accessToken';
const REFRESH_TOKEN_KEY = 'transbalance.auth.refreshToken';

let memorySession = null;
let secureStoreAdapter = SecureStore;

export const setSecureStoreAdapterForAuth = (adapter) => {
  secureStoreAdapter = adapter || null;
};

const canUseSecureStore = () =>
  Boolean(
    secureStoreAdapter?.getItemAsync &&
      secureStoreAdapter?.setItemAsync &&
      secureStoreAdapter?.deleteItemAsync,
  );

const splitSessionForStorage = (session = {}) => {
  const { accessToken, authToken, refreshToken, token, ...metadata } = session || {};

  return {
    accessToken: accessToken || authToken || token || null,
    metadata,
    refreshToken: refreshToken || null,
  };
};

export const saveAuthSession = async (session) => {
  memorySession = session || null;

  if (canUseSecureStore()) {
    const { accessToken, metadata, refreshToken } =
      splitSessionForStorage(memorySession);

    await secureStoreAdapter.setItemAsync(SESSION_KEY, JSON.stringify(metadata));

    if (accessToken) {
      await secureStoreAdapter.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    } else {
      await secureStoreAdapter.deleteItemAsync(ACCESS_TOKEN_KEY);
    }

    if (refreshToken) {
      await secureStoreAdapter.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      await secureStoreAdapter.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  }

  return memorySession;
};

export const loadAuthSession = async () => {
  if (canUseSecureStore()) {
    const storedMetadata = await secureStoreAdapter.getItemAsync(SESSION_KEY);

    if (storedMetadata) {
      const [accessToken, refreshToken] = await Promise.all([
        secureStoreAdapter.getItemAsync(ACCESS_TOKEN_KEY),
        secureStoreAdapter.getItemAsync(REFRESH_TOKEN_KEY),
      ]);

      memorySession = {
        ...JSON.parse(storedMetadata),
        accessToken,
        refreshToken,
      };
    }
  }

  return memorySession;
};

export const clearStoredAuthSession = async () => {
  memorySession = null;

  if (canUseSecureStore()) {
    await Promise.all([
      secureStoreAdapter.deleteItemAsync(SESSION_KEY),
      secureStoreAdapter.deleteItemAsync(ACCESS_TOKEN_KEY),
      secureStoreAdapter.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  }

  return null;
};

export default {
  clearStoredAuthSession,
  loadAuthSession,
  saveAuthSession,
  setSecureStoreAdapterForAuth,
};
