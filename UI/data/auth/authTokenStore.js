const SESSION_KEY = 'transbalance.auth.session';

let memorySession = null;
let secureStoreAdapter = null;

export const setSecureStoreAdapterForAuth = (adapter) => {
  secureStoreAdapter = adapter || null;
};

export const saveAuthSession = async (session) => {
  memorySession = session || null;

  if (secureStoreAdapter?.setItemAsync) {
    await secureStoreAdapter.setItemAsync(
      SESSION_KEY,
      JSON.stringify(memorySession),
    );
  }

  return memorySession;
};

export const loadAuthSession = async () => {
  if (secureStoreAdapter?.getItemAsync) {
    const storedSession = await secureStoreAdapter.getItemAsync(SESSION_KEY);

    if (storedSession) {
      memorySession = JSON.parse(storedSession);
    }
  }

  return memorySession;
};

export const clearStoredAuthSession = async () => {
  memorySession = null;

  if (secureStoreAdapter?.deleteItemAsync) {
    await secureStoreAdapter.deleteItemAsync(SESSION_KEY);
  }

  return null;
};

export default {
  clearStoredAuthSession,
  loadAuthSession,
  saveAuthSession,
  setSecureStoreAdapterForAuth,
};
