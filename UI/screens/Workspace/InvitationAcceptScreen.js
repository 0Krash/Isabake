import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppHeader from '../../components/layout/AppHeader';
import AppScreen from '../../components/layout/AppScreen';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import { getCurrentSession } from '../../data/auth/authService';
import {
  acceptWorkspaceInvitationByToken,
  declineWorkspaceInvitationByToken,
  loadWorkspaceInvitationPreviewByToken,
  refreshWorkspaceState,
} from '../../data/workspace/workspaceService';
import { parseInvitationLink } from '../../data/workspace/invitationLink';
import {
  formatInvitationAcceptError,
  formatInvitationPreviewStatus,
  getInvitationAcceptActionState,
  runSafeInvitationAction,
} from './invitationAcceptModel';

export default function InvitationAcceptScreen({
  client,
  initialLink,
  initialToken,
  onBackToWorkspace,
  onOpenAccount,
  session,
} = {}) {
  const { colors } = useTransactionBalanceTheme();
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState(null);
  const [input, setInput] = useState(initialLink || initialToken || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [preview, setPreview] = useState(null);
  const actionState = getInvitationAcceptActionState({
    authRequired,
    loading,
    preview,
  });

  const getToken = () => initialToken || parseInvitationLink(input).token;

  const loadPreview = async () => {
    setError(null);
    setMessage(null);
    const token = getToken();

    if (!token) {
      setError(formatInvitationAcceptError('invalid_invitation_link'));
      return null;
    }

    setLoading(true);

    try {
      const nextPreview = await loadWorkspaceInvitationPreviewByToken({
        client,
        token,
      });
      setPreview(nextPreview);
      return nextPreview;
    } catch (nextError) {
      setError(formatInvitationAcceptError(nextError));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const runAuthenticatedAction = (action, successMessage) =>
    runSafeInvitationAction({
      action,
      getToken,
      setError,
      setLoading,
      setMessage,
      successMessage,
    });

  const acceptInvitation = () =>
    runAuthenticatedAction(async (token) => {
      const result = await acceptWorkspaceInvitationByToken({
        client,
        session,
        token,
      });
      await refreshWorkspaceState({ client, session });
      return result;
    }, 'Invitacion aceptada. Sync sigue manual.');

  const declineInvitation = () =>
    runAuthenticatedAction(
      (token) =>
        declineWorkspaceInvitationByToken({
          client,
          session,
          token,
        }),
      'Invitacion rechazada.',
    );

  useEffect(() => {
    getCurrentSession()
      .then((currentSession) => {
        setAuthRequired(!currentSession);
      })
      .catch(() => {
        setAuthRequired(true);
      });
  }, []);

  useEffect(() => {
    if (initialToken || initialLink) {
      loadPreview().catch(() => {});
    }
  }, [initialLink, initialToken]);

  return (
    <AppScreen>
      <AppHeader
        subtitle="Puedes revisar la invitacion antes de iniciar sesion. Aceptarla no ejecuta sync automatico."
        title="Invitacion a workspace"
      />
      <TextInput
        autoCapitalize="none"
        onChangeText={setInput}
        placeholder="Pega el link de invitacion"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          { borderColor: colors.border, color: colors.textPrimary },
        ]}
        value={input}
      />
      <Pressable
        disabled={loading}
        onPress={loadPreview}
        style={[styles.secondaryButton, { borderColor: colors.border }]}
      >
        <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
          Ver invitacion
        </Text>
      </Pressable>

      {preview ? (
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {preview.workspace?.name || 'Workspace compartido'}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Correo: {preview.email}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Rol: {preview.role}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Estado: {formatInvitationPreviewStatus(preview.status)}
          </Text>
          {authRequired ? (
            <Text style={[styles.warning, { color: colors.danger }]}>
              Inicia sesion con el correo invitado para aceptar o rechazar esta
              invitacion.
            </Text>
          ) : null}
          {actionState.disabledReason ? (
            <Text style={[styles.warning, { color: colors.textMuted }]}>
              {actionState.disabledReason}
            </Text>
          ) : null}
          <View style={styles.row}>
            <Pressable
              disabled={!actionState.canAccept}
              onPress={acceptInvitation}
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                Aceptar
              </Text>
            </Pressable>
            <Pressable
              disabled={!actionState.canDecline}
              onPress={declineInvitation}
              style={[styles.secondaryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
                Rechazar
              </Text>
            </Pressable>
          </View>
          <Pressable disabled={loading} onPress={onOpenAccount}>
            <Text style={[styles.link, { color: colors.primary }]}>
              Iniciar sesion o cambiar cuenta
            </Text>
          </Pressable>
          <Pressable disabled={loading} onPress={onBackToWorkspace}>
            <Text style={[styles.link, { color: colors.primary }]}>
              Volver a workspaces
            </Text>
          </Pressable>
        </View>
      ) : null}
      {loading ? (
        <Text style={[styles.message, { color: colors.textMuted }]}>
          Cargando invitacion...
        </Text>
      ) : null}

      {message ? (
        <Text style={[styles.message, { color: colors.success }]}>
          {message}
        </Text>
      ) : null}
      {error ? (
        <Text style={[styles.message, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: typography.sizes.body,
  },
  buttonText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: '700',
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  link: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: '700',
  },
  message: {
    fontSize: typography.sizes.bodySmall,
  },
  panel: {
    borderRadius: 8,
    gap: 10,
    padding: 14,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: typography.sizes.subtitle,
    fontWeight: '700',
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: '800',
  },
  warning: {
    fontSize: typography.sizes.bodySmall,
  },
});
