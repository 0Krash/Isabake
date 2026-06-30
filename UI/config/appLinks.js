const INVITE_PATH_PREFIX = '/invite';

const getHostnameFromUrl = (value = '') => {
  try {
    return new URL(value).hostname || null;
  } catch (error) {
    return null;
  }
};

const normalizeInviteDomain = (domain = '') => {
  const rawValue = String(domain || '').trim();

  if (!rawValue) {
    return null;
  }

  const hostname = rawValue.includes('://')
    ? getHostnameFromUrl(rawValue)
    : rawValue.split('/')[0];

  if (!hostname || hostname.includes(':')) {
    return null;
  }

  return hostname.toLowerCase();
};

const getConfiguredInviteDomain = (env = process.env) =>
  normalizeInviteDomain(
    env.EXPO_PUBLIC_INVITE_DOMAIN ||
      env.APP_INVITE_BASE_URL ||
      env.INVITATION_BASE_URL ||
      '',
  );

const createAndroidInviteIntentFilter = (domain) => ({
  action: 'VIEW',
  autoVerify: true,
  category: ['BROWSABLE', 'DEFAULT'],
  data: [
    {
      host: domain,
      pathPrefix: INVITE_PATH_PREFIX,
      scheme: 'https',
    },
  ],
});

const applyInviteAppLinksConfig = (expoConfig = {}, env = process.env) => {
  const inviteDomain = getConfiguredInviteDomain(env);
  const nextConfig = JSON.parse(JSON.stringify(expoConfig || {}));

  nextConfig.scheme = nextConfig.scheme || 'isabake';

  if (!inviteDomain) {
    return nextConfig;
  }

  nextConfig.android = {
    ...(nextConfig.android || {}),
    intentFilters: [
      ...((nextConfig.android && nextConfig.android.intentFilters) || []),
      createAndroidInviteIntentFilter(inviteDomain),
    ],
  };
  nextConfig.ios = {
    ...(nextConfig.ios || {}),
    associatedDomains: [
      ...((nextConfig.ios && nextConfig.ios.associatedDomains) || []),
      `applinks:${inviteDomain}`,
    ],
  };

  return nextConfig;
};

module.exports = {
  INVITE_PATH_PREFIX,
  applyInviteAppLinksConfig,
  createAndroidInviteIntentFilter,
  getConfiguredInviteDomain,
  normalizeInviteDomain,
};
