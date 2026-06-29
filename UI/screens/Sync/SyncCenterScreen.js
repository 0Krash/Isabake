import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getAuthStatusLabel,
  getSyncCenterModeLabel,
} from '../../components/Sync/syncCenterModel';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import useSyncCenter from '../../hooks/sync/useSyncCenter';

export { getAuthStatusLabel, getSyncCenterModeLabel };

export default function SyncCenterScreen({ onOpenConflicts } = {}) {
  const { colors } = useTransactionBalanceTheme();
  const syncCenter = useSyncCenter();
  const [message, setMessage] = useState(null);
  const disabled = syncCenter.loading || syncCenter.syncing;
  const workspace = syncCenter.currentWorkspace;
  const isShared = Boolean(workspace?.isRemote);
  const canRunSharedSync =
    isShared && syncCenter.authStatus === 'authenticated' && !disabled;

  const runAction = async (action, successMessage) => {
    setMessage(null);
    await action();
    setMessage(successMessage);
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.screenBackground },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Sync Center
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Sync manual para el workspace compartido activo.
          </Text>
        </View>
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

      <View style={[styles.panel, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Workspace
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {getSyncCenterModeLabel(workspace)}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {workspace?.name || 'Workspace local'} · {workspace?.groupId || '-'}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Auth: {getAuthStatusLabel(syncCenter.authStatus)}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Cursor: {syncCenter.lastSyncState?.lastSyncCursor || '-'}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Ultimo sync: {syncCenter.lastSyncState?.lastSyncedAt || '-'}
        </Text>
      </View>

      <View style={[styles.panel, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Estado
        </Text>
        <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
          Pendientes: {syncCenter.pendingCount}
        </Text>
        <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
          Fallidos: {syncCenter.failedCount}
        </Text>
        <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
          Conflictos: {syncCenter.conflictCount}
        </Text>
        <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
          Readiness:{' '}
          {syncCenter.readiness?.ok ? 'lista' : 'requiere atencion'}
        </Text>
      </View>

      {syncCenter.summary?.warnings?.length ? (
        <View style={[styles.panel, { borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Avisos
          </Text>
          {syncCenter.summary.warnings.map((warning) => (
            <Text
              key={warning.code}
              style={[styles.warning, { color: colors.textSecondary }]}
            >
              {warning.code}: {warning.message}
            </Text>
          ))}
        </View>
      ) : null}

      {!isShared ? (
        <Text style={[styles.info, { color: colors.textMuted }]}>
          El modo local no usa push/pull compartido. Puedes seguir usando la app
          offline.
        </Text>
      ) : null}

      <View style={[styles.panel, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Acciones manuales
        </Text>
        <Pressable
          disabled={!canRunSharedSync}
          onPress={() =>
            runAction(syncCenter.runPush, 'Push completado. Estado actualizado.')
          }
          style={[
            styles.primaryButton,
            { backgroundColor: canRunSharedSync ? colors.primary : colors.border },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.textInverse }]}>
            Push local changes
          </Text>
        </Pressable>
        <Pressable
          disabled={!canRunSharedSync}
          onPress={() =>
            runAction(syncCenter.runPull, 'Pull completado. Estado actualizado.')
          }
          style={[
            styles.primaryButton,
            { backgroundColor: canRunSharedSync ? colors.primary : colors.border },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.textInverse }]}>
            Pull remote changes
          </Text>
        </Pressable>
        <Pressable
          disabled={!canRunSharedSync}
          onPress={() =>
            runAction(syncCenter.runFullSync, 'Sync completo finalizado.')
          }
          style={[
            styles.primaryButton,
            { backgroundColor: canRunSharedSync ? colors.primary : colors.border },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.textInverse }]}>
            Run full sync
          </Text>
        </Pressable>
        {onOpenConflicts ? (
          <Pressable
            disabled={disabled}
            onPress={onOpenConflicts}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
              Open Conflicts
            </Text>
          </Pressable>
        ) : null}
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  buttonText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  container: {
    flexGrow: 1,
    gap: 14,
    padding: 20,
  },
  error: {
    fontSize: typography.sizes.bodySmall,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
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
  panel: {
    borderRadius: 8,
    borderWidth: 0,
    gap: 10,
    padding: 14,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
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
