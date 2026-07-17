const {
  isLegacySocketIoEnabled,
} = require('../../services/legacySocketConfig');

describe('legacySocketConfig', () => {
  const originalFlag = process.env.ENABLE_LEGACY_SOCKET_IO;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.ENABLE_LEGACY_SOCKET_IO;
    } else {
      process.env.ENABLE_LEGACY_SOCKET_IO = originalFlag;
    }
  });

  test('disables legacy socket.io by default', () => {
    delete process.env.ENABLE_LEGACY_SOCKET_IO;

    expect(isLegacySocketIoEnabled()).toBe(false);
  });

  test('enables legacy socket.io only with explicit flag', () => {
    process.env.ENABLE_LEGACY_SOCKET_IO = 'true';

    expect(isLegacySocketIoEnabled()).toBe(true);
  });
});
