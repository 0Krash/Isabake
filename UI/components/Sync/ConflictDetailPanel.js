import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import ConflictDataPreview from './ConflictDataPreview';
import {
  getConflictResolutionState,
  getRemotePreviewData,
} from './conflictUiModel';

export { getConflictResolutionState, getRemotePreviewData };

export default function ConflictDetailPanel({
  confirmAction,
  details,
  loading,
  onCancelConfirm,
  onConfirm,
  onRequestPreferLocal,
  onRequestPreferRemote,
}) {
  const { colors } = useTransactionBalanceTheme();

  if (!details) {
    return (
      <View style={[styles.container, { borderColor: colors.border }]}>
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          Selecciona un conflicto para ver el detalle.
        </Text>
      </View>
    );
  }

  const localData = details.localData;
  const remoteData = getRemotePreviewData(details);
  const resolutionState = getConflictResolutionState(details);
  const confirmationText =
    confirmAction === 'local'
      ? 'Preferir local mantendra tus cambios y los reintentara en el siguiente sync.'
      : 'Preferir remoto reemplazara localmente los cambios sin sincronizar.';

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Detalle del conflicto
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        Base intentada: {details.attemptedBaseServerVersion || '-'} · Servidor:
        {' '}
        {details.currentServerVersion || '-'}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        Detectado: {details.rejectedAt || details.detectedAt || '-'}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        Outbox: {details.outboxEvent?.status || '-'}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        Preferir local:{' '}
        {resolutionState.resolvablePreferLocal ? 'disponible' : 'sin datos'}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        Preferir remoto:{' '}
        {resolutionState.resolvablePreferRemote ? 'disponible' : 'sin remoto'}
      </Text>
      {resolutionState.missingRemoteDocument ? (
        <Text style={[styles.warning, { color: colors.danger }]}>
          {resolutionState.remoteUnavailableMessage}
        </Text>
      ) : null}
      {resolutionState.missingLocalDocument ? (
        <Text style={[styles.warning, { color: colors.danger }]}>
          La version local no esta disponible para este conflicto.
        </Text>
      ) : null}

      <View style={styles.previewGrid}>
        <ConflictDataPreview data={localData} title="Local" />
        <ConflictDataPreview data={remoteData} title="Remoto" />
      </View>

      {confirmAction ? (
        <View style={[styles.confirmBox, { backgroundColor: colors.dangerSurface }]}>
          <Text style={[styles.confirmText, { color: colors.textPrimary }]}>
            {confirmationText}
          </Text>
          <View style={styles.actions}>
            <Pressable
              disabled={loading}
              onPress={onCancelConfirm}
              style={[styles.secondaryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
                Cancelar
              </Text>
            </Pressable>
            <Pressable
              disabled={loading}
              onPress={onConfirm}
              style={[styles.primaryButton, { backgroundColor: colors.danger }]}
            >
              <Text style={[styles.primaryText, { color: colors.textInverse }]}>
                Confirmar
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable
            disabled={loading || !resolutionState.resolvablePreferLocal}
            onPress={onRequestPreferLocal}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
              Preferir local
            </Text>
          </Pressable>
          <Pressable
            disabled={loading || !resolutionState.resolvablePreferRemote}
            onPress={onRequestPreferRemote}
            style={[
              styles.primaryButton,
              {
                backgroundColor: resolutionState.resolvablePreferRemote
                  ? colors.primary
                  : colors.border,
              },
            ]}
          >
            <Text style={[styles.primaryText, { color: colors.textInverse }]}>
              Preferir remoto
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  confirmBox: {
    borderRadius: 8,
    marginTop: 14,
    padding: 12,
  },
  confirmText: {
    fontSize: typography.sizes.bodySmall,
  },
  container: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  empty: {
    fontSize: typography.sizes.body,
  },
  meta: {
    fontSize: typography.sizes.label,
  },
  previewGrid: {
    gap: 10,
    marginTop: 10,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  title: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  warning: {
    fontSize: typography.sizes.bodySmall,
  },
});
