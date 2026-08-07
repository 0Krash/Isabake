describe('syncConfig expo runtime config', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
    jest.dontMock('@env');
    jest.dontMock('expo-constants');
  });

  test('falls back to Expo extra config when build env is unavailable', () => {
    process.env = {
      ...originalEnv,
      EXPO_PUBLIC_API_URL: '',
      EXPO_PUBLIC_SYNC_API_URL: '',
    };

    jest.doMock('@env', () => ({
      API_HOST: '',
      URL_Sync: '',
    }));
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra: {
            syncApiUrl: 'http://extra-sync.test:3000/',
          },
        },
      },
    }));

    const { getSyncBaseUrl } = require('./syncConfig');

    expect(getSyncBaseUrl()).toBe('http://extra-sync.test:3000');
  });

  test('prefers embedded Expo extra config over build env values', () => {
    process.env = {
      ...originalEnv,
      EXPO_PUBLIC_API_URL: 'http://wrong-build-env.test',
      EXPO_PUBLIC_SYNC_API_URL: 'http://wrong-sync-env.test',
    };

    jest.doMock('@env', () => ({
      API_HOST: '',
      URL_Sync: '',
    }));
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra: {
            syncApiUrl: 'http://embedded-sync.test:3000',
          },
        },
      },
    }));

    const { getSyncBaseUrl } = require('./syncConfig');

    expect(getSyncBaseUrl()).toBe('http://embedded-sync.test:3000');
  });
});
