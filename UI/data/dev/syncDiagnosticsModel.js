import { EXPO_PUBLIC_ENABLE_DEV_TOOLS } from '@env';
import Constants from 'expo-constants';

import { runDevDataReset } from './runDevChecks';
import { createDevSampleBusinessData } from './devSampleDataSeeder';
import { runDevBackendDataReset } from './devBackendDataResetService';
import { getSyncBaseUrl } from '../sync/syncConfig';

export const DEV_SYNC_GROUP_ID = 'phase_13_sync_dev_group';

const getExpoExtra = () =>
  Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};

export const isSyncDiagnosticsEnabled = ({
  devFlag = typeof __DEV__ !== 'undefined' && __DEV__,
  extra = getExpoExtra(),
  enableDevTools = EXPO_PUBLIC_ENABLE_DEV_TOOLS,
} = {}) =>
  String(enableDevTools || extra.enableDevTools || '').toLowerCase() ===
    'true' && (devFlag === true || extra.enableDevTools === true);

export const runBackendConnectionProbe = async ({
  baseUrl,
  fetchImpl = fetch,
  timeoutMs = 8000,
} = {}) => {
  const resolvedBaseUrl = getSyncBaseUrl({ baseUrl });
  const startedAt = new Date().toISOString();

  if (!resolvedBaseUrl) {
    return {
      ok: false,
      error: 'backend_url_missing',
      resolvedBaseUrl,
      startedAt,
    };
  }

  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await fetchImpl(`${resolvedBaseUrl}/auth/me`, {
      headers: {
        Accept: 'application/json',
      },
      method: 'GET',
      ...(controller ? { signal: controller.signal } : {}),
    });
    const body = await response.text();

    return {
      ok: response.status === 401 || response.ok,
      bodyPreview: body.slice(0, 180),
      endpoint: '/auth/me',
      httpStatus: response.status,
      resolvedBaseUrl,
      responseOk: response.ok,
      startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      endpoint: '/auth/me',
      errorMessage: String(error?.message || error),
      errorName: error?.name || null,
      resolvedBaseUrl,
      startedAt,
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const createSyncDiagnosticsActions = ({
  runners = {
    createDevSampleBusinessData,
    runBackendConnectionProbe,
    runDevBackendDataReset,
    runDevDataReset,
  },
} = {}) => [
  {
    key: 'probeBackendConnection',
    label: 'Probar conexión backend',
    run: () => runners.runBackendConnectionProbe(),
  },
  {
    destructive: true,
    key: 'deleteAllLocalData',
    label: 'Borrar datos locales de SQLite',
    requiresConfirmation: true,
    run: () =>
      runners.runDevDataReset({
        confirm: true,
        scope: 'full_local_dev_reset',
      }),
  },
  {
    destructive: true,
    key: 'deleteBackendData',
    label: 'Borrar base de datos del backend',
    requiresConfirmation: true,
    run: () => runners.runDevBackendDataReset(),
  },
  {
    key: 'createSampleBusinessData',
    label: 'Crear datos aleatorios',
    run: () => runners.createDevSampleBusinessData(),
  },
];
