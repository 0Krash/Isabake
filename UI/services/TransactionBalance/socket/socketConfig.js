const getEnvValue = (key) =>
  globalThis.process?.env ? globalThis.process.env[key] : '';

export const isLegacySocketEnabled = () =>
  String(getEnvValue('EXPO_PUBLIC_ENABLE_LEGACY_SOCKET_IO') || '').toLowerCase() ===
    'true';

export const getLegacySocketUrl = () =>
  getEnvValue('EXPO_PUBLIC_LEGACY_SOCKET_URL') ||
  getEnvValue('EXPO_PUBLIC_API_URL') ||
  getEnvValue('API_HOST') ||
  '';

export default {
  getLegacySocketUrl,
  isLegacySocketEnabled,
};
