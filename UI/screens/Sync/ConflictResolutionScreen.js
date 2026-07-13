import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import ConflictDetailPanel from '../../components/Sync/ConflictDetailPanel';
import ConflictListItem from '../../components/Sync/ConflictListItem';
import AppCard from '../../components/layout/AppCard';
import AppHeader from '../../components/layout/AppHeader';
import AppScreen from '../../components/layout/AppScreen';
import {
  formatConflictCollection,
  getConflictKey,
  getConflictScreenState,
  groupConflictsByCollection,
} from '../../components/Sync/conflictUiModel';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import useConflicts, {
  resolveConfirmedConflict,
} from '../../hooks/sync/useConflicts';

export {
  formatConflictCollection,
  getConflictScreenState,
  groupConflictsByCollection,
};

export default function ConflictResolutionScreen() {
  const { colors } = useTransactionBalanceTheme();
  const {
    conflicts,
    detailsByKey,
    error,
    loadDetails,
    loading,
    refresh,
    resolvePreferLocal,
    resolvePreferRemote,
    summary,
  } = useConflicts();
  const [confirmAction, setConfirmAction] = useState(null);
  const [message, setMessage] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const groupedCounts = useMemo(
    () => groupConflictsByCollection(conflicts),
    [conflicts],
  );
  const screenState = getConflictScreenState({
    conflicts,
    selectedConflict,
    summary,
  });
  const selectedKey = selectedConflict ? getConflictKey(selectedConflict) : null;
  const selectedDetails = selectedKey ? detailsByKey[selectedKey] : null;

  useEffect(() => {
    if (!selectedConflict && conflicts.length > 0) {
      setSelectedConflict(conflicts[0]);
      loadDetails(conflicts[0]).catch(() => {});
    }
  }, [conflicts, loadDetails, selectedConflict]);

  const selectConflict = (conflict) => {
    setConfirmAction(null);
    setMessage(null);
    setSelectedConflict(conflict);
    loadDetails(conflict).catch(() => {});
  };

  const confirmResolution = async () => {
    if (!selectedConflict || !confirmAction) {
      return;
    }

    setResolving(true);
    setMessage(null);

    try {
      await resolveConfirmedConflict({
        action: confirmAction,
        conflict: selectedConflict,
        resolveLocal: resolvePreferLocal,
        resolveRemote: resolvePreferRemote,
      });

      if (confirmAction === 'local') {
        setMessage('Tu version quedo lista para enviarse despues.');
      } else {
        setMessage('La version compartida fue aplicada en este dispositivo.');
      }

      setConfirmAction(null);
      setSelectedConflict(null);
    } catch (nextError) {
      setMessage(String(nextError?.message || nextError));
    } finally {
      setResolving(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader
        subtitle={`${screenState.totalConflicts} pendientes`}
        title="Cambios por revisar"
      />
      <View style={styles.headerActions}>
        <Pressable
          disabled={loading}
          onPress={refresh}
          style={[styles.refreshButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.refreshText, { color: colors.textPrimary }]}>
            Actualizar
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}
      {message ? (
        <Text style={[styles.message, { color: colors.primaryText }]}>
          {message}
        </Text>
      ) : null}

      <AppCard>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Resumen
        </Text>
        <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
          Total: {screenState.totalConflicts}
        </Text>
        <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
          Usar mi version disponible: {screenState.preferLocalResolvableCount}
        </Text>
        <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
          Usar version compartida disponible:{' '}
          {screenState.preferRemoteResolvableCount}
        </Text>
        <Text style={[styles.summaryLine, { color: colors.textSecondary }]}>
          Sin version compartida: {screenState.unresolvedMissingRemoteCount}
        </Text>
        <Text
          style={[
            styles.sectionTitle,
            styles.collectionTitle,
            { color: colors.textPrimary },
          ]}
        >
          Por coleccion
        </Text>
        {Object.keys(groupedCounts).length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No hay conflictos por resolver.
          </Text>
        ) : (
          Object.entries(groupedCounts).map(([collection, count]) => (
            <Text
              key={collection}
              style={[styles.summaryLine, { color: colors.textSecondary }]}
            >
              {formatConflictCollection(collection)}: {count}
            </Text>
          ))
        )}
      </AppCard>

      {!screenState.hasConflicts ? (
        <View style={[styles.emptyState, { borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Todo limpio
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Cuando haya cambios del proyecto que necesiten decision, apareceran
            aqui.
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.list}>
            {conflicts.map((conflict) => (
              <ConflictListItem
                key={getConflictKey(conflict)}
                conflict={conflict}
                onPress={() => selectConflict(conflict)}
                selected={getConflictKey(conflict) === selectedKey}
              />
            ))}
          </View>
          <ConflictDetailPanel
            confirmAction={confirmAction}
            details={selectedDetails}
            loading={resolving}
            onCancelConfirm={() => setConfirmAction(null)}
            onConfirm={confirmResolution}
            onRequestPreferLocal={() => setConfirmAction('local')}
            onRequestPreferRemote={() => setConfirmAction('remote')}
          />
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    marginTop: 16,
  },
  emptyState: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 18,
  },
  emptyText: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 6,
  },
  emptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  error: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 12,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  list: {
    gap: 10,
  },
  message: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 12,
  },
  refreshButton: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  refreshText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  sectionTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  collectionTitle: {
    marginTop: 14,
  },
  subtitle: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 4,
  },
  summaryBox: {
    borderRadius: 8,
    marginTop: 18,
    padding: 14,
  },
  summaryLine: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 6,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
});
