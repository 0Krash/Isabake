import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  createSyncDiagnosticsActions,
  DEV_SYNC_GROUP_ID,
  isSyncDiagnosticsEnabled,
} from '../../data/dev/syncDiagnosticsModel';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import typography from '../../constants/TransactionBalance/Typography';

export { createSyncDiagnosticsActions, isSyncDiagnosticsEnabled };

export default function SyncDiagnosticsScreen() {
  const { colors } = useTransactionBalanceTheme();
  const enabled = isSyncDiagnosticsEnabled();
  const actions = useMemo(() => createSyncDiagnosticsActions(), []);
  const [activeAction, setActiveAction] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const runAction = async (action) => {
    setActiveAction(action.key);
    setError(null);

    try {
      const nextResult = await action.run();
      console.log('[SyncDiagnostics]', action.key, nextResult);
      setResult(nextResult);
    } catch (nextError) {
      const message = String(nextError?.message || nextError);
      console.log('[SyncDiagnostics]', action.key, { error: message });
      setError(message);
      setResult(null);
    } finally {
      setActiveAction(null);
    }
  };

  const handleActionPress = (action) => {
    if (!action.requiresConfirmation) {
      runAction(action);
      return;
    }

    if (action.key === 'deleteBackendData') {
      Alert.alert(
        'Borrar backend',
        'Esto borra la base de datos del servidor configurado para desarrollo. Afecta a todos los dispositivos conectados a esa DB. No borra SQLite local.',
        [
          {
            style: 'cancel',
            text: 'Cancelar',
          },
          {
            onPress: () => runAction(action),
            style: 'destructive',
            text: 'Borrar backend',
          },
        ],
      );
      return;
    }

    Alert.alert(
      'Borrar datos locales',
      'Esto borra la base SQLite local de este dispositivo para empezar desde cero. No borra datos del servidor.',
      [
        {
          style: 'cancel',
          text: 'Cancelar',
        },
        {
          onPress: () => runAction(action),
          style: 'destructive',
          text: 'Borrar datos',
        },
      ],
    );
  };

  if (!enabled) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.appBackground },
        ]}
      >
        <Text style={[styles.title, { color: colors.primaryText }]}>
          Herramientas dev desactivadas
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.appBackground },
      ]}
    >
      <Text style={[styles.title, { color: colors.primaryText }]}>
        Herramientas dev
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Grupo dev: {DEV_SYNC_GROUP_ID}
      </Text>

      <View style={styles.actions}>
        {actions.map((action) => {
          const loading = activeAction === action.key;

          return (
            <Pressable
              key={action.key}
              disabled={Boolean(activeAction)}
              onPress={() => handleActionPress(action)}
              style={[
                styles.button,
                {
                  backgroundColor: loading
                    ? colors.surfaceMuted
                    : action.destructive
                      ? colors.danger
                      : colors.primary,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                {loading ? 'Ejecutando...' : action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}

      <View
        style={[
          styles.resultBox,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.resultText, { color: colors.primaryText }]}>
          {result ? JSON.stringify(result, null, 2) : 'Sin resultado.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
    marginTop: 20,
  },
  button: {
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    flexGrow: 1,
    padding: 20,
  },
  error: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 16,
  },
  resultBox: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 20,
    minHeight: 240,
    padding: 12,
  },
  resultText: {
    fontFamily: 'Courier',
    fontSize: 12,
  },
  subtitle: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 4,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
});
