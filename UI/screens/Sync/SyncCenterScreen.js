import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppButton from '../../components/layout/AppButton';
import AppCard from '../../components/layout/AppCard';
import AppHeader from '../../components/layout/AppHeader';
import AppScreen from '../../components/layout/AppScreen';
import BackupStatusIndicator from '../../components/Sync/BackupStatusIndicator';
import { getBackupStatusForIndicator } from '../../components/Sync/backupStatusModel';
import {
  getAuthStatusLabel,
  getSyncCenterModeLabel,
  getSyncWarningMessage,
  getUserSafeSyncStatus,
} from '../../components/Sync/syncCenterModel';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import useSyncCenter from '../../hooks/sync/useSyncCenter';
import {
  getNetworkStatus,
  refreshNetworkStatus,
} from '../../data/network/networkStatusService';
import {
  getAutoSyncState,
  setAutoSyncEnabled,
} from '../../data/sync/autoSyncService';
import { formatWorkspaceName } from '../Workspace/workspaceUiModel';

export {
  getAuthStatusLabel,
  getSyncCenterModeLabel,
  getSyncWarningMessage,
  getUserSafeSyncStatus,
};

const getNetworkStatusLabel = (status = {}) => {
  if (status.networkState === 'backend_reachable') {
    return 'Con conexión';
  }

  if (status.networkState === 'offline') {
    return 'Sin conexión';
  }

  if (status.networkState === 'backend_unreachable') {
    return 'Servidor no disponible';
  }

  if (
    status.networkState === 'sync_url_missing' ||
    status.networkState === 'sync_url_invalid'
  ) {
    return 'Respaldo no configurado';
  }

  return 'Estado desconocido';
};

export default function SyncCenterScreen({ onOpenConflicts, onOpenHistory } = {}) {
  const { colors } = useTransactionBalanceTheme();
  const syncCenter = useSyncCenter();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [autoSyncEnabledState, setAutoSyncEnabledState] = useState(true);
  const [autoSyncState, setAutoSyncState] = useState(null);
  const [message, setMessage] = useState(null);
  const [networkStatus, setNetworkStatus] = useState(getNetworkStatus());
  const disabled = syncCenter.loading || syncCenter.syncing;
  const workspace = syncCenter.currentWorkspace;
  const isShared = Boolean(workspace?.isRemote);
  const status = getUserSafeSyncStatus({
    conflictCount: syncCenter.conflictCount,
    failedCount: syncCenter.failedCount,
    pendingCount: syncCenter.pendingCount,
  });
  const canRunSharedSync =
    isShared && syncCenter.authStatus === 'authenticated' && !disabled;
  const backupStatus = getBackupStatusForIndicator({
    authStatus: syncCenter.authStatus,
    autoSyncState,
    conflictCount: syncCenter.conflictCount,
    currentWorkspace: workspace,
    failedCount: syncCenter.failedCount,
    lastSyncState: syncCenter.lastSyncState,
    networkStatus,
    pendingCount: syncCenter.pendingCount,
    syncing: syncCenter.syncing,
  });

  const runAction = async (action, successMessage) => {
    setMessage(null);
    await action();
    setMessage(successMessage);
  };

  const refreshLocalStatus = async () => {
    const status = await refreshNetworkStatus();
    setNetworkStatus(status);
    await syncCenter.refreshStatus({ recordHistory: true });
  };

  const confirmRepairBackup = () => {
    Alert.alert(
      'Reparar respaldo',
      'Se reintentara respaldar registros locales con estado de sincronizacion incompleto. No se borraran datos locales.',
      [
        {
          style: 'cancel',
          text: 'Cancelar',
        },
        {
          onPress: () =>
            runAction(
              syncCenter.repairBackup,
              'Respaldo reparado. Sincroniza ahora para enviar los cambios.',
            ),
          text: 'Reparar',
        },
      ],
    );
  };

  useEffect(() => {
    getAutoSyncState()
      .then((state) => {
        if (state.autoSyncEnabled !== undefined) {
          setAutoSyncEnabledState(state.autoSyncEnabled);
        }
        setAutoSyncState(state);
      })
      .catch(() => {});
  }, []);

  const toggleAutoSync = async () => {
    const nextEnabled = !autoSyncEnabledState;
    setAutoSyncEnabledState(nextEnabled);
    await setAutoSyncEnabled(nextEnabled);
    setMessage(
      nextEnabled
        ? 'Sincronizacion automatica activada.'
        : 'Sincronizacion automatica desactivada.',
    );
  };

  return (
    <AppScreen>
      <AppHeader
        subtitle="Envia o recibe cambios solo cuando tu lo decidas."
        title="Respaldo y sincronizacion"
      />
      <View style={styles.headerActions}>
        <Pressable
          disabled={disabled}
          onPress={() =>
            runAction(
              refreshLocalStatus,
              'Estado actualizado.',
            )
          }
          style={[styles.smallButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
            Actualizar
          </Text>
        </Pressable>
      </View>

      <AppCard>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Negocio compartido
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {getSyncCenterModeLabel(workspace)}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {formatWorkspaceName(workspace)}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Cuenta: {getAuthStatusLabel(syncCenter.authStatus)}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Último respaldo: {syncCenter.lastSyncState?.lastSyncedAt || '-'}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Conexión: {getNetworkStatusLabel(networkStatus)}
        </Text>
      </AppCard>

      <AppCard>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Estado
        </Text>
        <BackupStatusIndicator status={backupStatus} style={styles.statusBadge} />
        <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
          {status.pendingLabel}
        </Text>
        <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
          {status.failedLabel}
        </Text>
        <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
          {status.conflictsLabel}
        </Text>
        <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
          Estado: {syncCenter.readiness?.ok ? 'listo' : 'requiere atencion'}
        </Text>
      </AppCard>

      {syncCenter.summary?.warnings?.length ? (
        <AppCard style={{ borderColor: colors.border, borderWidth: 1 }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Avisos
          </Text>
          {syncCenter.summary.warnings.map((warning) => (
            <Text
              key={warning.code}
              style={[styles.warning, { color: colors.textSecondary }]}
            >
              {getSyncWarningMessage(warning)}
            </Text>
          ))}
        </AppCard>
      ) : null}

      {!isShared ? (
        <Text style={[styles.info, { color: colors.textMuted }]}>
          El modo local no usa respaldo compartido. Puedes seguir usando la app
          offline.
        </Text>
      ) : null}

      <AppCard>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Sincronizacion automatica
        </Text>
        <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
          {autoSyncEnabledState
            ? 'Activada para workspaces compartidos cuando la app esta abierta.'
            : 'Desactivada en este dispositivo.'}
        </Text>
        {autoSyncState?.lastStatus ? (
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Último respaldo automático: {backupStatus.title}
          </Text>
        ) : null}
        <AppButton
          disabled={disabled}
          onPress={toggleAutoSync}
          variant="secondary"
        >
          {autoSyncEnabledState
            ? 'Desactivar automatico'
            : 'Activar automatico'}
        </AppButton>
      </AppCard>

      <AppCard>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Acciones
        </Text>
        <AppButton
          disabled={!canRunSharedSync}
          onPress={() =>
            runAction(syncCenter.runFullSync, 'Respaldo finalizado.')
          }
        >
          Sincronizar ahora
        </AppButton>
        <AppButton
          disabled={disabled}
          onPress={() => setAdvancedOpen((open) => !open)}
          variant="secondary"
        >
          Opciones avanzadas
        </AppButton>
        {advancedOpen ? (
          <>
            <AppButton
              disabled={!canRunSharedSync}
              onPress={() =>
                runAction(
                  syncCenter.runPush,
                  'Cambios enviados. Estado actualizado.',
                )
              }
              variant="secondary"
            >
              Enviar cambios
            </AppButton>
            <AppButton
              disabled={!canRunSharedSync}
              onPress={() =>
                runAction(
                  syncCenter.runPull,
                  'Cambios recibidos. Estado actualizado.',
                )
              }
              variant="secondary"
            >
              Recibir cambios
            </AppButton>
            <AppButton
              disabled={!canRunSharedSync}
              onPress={() =>
                runAction(
                  syncCenter.reviewBackup,
                  'Revision de respaldo finalizada.',
                )
              }
              variant="secondary"
            >
              Revisar respaldo
            </AppButton>
            <AppButton
              disabled={!canRunSharedSync}
              onPress={confirmRepairBackup}
              variant="secondary"
            >
              Reparar respaldo
            </AppButton>
          </>
        ) : null}
        {onOpenConflicts ? (
          <AppButton
            disabled={disabled}
            onPress={onOpenConflicts}
            variant="secondary"
          >
            Cambios por revisar
          </AppButton>
        ) : null}
        {onOpenHistory ? (
          <AppButton
            disabled={disabled}
            onPress={onOpenHistory}
            variant="secondary"
          >
            Historial
          </AppButton>
        ) : null}
      </AppCard>

      {syncCenter.error ? (
        <Text style={[styles.error, { color: colors.danger }]}>
          {syncCenter.error}
        </Text>
      ) : null}
      {message ? (
        <Text style={[styles.message, { color: colors.primaryText }]}>
          {message}
        </Text>
      ) : null}
      {syncCenter.integrityReport ? (
        <AppCard>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Revision de respaldo
          </Text>
          <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
            Documentos revisados: {syncCenter.integrityReport.localDocumentCount}
          </Text>
          <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
            Pendientes: {syncCenter.integrityReport.pendingOutboxCount}
          </Text>
          <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
            Problemas detectados: {syncCenter.integrityReport.issues?.length || 0}
          </Text>
          <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
            Reparables: {syncCenter.integrityReport.repairableCount || 0}
          </Text>
        </AppCard>
      ) : null}
      {syncCenter.lastRepairResult ? (
        <Text style={[styles.message, { color: colors.primaryText }]}>
          Reparados: {syncCenter.lastRepairResult.repairedCount || 0}
        </Text>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  error: {
    fontSize: typography.sizes.bodySmall,
  },
  headerActions: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  info: {
    fontSize: typography.sizes.bodySmall,
  },
  message: {
    fontSize: typography.sizes.bodySmall,
  },
  meta: {
    fontSize: typography.sizes.label,
    marginTop: 4,
  },
  secondaryText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  sectionTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  smallButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
  },
  statusBadge: {
    marginHorizontal: 0,
    marginTop: 0,
  },
  subtitle: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 4,
  },
  summaryLine: {
    fontSize: typography.sizes.bodySmall,
  },
  title: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
  warning: {
    fontSize: typography.sizes.bodySmall,
  },
});
