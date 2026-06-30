import {
  getLegacySocketUrl,
  isLegacySocketEnabled,
} from './socketConfig';

describe('legacy mobile socket config', () => {
  const env = globalThis.process.env;
  const originalFlag = env['EXPO_PUBLIC_ENABLE_LEGACY_SOCKET_IO'];
  const originalUrl = env['EXPO_PUBLIC_LEGACY_SOCKET_URL'];

  afterEach(() => {
    if (originalFlag === undefined) {
      delete env['EXPO_PUBLIC_ENABLE_LEGACY_SOCKET_IO'];
    } else {
      env['EXPO_PUBLIC_ENABLE_LEGACY_SOCKET_IO'] = originalFlag;
    }

    if (originalUrl === undefined) {
      delete env['EXPO_PUBLIC_LEGACY_SOCKET_URL'];
    } else {
      env['EXPO_PUBLIC_LEGACY_SOCKET_URL'] = originalUrl;
    }
  });

  test('is disabled by default', () => {
    delete env['EXPO_PUBLIC_ENABLE_LEGACY_SOCKET_IO'];

    expect(isLegacySocketEnabled()).toBe(false);
  });

  test('is enabled only with explicit flag', () => {
    env['EXPO_PUBLIC_ENABLE_LEGACY_SOCKET_IO'] = 'true';

    expect(isLegacySocketEnabled()).toBe(true);
  });

  test('uses explicit legacy socket URL when present', () => {
    env['EXPO_PUBLIC_LEGACY_SOCKET_URL'] = 'http://api.example.test';

    expect(getLegacySocketUrl()).toBe('http://api.example.test');
  });
});
