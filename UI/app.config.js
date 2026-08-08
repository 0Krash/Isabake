const appJson = require('./app.json');
const { applyInviteAppLinksConfig } = require('./config/appLinks');

const getBackendUrl = (env) =>
  env.EXPO_PUBLIC_SYNC_API_URL ||
  env.EXPO_PUBLIC_API_URL ||
  appJson.expo.extra?.syncApiUrl ||
  appJson.expo.extra?.apiUrl ||
  '';

module.exports = ({ config }) => {
  const backendUrl = getBackendUrl(process.env);
  const expoConfig = {
    ...config,
    ...appJson.expo,
    extra: {
      ...(config.extra || {}),
      ...(appJson.expo.extra || {}),
      ...(backendUrl
        ? {
            apiUrl: backendUrl,
            syncApiUrl: backendUrl,
          }
        : {}),
    },
  };

  return applyInviteAppLinksConfig(expoConfig, process.env);
};
