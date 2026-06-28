import { API_HOST, URL_Sync } from '@env';

const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const getEnv = () =>
  typeof process !== 'undefined' && process.env ? process.env : {};

export const getSyncBaseUrl = (options = {}) => {
  if (Object.prototype.hasOwnProperty.call(options, 'baseUrl')) {
    return trimTrailingSlash(options.baseUrl);
  }

  const environment = getEnv();

  return trimTrailingSlash(
    URL_Sync ||
      environment.EXPO_PUBLIC_SYNC_API_URL ||
      environment.EXPO_PUBLIC_API_URL ||
      API_HOST ||
      '',
  );
};

export const validateSyncConfig = (options = {}) => {
  const baseUrl = getSyncBaseUrl(options);

  if (!baseUrl) {
    return {
      baseUrl,
      error: 'sync_base_url_missing',
      ok: false,
    };
  }

  try {
    const parsedUrl = new URL(baseUrl);
    const validProtocol =
      parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';

    return {
      baseUrl,
      error: validProtocol ? null : 'sync_base_url_protocol_invalid',
      ok: validProtocol,
    };
  } catch (error) {
    return {
      baseUrl,
      error: 'sync_base_url_invalid',
      ok: false,
    };
  }
};

export default {
  getSyncBaseUrl,
  validateSyncConfig,
};
