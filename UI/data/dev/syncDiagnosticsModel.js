import { EXPO_PUBLIC_ENABLE_DEV_TOOLS } from '@env';

import { runDevDataReset } from './runDevChecks';
import { createDevSampleBusinessData } from './devSampleDataSeeder';
import { runDevBackendDataReset } from './devBackendDataResetService';

export const DEV_SYNC_GROUP_ID = 'phase_13_sync_dev_group';

export const isSyncDiagnosticsEnabled = ({
  devFlag = typeof __DEV__ !== 'undefined' && __DEV__,
  enableDevTools = EXPO_PUBLIC_ENABLE_DEV_TOOLS,
} = {}) =>
  devFlag === true && String(enableDevTools || '').toLowerCase() === 'true';

export const createSyncDiagnosticsActions = ({
  runners = {
    createDevSampleBusinessData,
    runDevBackendDataReset,
    runDevDataReset,
  },
} = {}) => [
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
