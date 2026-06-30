import React, { useEffect, useState } from 'react';
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
import useWorkspaces from '../../hooks/workspace/useWorkspaces';
import {
  getWorkspaceListKey,
  getWorkspaceModeLabel,
  isValidInvitationEmail,
  sanitizeInvitationForDisplay,
  sanitizeMemberForDisplay,
} from './workspaceUiModel';

const roleOptions = ['owner', 'admin', 'member', 'viewer'];
const statusOptions = ['active', 'invited', 'removed'];

export { getWorkspaceListKey, getWorkspaceModeLabel, sanitizeMemberForDisplay };

export default function WorkspaceScreen({ onOpenAccount }) {
  const { colors } = useTransactionBalanceTheme();
  const workspaceState = useWorkspaces();
  const [memberUserId, setMemberUserId] = useState('');
  const [message, setMessage] = useState(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [role, setRole] = useState('member');
  const [status, setStatus] = useState('active');
  const currentWorkspace = workspaceState.currentWorkspace;

  useEffect(() => {
    if (currentWorkspace?.isRemote) {
      workspaceState.refreshMembers(currentWorkspace).catch(() => {});
      workspaceState.refreshInvitations(currentWorkspace).catch(() => {});
    }
  }, [currentWorkspace?.groupId]);

  const runAction = async (action, successMessage) => {
    setMessage(null);
    await action();
    setMessage(successMessage);
  };

  const createWorkspace = () =>
    runAction(
      () => workspaceState.createWorkspace({ name: newWorkspaceName }),
      'Workspace compartido creado y seleccionado. Sync sigue manual.',
    );

  const disconnect = () =>
    runAction(
      () => workspaceState.disconnectLocalWorkspace({ leaveRemote: false }),
      'Modo local activado. No se elimino ningun dato local.',
    );

  const leaveWorkspace = () =>
    runAction(
      () => workspaceState.leaveWorkspace({ leaveRemote: true }),
      'Saliste del workspace compartido. Los datos locales permanecen.',
    );

  const addMember = () =>
    runAction(
      () =>
        workspaceState.addMember({
          role,
          status,
          userId: memberUserId,
        }),
      'Miembro actualizado.',
    );

  const createInvitation = () => {
    if (!isValidInvitationEmail(inviteEmail)) {
      setMessage('Correo de invitacion invalido.');
      return null;
    }

    return runAction(
      () =>
        workspaceState.createInvitation({
          email: inviteEmail,
          role: inviteRole,
        }),
      'Invitacion creada.',
    );
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
            Workspaces
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            El modo local no requiere cuenta. El workspace compartido requiere
            sesion.
          </Text>
        </View>
        {onOpenAccount ? (
          <Pressable
            onPress={onOpenAccount}
            style={[styles.smallButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
              Cuenta
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.panel, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Modo actual
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {getWorkspaceModeLabel(currentWorkspace)}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {currentWorkspace?.name || 'Workspace local'} ·{' '}
          {currentWorkspace?.groupId || 'sin grupo'}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          Rol: {currentWorkspace?.workspaceRole || 'local'}
        </Text>
      </View>

      {workspaceState.authRequired ? (
        <View style={[styles.panel, { borderColor: colors.border }]}>
          <Text style={[styles.body, { color: colors.textPrimary }]}>
            auth_required
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Inicia sesion para crear o administrar workspaces compartidos. El
            modo local sigue disponible.
          </Text>
        </View>
      ) : null}

      <View style={[styles.panel, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Crear workspace compartido
        </Text>
        <TextInput
          onChangeText={setNewWorkspaceName}
          placeholder="Nombre del workspace"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.textPrimary },
          ]}
          value={newWorkspaceName}
        />
        <Pressable
          disabled={workspaceState.loading}
          onPress={createWorkspace}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: colors.textInverse }]}>
            Crear y seleccionar
          </Text>
        </Pressable>
      </View>

      <View style={[styles.panel, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Workspaces disponibles
        </Text>
        {workspaceState.workspaces.length ? (
          workspaceState.workspaces.map((workspace) => (
            <View
              key={getWorkspaceListKey(workspace)}
              style={[styles.row, { borderColor: colors.border }]}
            >
              <View style={styles.rowText}>
                <Text style={[styles.body, { color: colors.textPrimary }]}>
                  {workspace.name}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {getWorkspaceModeLabel(workspace)} · {workspace.groupId}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {workspace.workspaceRole || workspace.syncStatus || 'local'}
                </Text>
              </View>
              <Pressable
                disabled={workspaceState.loading}
                onPress={() =>
                  runAction(
                    () => workspaceState.selectWorkspace(workspace),
                    'Workspace seleccionado. Sync sigue manual.',
                  )
                }
                style={[styles.smallButton, { borderColor: colors.border }]}
              >
                <Text
                  style={[styles.secondaryText, { color: colors.textPrimary }]}
                >
                  Seleccionar
                </Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Sin workspaces remotos disponibles.
          </Text>
        )}
        <Pressable
          disabled={workspaceState.loading}
          onPress={() => workspaceState.refreshWorkspaces()}
          style={[styles.secondaryButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
            Actualizar lista
          </Text>
        </Pressable>
        <Pressable
          disabled={workspaceState.loading}
          onPress={() =>
            runAction(
              workspaceState.refreshMyInvitations,
              'Invitaciones personales actualizadas.',
            )
          }
          style={[styles.secondaryButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
            Ver mis invitaciones
          </Text>
        </Pressable>
      </View>

      {workspaceState.myInvitations.length ? (
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Mis invitaciones
          </Text>
          {workspaceState.myInvitations.map((rawInvitation) => {
            const invitation = sanitizeInvitationForDisplay(rawInvitation);

            return (
              <View
                key={invitation.invitationId}
                style={[styles.row, { borderColor: colors.border }]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.body, { color: colors.textPrimary }]}>
                    {invitation.email}
                  </Text>
                  <Text style={[styles.meta, { color: colors.textMuted }]}>
                    {invitation.groupId} · {invitation.role} ·{' '}
                    {invitation.status}
                  </Text>
                </View>
                <View style={styles.inlineActions}>
                  <Pressable
                    disabled={workspaceState.loading}
                    onPress={() =>
                      runAction(
                        () =>
                          workspaceState.acceptInvitation(
                            invitation.invitationId,
                          ),
                        'Invitacion aceptada. Sync sigue manual.',
                      )
                    }
                    style={[styles.smallButton, { borderColor: colors.border }]}
                  >
                    <Text
                      style={[
                        styles.secondaryText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Aceptar
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={workspaceState.loading}
                    onPress={() =>
                      runAction(
                        () =>
                          workspaceState.declineInvitation(
                            invitation.invitationId,
                          ),
                        'Invitacion rechazada.',
                      )
                    }
                    style={[styles.smallButton, { borderColor: colors.border }]}
                  >
                    <Text
                      style={[
                        styles.secondaryText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Rechazar
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {currentWorkspace?.isRemote ? (
        <View style={[styles.panel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Miembros
          </Text>
          <View style={styles.memberForm}>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setInviteEmail}
              placeholder="Correo para invitar"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.textPrimary },
              ]}
              value={inviteEmail}
            />
            <View style={styles.optionRow}>
              {roleOptions
                .filter((option) => option !== 'owner')
                .map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setInviteRole(option)}
                    style={[
                      styles.option,
                      {
                        backgroundColor:
                          inviteRole === option
                            ? colors.primary
                            : colors.surfaceMuted,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color:
                            inviteRole === option
                              ? colors.textInverse
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
            </View>
            <Pressable
              disabled={workspaceState.loading || !inviteEmail}
              onPress={createInvitation}
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                Invitar por correo
              </Text>
            </Pressable>

            {workspaceState.invitations.map((rawInvitation) => {
              const invitation = sanitizeInvitationForDisplay(rawInvitation);

              return (
                <View
                  key={invitation.invitationId}
                  style={[styles.row, { borderColor: colors.border }]}
                >
                  <View style={styles.rowText}>
                    <Text style={[styles.body, { color: colors.textPrimary }]}>
                      {invitation.email}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      {invitation.role} · {invitation.status}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      Link:{' '}
                      {invitation.inviteTokenExpiresAt
                        ? `activo hasta ${invitation.inviteTokenExpiresAt}`
                        : 'no disponible'}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      Email:{' '}
                      {invitation.emailDelivery
                        ? `${invitation.emailDelivery.status} (${invitation.emailDelivery.provider})`
                        : 'sin estado'}
                    </Text>
                  </View>
                  <View style={styles.inlineActions}>
                    <Pressable
                      disabled={workspaceState.loading}
                      onPress={() =>
                        runAction(
                          () =>
                            workspaceState.regenerateInvitationLink(
                              invitation.invitationId,
                            ),
                          'Link de invitacion regenerado.',
                        )
                      }
                      style={[styles.smallButton, { borderColor: colors.border }]}
                    >
                      <Text
                        style={[
                          styles.secondaryText,
                          { color: colors.textPrimary },
                        ]}
                      >
                        Regenerar
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={workspaceState.loading}
                      onPress={() =>
                        runAction(
                          () =>
                            workspaceState.revokeInvitation(
                              invitation.invitationId,
                            ),
                          'Invitacion revocada.',
                        )
                      }
                      style={[styles.smallButton, { borderColor: colors.border }]}
                    >
                      <Text
                        style={[
                          styles.secondaryText,
                          { color: colors.textPrimary },
                        ]}
                      >
                        Revocar
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            <TextInput
              autoCapitalize="none"
              onChangeText={setMemberUserId}
              placeholder="userId o correo"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.textPrimary },
              ]}
              value={memberUserId}
            />
            <View style={styles.optionRow}>
              {roleOptions.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setRole(option)}
                  style={[
                    styles.option,
                    {
                      backgroundColor:
                        role === option ? colors.primary : colors.surfaceMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color:
                          role === option
                            ? colors.textInverse
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.optionRow}>
              {statusOptions.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setStatus(option)}
                  style={[
                    styles.option,
                    {
                      backgroundColor:
                        status === option
                          ? colors.primary
                          : colors.surfaceMuted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color:
                          status === option
                            ? colors.textInverse
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              disabled={workspaceState.loading || !memberUserId}
              onPress={addMember}
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                Agregar o actualizar
              </Text>
            </Pressable>
          </View>

          {workspaceState.members.map((rawMember) => {
            const member = sanitizeMemberForDisplay(rawMember);

            return (
              <View
                key={member.userId}
                style={[styles.row, { borderColor: colors.border }]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.body, { color: colors.textPrimary }]}>
                    {member.userId}
                  </Text>
                  <Text style={[styles.meta, { color: colors.textMuted }]}>
                    {member.role} · {member.status}
                  </Text>
                </View>
                <Pressable
                  disabled={workspaceState.loading}
                  onPress={() =>
                    runAction(
                      () => workspaceState.removeMember(member.userId),
                      'Miembro removido.',
                    )
                  }
                  style={[styles.smallButton, { borderColor: colors.border }]}
                >
                  <Text
                    style={[styles.secondaryText, { color: colors.textPrimary }]}
                  >
                    Remover
                  </Text>
                </Pressable>
              </View>
            );
          })}

          <Pressable
            disabled={workspaceState.loading}
            onPress={disconnect}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
              Desconectar localmente
            </Text>
          </Pressable>
          <Pressable
            disabled={workspaceState.loading}
            onPress={leaveWorkspace}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
              Salir del workspace
            </Text>
          </Pressable>
        </View>
      ) : null}

      {workspaceState.error ? (
        <Text style={[styles.error, { color: colors.danger }]}>
          {workspaceState.error}
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
  input: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  memberForm: {
    gap: 10,
  },
  inlineActions: {
    gap: 8,
  },
  message: {
    fontSize: typography.sizes.bodySmall,
  },
  meta: {
    fontSize: typography.sizes.label,
    marginTop: 4,
  },
  option: {
    borderRadius: 8,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
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
  row: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    padding: 10,
  },
  rowText: {
    flex: 1,
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
  title: {
    fontSize: typography.sizes.heading,
    fontWeight: typography.weights.bold,
  },
});
