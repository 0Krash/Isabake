const appJson = require('./app.json');
const { applyInviteAppLinksConfig } = require('./config/appLinks');

const getBackendUrl = (env) =>
  env.EXPO_PUBLIC_SYNC_API_URL ||
  env.EXPO_PUBLIC_API_URL ||
  appJson.expo.extra?.syncApiUrl ||
  appJson.expo.extra?.apiUrl ||
  '';

const getPlaceAutocompleteUrl = (env) =>
  env.EXPO_PUBLIC_PLACE_AUTOCOMPLETE_URL ||
  appJson.expo.extra?.placeAutocompleteUrl ||
  'https://photon.komoot.io';

const getPlaceAutocompleteRegion = (env) =>
  env.EXPO_PUBLIC_PLACE_AUTOCOMPLETE_REGION ||
  appJson.expo.extra?.placeAutocompleteRegion ||
  'mx';

const getDenueToken = (env) =>
  env.EXPO_PUBLIC_DENUE_TOKEN ||
  appJson.expo.extra?.denueToken ||
  '';

module.exports = ({ config }) => {
  const backendUrl = getBackendUrl(process.env);
  const placeAutocompleteUrl = getPlaceAutocompleteUrl(process.env);
  const placeAutocompleteRegion = getPlaceAutocompleteRegion(process.env);
  const denueToken = getDenueToken(process.env);
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
      placeAutocompleteRegion,
      placeAutocompleteUrl,
      ...(denueToken ? { denueToken } : {}),
    },
  };

  return applyInviteAppLinksConfig(expoConfig, process.env);
};
