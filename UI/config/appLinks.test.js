const {
  applyInviteAppLinksConfig,
  getConfiguredInviteDomain,
  normalizeInviteDomain,
} = require('./appLinks');

describe('appLinks config helpers', () => {
  const baseConfig = {
    android: {
      package: 'com.isabake.app',
    },
    ios: {
      bundleIdentifier: 'com.isabake.app',
      supportsTablet: true,
    },
    name: 'Isabake',
    scheme: 'isabake',
  };

  test('normalizes configured invite domain values', () => {
    expect(normalizeInviteDomain('Isabake.example')).toBe('isabake.example');
    expect(normalizeInviteDomain('https://isabake.example/invite')).toBe(
      'isabake.example',
    );
    expect(normalizeInviteDomain('')).toBe(null);
  });

  test('uses explicit public invite domain before base URL fallback', () => {
    expect(
      getConfiguredInviteDomain({
        APP_INVITE_BASE_URL: 'https://fallback.example/invite',
        EXPO_PUBLIC_INVITE_DOMAIN: 'links.example',
      }),
    ).toBe('links.example');
    expect(
      getConfiguredInviteDomain({
        APP_INVITE_BASE_URL: 'https://fallback.example/invite',
      }),
    ).toBe('fallback.example');
  });

  test('keeps local app config unchanged when no invite domain is configured', () => {
    expect(applyInviteAppLinksConfig(baseConfig, {})).toEqual(baseConfig);
  });

  test('adds android and ios production app link config when domain is configured', () => {
    expect(
      applyInviteAppLinksConfig(baseConfig, {
        EXPO_PUBLIC_INVITE_DOMAIN: 'links.example',
      }),
    ).toEqual(
      expect.objectContaining({
        android: expect.objectContaining({
          intentFilters: [
            {
              action: 'VIEW',
              autoVerify: true,
              category: ['BROWSABLE', 'DEFAULT'],
              data: [
                {
                  host: 'links.example',
                  pathPrefix: '/invite',
                  scheme: 'https',
                },
              ],
            },
          ],
          package: 'com.isabake.app',
        }),
        ios: expect.objectContaining({
          associatedDomains: ['applinks:links.example'],
          bundleIdentifier: 'com.isabake.app',
        }),
        scheme: 'isabake',
      }),
    );
  });
});
