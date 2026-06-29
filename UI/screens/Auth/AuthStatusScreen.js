import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import useAuthSession from '../../hooks/auth/useAuthSession';
import {
  createAuthModeCopy,
  createAuthStatusDisplay,
} from './authStatusModel';

export { createAuthModeCopy, createAuthStatusDisplay };

export default function AuthStatusScreen() {
  const { colors } = useTransactionBalanceTheme();
  const auth = useAuthSession();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState('login');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const copy = createAuthModeCopy(mode);
  const status = createAuthStatusDisplay({
    loading: auth.loading,
    refreshing: auth.refreshing,
    session: auth.session,
  });

  const submit = async () => {
    setMessage(null);

    if (mode === 'register') {
      await auth.register({ displayName, email, password });
      setMessage('Cuenta creada. El sync compartido ya puede usar JWT.');
      return;
    }

    await auth.login({ email, password });
    setMessage('Sesion iniciada. El sync compartido ya puede usar JWT.');
  };

  const logout = async () => {
    await auth.logout();
    setMessage('Sesion cerrada. Los datos locales permanecen en el dispositivo.');
  };

  const verifySession = async () => {
    setMessage(null);
    await auth.verifySession();
    setMessage('Sesion verificada.');
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.screenBackground },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Cuenta
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        El modo local funciona sin iniciar sesion. El sync compartido requiere
        una cuenta.
      </Text>

      <View style={[styles.statusBox, { backgroundColor: colors.surface }]}>
        <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
          {status.title}
        </Text>
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          {status.detail}
        </Text>
      </View>

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
            onPress={logout}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
              Cerrar sesion
            </Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.form}>
          <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
            {copy.title}
          </Text>
          {mode === 'register' ? (
            <TextInput
              onChangeText={setDisplayName}
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
          {auth.error}
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
  buttonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  container: {
    flexGrow: 1,
    padding: 20,
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
  subtitle: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 6,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
});
