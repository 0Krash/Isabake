import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppCard from '../../components/layout/AppCard';
import AppHeader from '../../components/layout/AppHeader';
import AppScreen from '../../components/layout/AppScreen';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import useAuthSession from '../../hooks/auth/useAuthSession';
import { capitalizeUserEntry } from '../../utils/textEntryFormat';
import {
  createAuthModeCopy,
  createAuthStatusDisplay,
  formatAuthError,
  getAuthActionMessage,
  sanitizeSessionForDisplay,
} from './authStatusModel';

export {
  createAuthModeCopy,
  createAuthStatusDisplay,
  formatAuthError,
  getAuthActionMessage,
  sanitizeSessionForDisplay,
};

export default function AuthStatusScreen({ onOpenWorkspaces } = {}) {
  const { colors } = useTransactionBalanceTheme();
  const auth = useAuthSession();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState('login');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const copy = createAuthModeCopy(mode);
  const status = createAuthStatusDisplay({
    error: auth.error,
    loading: auth.loading,
    refreshing: auth.refreshing,
    session: auth.session,
  });

  const runAuthAction = async (action, successMessage) => {
    setMessage(null);

    try {
      await action();
      setMessage(successMessage);
    } catch (error) {
      setMessage(formatAuthError(error));
    }
  };

  const submit = async () => {
    if (mode === 'register') {
      await runAuthAction(
        () => auth.register({ displayName, email, password }),
        getAuthActionMessage('register'),
      );
      return;
    }

    await runAuthAction(
      () => auth.login({ email, password }),
      getAuthActionMessage('login'),
    );
  };

  const logout = async () => {
    await runAuthAction(() => auth.logout(), getAuthActionMessage('logout'));
  };

  const verifySession = async () => {
    await runAuthAction(
      () => auth.verifySession(),
      getAuthActionMessage('verify'),
    );
  };

  const loadSessions = async () => {
    await runAuthAction(
      () => auth.loadSessions(),
      getAuthActionMessage('sessions'),
    );
  };

  return (
    <AppScreen>
      <AppHeader
        subtitle="El modo local funciona sin iniciar sesion. El sync compartido requiere una cuenta."
        title="Cuenta"
      />

      <AppCard>
        <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
          {status.title}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          {status.detail}
        </Text>
      </AppCard>

      {auth.session ? (
        <AppCard>
          <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
            Workspace activo
          </Text>
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Administra workspaces compartidos sin borrar datos locales ni
            ejecutar sync automatico.
          </Text>
          {onOpenWorkspaces ? (
            <Pressable
              disabled={auth.loading || auth.refreshing}
              onPress={onOpenWorkspaces}
              style={[styles.secondaryButton, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.secondaryText, { color: colors.textPrimary }]}
              >
                Administrar workspaces
              </Text>
            </Pressable>
          ) : null}
        </AppCard>
      ) : null}

      {auth.session ? (
        <>
          <Pressable
            disabled={auth.loading || auth.refreshing}
            onPress={verifySession}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.buttonText, { color: colors.textInverse }]}>
              Verificar sesion
            </Text>
          </Pressable>
          <Pressable
            disabled={auth.loading || auth.refreshing}
            onPress={loadSessions}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
              Ver sesiones
            </Text>
          </Pressable>
          <Pressable
            disabled={auth.loading || auth.refreshing}
            onPress={logout}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
              Cerrar sesion
            </Text>
          </Pressable>
          {auth.sessions.length ? (
            <View style={styles.sessionsList}>
              {auth.sessions.map((rawSession) => {
                const item = sanitizeSessionForDisplay({
                  ...rawSession,
                  isCurrent: rawSession.sessionId === auth.session?.sessionId,
                });

                return (
                  <View
                    key={item.sessionId}
                    style={[styles.sessionItem, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.sessionTitle, { color: colors.textPrimary }]}>
                      {item.deviceName}
                    </Text>
                    <Text style={[styles.statusText, { color: colors.textMuted }]}>
                      {item.isCurrent ? 'Esta sesion' : item.revokedAt ? 'Revocada' : 'Activa'}
                    </Text>
                    <Text style={[styles.statusText, { color: colors.textMuted }]}>
                      {item.lastUsedAt || 'Sin uso reciente'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.form}>
          <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
            {copy.title}
          </Text>
          {mode === 'register' ? (
            <TextInput
              onChangeText={(value) =>
                setDisplayName(capitalizeUserEntry(value))
              }
              placeholder="Nombre"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.textPrimary },
              ]}
              value={displayName}
            />
          ) : null}
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Correo"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.textPrimary },
            ]}
            value={email}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Contrasena"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.textPrimary },
            ]}
            value={password}
          />
          <Pressable
            disabled={auth.loading}
            onPress={submit}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.buttonText, { color: colors.textInverse }]}>
              {copy.button}
            </Text>
          </Pressable>
          <Pressable
            disabled={auth.loading}
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
              {copy.switchLabel}
            </Text>
          </Pressable>
        </View>
      )}

      {auth.error ? (
        <Text style={[styles.error, { color: colors.danger }]}>
          {formatAuthError(auth.error)}
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
  buttonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  error: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 12,
  },
  form: {
    gap: 12,
    marginTop: 18,
  },
  formTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  message: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 12,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  secondaryText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  sessionItem: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  sessionsList: {
    gap: 10,
    marginTop: 14,
  },
  sessionTitle: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  statusBox: {
    borderRadius: 8,
    marginTop: 18,
    padding: 14,
  },
  statusText: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 6,
  },
  statusTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
});
