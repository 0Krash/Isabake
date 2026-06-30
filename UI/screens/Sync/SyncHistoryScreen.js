import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatSyncHistoryAction,
  formatSyncHistoryCounts,
  formatSyncHistoryPending,
  formatSyncHistoryStatus,
  getSyncHistoryStatusTone,
  sanitizeSyncHistoryDisplayText,
} from '../../components/Sync/syncHistoryModel';
import AppCard from '../../components/layout/AppCard';
import AppHeader from '../../components/layout/AppHeader';
import AppScreen from '../../components/layout/AppScreen';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import { getRecentSyncHistory } from '../../data/sync/syncHistoryService';

export {
  formatSyncHistoryAction,
  formatSyncHistoryCounts,
  formatSyncHistoryPending,
  formatSyncHistoryStatus,
};

export default function SyncHistoryScreen({ onBack } = {}) {
  const { colors } = useTransactionBalanceTheme();
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState(null);

  const loadHistory = async () => {
    setError(null);
    setLoading(true);

    try {
      setHistory(await getRecentSyncHistory({ limit: 25 }));
    } catch (nextError) {
      setError('No se pudo cargar el historial de sync.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory().catch(() => {});
  }, []);

  return (
    <AppScreen>
      <AppHeader
        actionLabel={onBack ? 'Volver' : null}
        onAction={onBack}
        subtitle="Registro local y seguro de intentos manuales de sincronizacion."
        title="Historial de sync"
      />

      <View style={styles.actions}>
        <Pressable
          disabled={loading}
          onPress={loadHistory}
          style={[styles.secondaryButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
            Actualizar
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Cargando historial...
        </Text>
      ) : null}

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}

      {!loading && !history.length ? (
        <AppCard>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Sin actividad
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Los intentos manuales de sync apareceran aqui. Abrir esta pantalla
            no ejecuta sincronizacion.
          </Text>
        </AppCard>
      ) : null}

      {history.map((record) => {
        const expanded = selectedRunId === record.runId;
        const tone = getSyncHistoryStatusTone(record.status);
        const statusColor =
          tone === 'success'
            ? colors.success
            : tone === 'danger'
              ? colors.danger
              : colors.textMuted;

        return (
          <AppCard key={record.id}>
            <Pressable
              onPress={() =>
                setSelectedRunId((current) =>
                  current === record.runId ? null : record.runId,
                )
              }
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {formatSyncHistoryAction(record.actionType)}
              </Text>
              <Text style={[styles.status, { color: statusColor }]}>
                {formatSyncHistoryStatus(record.status)}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {record.workspaceName || 'Workspace local'} ·{' '}
                {record.startedAt || '-'}
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {formatSyncHistoryCounts(record)}
              </Text>
            </Pressable>

            {expanded ? (
              <View style={styles.details}>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {formatSyncHistoryPending(record)}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  Duracion:{' '}
                  {record.durationMs === null || record.durationMs === undefined
                    ? '-'
                    : `${record.durationMs} ms`}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  Inicio: {record.startedAt || '-'}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  Fin: {record.finishedAt || '-'}
                </Text>
                {record.safeErrorMessage ? (
                  <Text style={[styles.error, { color: colors.danger }]}>
                    {sanitizeSyncHistoryDisplayText(record.safeErrorMessage)}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </AppCard>
        );
      })}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'flex-end',
  },
  details: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingTop: 8,
  },
  error: {
    fontSize: typography.sizes.bodySmall,
  },
  meta: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 4,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
  },
  secondaryText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  sectionTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  status: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
    marginTop: 6,
  },
});
