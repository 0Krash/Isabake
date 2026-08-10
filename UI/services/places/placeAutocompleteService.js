import {
  EXPO_PUBLIC_DENUE_TOKEN,
  EXPO_PUBLIC_PLACE_AUTOCOMPLETE_REGION,
  EXPO_PUBLIC_PLACE_AUTOCOMPLETE_URL,
} from '@env';
import Constants from 'expo-constants';

const DEFAULT_PHOTON_BASE_URL = 'https://photon.komoot.io';
const DEFAULT_NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const DEFAULT_DENUE_BASE_URL = 'https://www.inegi.org.mx/app/api/denue/v1/consulta';

const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const getEnvValue = (key) =>
  typeof process !== 'undefined' && process.env ? process.env[key] : '';

const getExpoExtra = () =>
  Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};

export const getPlaceAutocompleteBaseUrl = () =>
  trimTrailingSlash(
    EXPO_PUBLIC_PLACE_AUTOCOMPLETE_URL ||
      getExpoExtra().placeAutocompleteUrl ||
      getEnvValue('EXPO_PUBLIC_PLACE_AUTOCOMPLETE_URL') ||
      DEFAULT_PHOTON_BASE_URL,
  );

export const getPlaceAutocompleteRegion = () =>
  String(
    EXPO_PUBLIC_PLACE_AUTOCOMPLETE_REGION ||
      getExpoExtra().placeAutocompleteRegion ||
      getEnvValue('EXPO_PUBLIC_PLACE_AUTOCOMPLETE_REGION') ||
      'mx',
  )
    .trim()
    .toLowerCase();

export const getDenueToken = () =>
  String(
    EXPO_PUBLIC_DENUE_TOKEN ||
      getExpoExtra().denueToken ||
      getEnvValue('EXPO_PUBLIC_DENUE_TOKEN') ||
      '',
  ).trim();

const getPhotonSuggestionLabel = (properties = {}) =>
  [
    properties.name,
    properties.street,
    properties.housenumber,
    properties.city || properties.locality,
    properties.state,
    properties.country,
  ]
    .filter(Boolean)
    .join(', ');

const getNominatimSuggestionLabel = (place = {}) =>
  place.display_name || '';

const mergePlaceSuggestions = (...suggestionGroups) => {
  const seen = new Set();

  return suggestionGroups
    .flat()
    .filter((suggestion) => {
      const key =
        `${suggestion.id}-${suggestion.description}`.trim().toLowerCase();

      if (!suggestion.description || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};

export const normalizePlaceSuggestions = (payload = {}) =>
  (payload.features || [])
    .map((feature, index) => {
      const properties = feature.properties || {};
      const [longitude, latitude] = feature.geometry?.coordinates || [];
      const description =
        getPhotonSuggestionLabel(properties) || properties.label || '';

      return {
        description,
        id: `${properties.osm_type || 'place'}-${properties.osm_id || properties.place_id || index}`,
        latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
        longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
      };
    })
    .filter((suggestion) => suggestion.description);

export const normalizeNominatimSuggestions = (payload = []) =>
  (Array.isArray(payload) ? payload : [])
    .map((place, index) => {
      const description = getNominatimSuggestionLabel(place);

      return {
        description,
        id: `nominatim-${place.osm_type || 'place'}-${place.osm_id || place.place_id || index}`,
        latitude: Number.isFinite(Number(place.lat)) ? Number(place.lat) : null,
        longitude: Number.isFinite(Number(place.lon)) ? Number(place.lon) : null,
      };
    })
    .filter((suggestion) => suggestion.description);

const getDenueAddress = (place = {}) =>
  [
    place.Tipo_vialidad,
    place.Calle,
    place.Num_Exterior,
    place.Num_Interior,
    place.Colonia,
    place.CP ? `CP ${place.CP}` : '',
    place.Ubicacion,
  ]
    .filter(Boolean)
    .join(', ');

export const normalizeDenueSuggestions = (payload = []) =>
  (Array.isArray(payload) ? payload : [])
    .map((place, index) => {
      const name = place.Nombre || place.Razon_social || '';
      const address = getDenueAddress(place);
      const description = [name, address].filter(Boolean).join(', ');

      return {
        description,
        id: `denue-${place.Id || place.CLEE || index}`,
        latitude: Number.isFinite(Number(place.Latitud))
          ? Number(place.Latitud)
          : null,
        longitude: Number.isFinite(Number(place.Longitud))
          ? Number(place.Longitud)
          : null,
      };
    })
    .filter((suggestion) => suggestion.description);

export const fetchDenuePlaceSuggestions = async (
  input,
  {
    baseUrl = DEFAULT_DENUE_BASE_URL,
    entity = '00',
    fetchImpl = fetch,
    limit = 5,
    token = getDenueToken(),
  } = {},
) => {
  const query = String(input || '').trim();
  const denueToken = String(token || '').trim();

  if (query.length < 3 || !denueToken) {
    return [];
  }

  const url = [
    trimTrailingSlash(baseUrl),
    'BuscarEntidad',
    encodeURIComponent(query),
    encodeURIComponent(entity),
    '1',
    String(limit),
    encodeURIComponent(denueToken),
  ].join('/');
  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new Error('denue_place_search_failed');
  }

  return normalizeDenueSuggestions(await response.json());
};

export const fetchNominatimPlaceSuggestions = async (
  input,
  {
    baseUrl = DEFAULT_NOMINATIM_BASE_URL,
    countryCode = getPlaceAutocompleteRegion(),
    fetchImpl = fetch,
    limit = 5,
  } = {},
) => {
  const query = String(input || '').trim();

  if (query.length < 3) {
    return [];
  }

  const params = new URLSearchParams({
    addressdetails: '1',
    countrycodes: countryCode,
    format: 'jsonv2',
    layer: 'poi,address',
    limit: String(limit),
    q: query,
  });

  const response = await fetchImpl(
    `${trimTrailingSlash(baseUrl)}/search?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error('nominatim_place_search_failed');
  }

  return normalizeNominatimSuggestions(await response.json());
};

export const fetchPlaceSuggestions = async (
  input,
  {
    baseUrl = getPlaceAutocompleteBaseUrl(),
    denueToken = getDenueToken(),
    fetchImpl = fetch,
    limit = 5,
  } = {},
) => {
  const query = String(input || '').trim();

  if (query.length < 3) {
    return [];
  }

  const params = new URLSearchParams({
    lang: 'default',
    limit: String(limit),
    q: query,
  });

  const [denueResult, photonResult, nominatimResult] = await Promise.allSettled([
    fetchDenuePlaceSuggestions(query, { fetchImpl, limit, token: denueToken }),
    fetchImpl(`${baseUrl}/api?${params.toString()}`),
    fetchNominatimPlaceSuggestions(query, { fetchImpl, limit }),
  ]);

  if (photonResult.status !== 'fulfilled' || !photonResult.value.ok) {
    if (nominatimResult.status === 'fulfilled') {
      const denueSuggestions =
        denueResult.status === 'fulfilled' ? denueResult.value : [];
      return mergePlaceSuggestions(denueSuggestions, nominatimResult.value)
        .slice(0, limit);
    }

    throw new Error('place_autocomplete_failed');
  }

  const denueSuggestions =
    denueResult.status === 'fulfilled' ? denueResult.value : [];
  const photonSuggestions = normalizePlaceSuggestions(
    await photonResult.value.json(),
  );
  const nominatimSuggestions =
    nominatimResult.status === 'fulfilled' ? nominatimResult.value : [];

  return mergePlaceSuggestions(
    denueSuggestions,
    photonSuggestions,
    nominatimSuggestions,
  ).slice(0, limit);
};

export const fetchAddressFromCoordinates = async (
  { latitude, longitude },
  {
    baseUrl = getPlaceAutocompleteBaseUrl(),
    fetchImpl = fetch,
  } = {},
) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return '';
  }

  const params = new URLSearchParams({
    lat: String(lat),
    limit: '1',
    lon: String(lon),
  });

  const response = await fetchImpl(`${baseUrl}/reverse?${params.toString()}`);

  if (!response.ok) {
    throw new Error('place_reverse_geocode_failed');
  }

  return normalizePlaceSuggestions(await response.json())[0]?.description || '';
};
