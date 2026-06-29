import * as mockSecureStore from 'expo-secure-store';

import {
  clearStoredAuthSession,
  loadAuthSession,
  saveAuthSession,
  setSecureStoreAdapterForAuth,
} from './authTokenStore';

describe('authTokenStore', () => {
  beforeEach(() => {
    mockSecureStore.__clear();
    setSecureStoreAdapterForAuth(mockSecureStore);
    mockSecureStore.getItemAsync.mockResolvedValue(null);
  });

  test('uses SecureStore adapter and separates token storage from metadata', async () => {
    await saveAuthSession({
      accessToken: 'jwt_access_secret',
      email: 'ana@example.test',
      refreshToken: 'jwt_refresh_secret',
      userId: 'user_1',
    });

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(3);
    const metadataCall = mockSecureStore.setItemAsync.mock.calls.find(
      ([key]) => key === 'transbalance.auth.session',
    );

    expect(metadataCall[1]).toContain('ana@example.test');
    expect(metadataCall[1]).not.toContain('jwt_access_secret');
    expect(metadataCall[1]).not.toContain('jwt_refresh_secret');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'transbalance.auth.accessToken',
      'jwt_access_secret',
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'transbalance.auth.refreshToken',
      'jwt_refresh_secret',
    );
  });

  test('loads and clears secure session tokens', async () => {
    mockSecureStore.getItemAsync.mockImplementation(async (key) => {
      if (key === 'transbalance.auth.session') {
        return JSON.stringify({
          email: 'ana@example.test',
          userId: 'user_1',
        });
      }

      if (key === 'transbalance.auth.accessToken') {
        return 'jwt_access_secret';
      }

      if (key === 'transbalance.auth.refreshToken') {
        return 'jwt_refresh_secret';
      }

      return null;
    });

    await expect(loadAuthSession()).resolves.toEqual({
      accessToken: 'jwt_access_secret',
      email: 'ana@example.test',
      refreshToken: 'jwt_refresh_secret',
      userId: 'user_1',
    });

    await clearStoredAuthSession();

    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'transbalance.auth.session',
    );
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'transbalance.auth.accessToken',
    );
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'transbalance.auth.refreshToken',
    );
  });

  test('keeps memory fallback for unsupported test environments', async () => {
    setSecureStoreAdapterForAuth(null);

    await saveAuthSession({
      accessToken: 'jwt_access_memory',
      userId: 'user_1',
    });

    await expect(loadAuthSession()).resolves.toEqual({
      accessToken: 'jwt_access_memory',
      userId: 'user_1',
    });
  });
});
