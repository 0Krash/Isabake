import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppButton from '../../components/layout/AppButton';
import AppCard from '../../components/layout/AppCard';
import AppHeader from '../../components/layout/AppHeader';
import AppScreen from '../../components/layout/AppScreen';
import {
  getAuthStatusLabel,
  getSyncCenterModeLabel,
  getSyncWarningMessage,
  getUserSafeSyncStatus,
} from '../../components/Sync/syncCenterModel';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import useSyncCenter from '../../hooks/sync/useSyncCenter';
import { formatWorkspaceName } from '../Workspace/workspaceUiModel';

export {
  getAuthStatusLabel,
  getSyncCenterModeLabel,
  getSyncWarningMessage,
  getUserSafeSyncStatus,
};

export default function SyncCenterScreen({ onOpenConflicts } = {}) {
  const { colors } = useTransactionBalanceTheme();
  const syncCenter = useSyncCenter();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [message, setMessage] = useState(null);
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

  const runAction = async (action, successMessage) => {
    setMessage(null);
    await action();
    setMessage(successMessage);
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
            runAction(syncCenter.refreshStatus, 'Estado actualizado.')
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
          Ultimo sync: {syncCenter.lastSyncState?.lastSyncedAt || '-'}
        </Text>
      </AppCard>

      <AppCard>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Estado
        </Text>
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
          Acciones
        </Text>
        <AppButton
          disabled={!canRunSharedSync}
          onPress={() =>
            runAction(syncCenter.runFullSync, 'Sync completo finalizado.')
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
