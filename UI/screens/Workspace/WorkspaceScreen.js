import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppHeader from '../../components/layout/AppHeader';
import AppScreen from '../../components/layout/AppScreen';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import { refreshNetworkStatus } from '../../data/network/networkStatusService';
import {
  isInvitationAttentionSeen,
  markInvitationAttentionSeen,
} from '../../data/workspace/invitationAttentionState';
import useWorkspaces from '../../hooks/workspace/useWorkspaces';
import {
  BusinessContextCard,
  BusinessShareTabs,
  InvitationsTab,
  TeamTab,
  WorkspacesTab,
} from './WorkspaceScreenParts';
import {
  dedupeWorkspaceDisplayList,
  formatWorkspaceError,
  getInvitationFormState,
  getVisibleMembersForDisplay,
  getWorkspaceListKey,
  getWorkspaceModeLabel,
  getWorkspaceNameFormState,
} from './workspaceUiModel';

const adminRoles = new Set(['owner', 'admin']);

export { getWorkspaceListKey, getWorkspaceModeLabel };

export default function WorkspaceScreen({ onBack }) {
  const { colors } = useTransactionBalanceTheme();
  const workspaceState = useWorkspaces();
  const [activeTab, setActiveTab] = useState('team');
  const [message, setMessage] = useState(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState('');
  const [workspaceMenuKey, setWorkspaceMenuKey] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const currentWorkspace = workspaceState.currentWorkspace;
  const currentRole = currentWorkspace?.workspaceRole || 'local';
  const canAdminWorkspace = adminRoles.has(currentRole);
  const visibleMembers = getVisibleMembersForDisplay(workspaceState.members);
  const visibleWorkspaces = dedupeWorkspaceDisplayList(
    workspaceState.workspaces,
    currentWorkspace,
  );
  const showInvitationAttention =
    activeTab !== 'invitations' &&
    workspaceState.myInvitations.length > 0 &&
    !isInvitationAttentionSeen(workspaceState.myInvitations);

  useEffect(() => {
    if (!currentWorkspace?.isRemote || !currentWorkspace.groupId) {
      return;
    }

    if (activeTab === 'team') {
      workspaceState.refreshMembers(currentWorkspace).catch(() => {});
      return;
    }

    if (activeTab === 'invitations') {
      workspaceState.refreshMyInvitations().catch(() => {});
      workspaceState.refreshMembers(currentWorkspace).catch(() => {});

      if (canAdminWorkspace) {
        workspaceState.refreshInvitations(currentWorkspace).catch(() => {});
      }
    }
  }, [activeTab, canAdminWorkspace, currentWorkspace?.groupId]);

  useEffect(() => {
    setWorkspaceNameDraft(currentWorkspace?.name || '');
  }, [currentWorkspace?.groupId, currentWorkspace?.name]);

  useEffect(() => {
    if (activeTab === 'invitations' && workspaceState.myInvitations.length) {
      markInvitationAttentionSeen(workspaceState.myInvitations);
    }
  }, [activeTab, workspaceState.myInvitations]);

  useEffect(() => {
    if (activeTab !== 'workspaces') {
      setWorkspaceMenuKey(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!onBack) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onBack]);

  const runAction = async (action, successMessage) => {
    setMessage(null);

    try {
      const result = await action();
      setMessage(successMessage);
      return { ok: true, result };
    } catch (error) {
      setMessage(formatWorkspaceError(error));
      return { error, ok: false };
    }
  };

  const handlePullToSync = useCallback(async () => {
    setRefreshing(true);
    setMessage(null);

    try {
      const [workspaceResult] = await Promise.all([
        workspaceState.refreshWorkspaces(),
        refreshNetworkStatus(),
      ]);
      const nextWorkspace =
        workspaceResult?.currentWorkspace || workspaceState.currentWorkspace;

      if (nextWorkspace?.isRemote) {
        await Promise.allSettled([
          workspaceState.refreshMembers(nextWorkspace),
          workspaceState.refreshInvitations(nextWorkspace),
        ]);
      }

      setMessage('Compartir proyecto actualizado.');
    } catch (error) {
      setMessage(formatWorkspaceError(error));
    } finally {
      setRefreshing(false);
    }
  }, [workspaceState]);

  const createWorkspace = async () => {
    const formState = getWorkspaceNameFormState({
      existingWorkspaces: workspaceState.workspaces,
      name: newWorkspaceName,
    });

    if (!formState.canSubmit) {
      setMessage(formState.error || 'Agrega un nombre para el proyecto.');
      return null;
    }

    const result = await runAction(
      () => workspaceState.createWorkspace({ name: formState.normalizedName }),
      'Proyecto compartido creado y seleccionado. Sync sigue manual.',
    );

    if (result.ok) {
      setNewWorkspaceName('');
    }

    return result;
  };

  const updateWorkspaceName = async (workspace = currentWorkspace) => {
    const currentKey = getWorkspaceListKey(workspace || {});
    const formState = getWorkspaceNameFormState({
      existingWorkspaces: workspaceState.workspaces,
      name: workspaceNameDraft,
      workspaceId: currentKey,
    });

    if (!formState.canSubmit) {
      setMessage(formState.error || 'Agrega un nombre para el proyecto.');
      return null;
    }

    const result = await runAction(
      () =>
        workspaceState.updateWorkspaceName({
          name: formState.normalizedName,
          workspace,
        }),
      'Nombre del proyecto actualizado.',
    );

    if (result.ok) {
      setWorkspaceNameDraft(formState.normalizedName);
    }

    return result;
  };

  const createInvitation = async () => {
    const formState = getInvitationFormState({
      email: inviteEmail,
      existingInvitations: workspaceState.invitations,
      existingMembers: visibleMembers,
    });

    if (!formState.canSubmit) {
      setMessage(formState.error || 'Correo de invitacion invalido.');
      return null;
    }

    const result = await runAction(
      () =>
        workspaceState.createInvitation({
          email: formState.normalizedEmail,
          role: inviteRole,
        }),
      'Invitacion creada.',
    );

    if (result.ok) {
      setInviteEmail('');
    }

    return result;
  };

  const confirmRevokeInvitation = (invitationId) => {
    Alert.alert(
      'Revocar invitacion',
      'La persona invitada ya no podra aceptar esta invitacion.',
      [
        { style: 'cancel', text: 'Cancelar' },
        {
          onPress: () =>
            runAction(
              () => workspaceState.revokeInvitation(invitationId),
              'Invitacion revocada.',
            ),
          style: 'destructive',
          text: 'Revocar',
        },
      ],
    );
  };

  const leaveCurrentWorkspace = (workspace = currentWorkspace) =>
    runAction(
      () =>
        workspaceState.leaveWorkspace({
          leaveRemote: true,
          workspace,
        }),
      'Saliste del proyecto compartido. Los datos locales permanecen.',
    );

  const deleteCurrentWorkspace = (workspace = currentWorkspace) =>
    runAction(
      () => workspaceState.deleteWorkspace(workspace),
      'Proyecto eliminado. Volviste al workspace local.',
    );

  const confirmRemoveMember = (member) => {
    const userId = member?.userId || member;
    const isCurrentUser = Boolean(member?.isCurrentUser);
    const isOwner = member?.roleKey === 'owner';

    Alert.alert(
      isCurrentUser ? 'Salir del proyecto compartido' : 'Remover colaborador',
      isCurrentUser && isOwner
        ? 'Perderas acceso a este proyecto compartido. Si eres el unico propietario, antes debes asignar un nuevo propietario.'
        : isCurrentUser
          ? 'Perderas acceso a este proyecto compartido y dejara de aparecer en tu lista de proyectos.'
          : 'Esta persona perdera acceso a este proyecto compartido.',
      [
        { style: 'cancel', text: 'Cancelar' },
        {
          onPress: () =>
            runAction(
              () =>
                isCurrentUser
                  ? workspaceState.leaveWorkspace({ leaveRemote: true })
                  : workspaceState.removeMember(userId),
              isCurrentUser
                ? 'Saliste del proyecto compartido.'
                : 'Colaborador removido.',
            ),
          style: 'destructive',
          text: isCurrentUser ? 'Salir' : 'Remover',
        },
      ],
    );
  };

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      onRefresh={handlePullToSync}
      refreshing={refreshing || workspaceState.loading}
    >
      {activeTab === 'workspaces' && workspaceMenuKey ? (
        <Pressable
          accessibilityLabel="Cerrar menu de proyecto"
          onPress={() => setWorkspaceMenuKey(null)}
          style={styles.screenDismissLayer}
        />
      ) : null}
      <AppHeader
        subtitle="Usuarios, invitaciones y espacios de trabajo."
        title="Compartir proyecto"
      />

      <BusinessContextCard
        colors={colors}
        onChangeWorkspace={() => setActiveTab('workspaces')}
        role={currentRole}
        workspace={currentWorkspace}
      />

      {workspaceState.authRequired ? (
        <View style={[styles.notice, { borderColor: colors.border }]}>
          <Text style={[styles.body, { color: colors.textPrimary }]}>
            Cuenta requerida
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Inicia sesion para crear o administrar proyectos compartidos. El
            modo local sigue disponible.
          </Text>
        </View>
      ) : null}

      <BusinessShareTabs
        activeTab={activeTab}
        colors={colors}
        onChange={setActiveTab}
        showInvitationAttention={showInvitationAttention}
      />

      {activeTab === 'team' ? (
        <TeamTab
          canAdminWorkspace={Boolean(currentWorkspace?.isRemote && canAdminWorkspace)}
          colors={colors}
          isLocalWorkspace={!currentWorkspace?.isRemote}
          loading={workspaceState.loading}
          members={visibleMembers}
          onInviteUser={() => setActiveTab('invitations')}
          onRemove={confirmRemoveMember}
          onUpdateRole={(userId, nextRole) =>
            runAction(
              () =>
                workspaceState.updateMemberRole({
                  role: nextRole,
                  userId,
                }),
              'Rol de usuario actualizado.',
            )
          }
          role={currentRole}
        />
      ) : null}

      {activeTab === 'invitations' ? (
        <InvitationsTab
          canAdminWorkspace={Boolean(currentWorkspace?.isRemote && canAdminWorkspace)}
          colors={colors}
          inviteEmail={inviteEmail}
          inviteRole={inviteRole}
          invitations={workspaceState.myInvitations}
          loading={workspaceState.loading}
          members={visibleMembers}
          onAccept={(invitationId) =>
            runAction(
              () => workspaceState.acceptInvitation(invitationId),
              'Invitacion aceptada. Sync sigue manual.',
            )
          }
          onCreateInvitation={createInvitation}
          onDecline={(invitationId) =>
            runAction(
              () => workspaceState.declineInvitation(invitationId),
              'Invitacion rechazada.',
            )
          }
          onRegenerate={(invitationId) =>
            runAction(
              () => workspaceState.regenerateInvitationLink(invitationId),
              'Invitacion reenviada si el proveedor esta configurado.',
            )
          }
          onRevoke={confirmRevokeInvitation}
          onSetInviteEmail={setInviteEmail}
          onSetInviteRole={setInviteRole}
          outgoingInvitations={workspaceState.invitations}
        />
      ) : null}

      {activeTab === 'workspaces' ? (
        <WorkspacesTab
          colors={colors}
          currentWorkspace={currentWorkspace}
          loading={workspaceState.loading}
          members={visibleMembers}
          newWorkspaceName={newWorkspaceName}
          onCreateWorkspace={createWorkspace}
          onDeleteWorkspace={deleteCurrentWorkspace}
          onLeave={leaveCurrentWorkspace}
          onRefreshMembers={workspaceState.refreshMembers}
          onRenameWorkspace={updateWorkspaceName}
          onSelectWorkspace={(workspace) =>
            runAction(
              () => workspaceState.selectWorkspace(workspace),
              'Proyecto seleccionado. Sync sigue manual.',
            )
          }
          onSetNewWorkspaceName={setNewWorkspaceName}
          onSetWorkspaceMenuKey={setWorkspaceMenuKey}
          onSetWorkspaceNameDraft={setWorkspaceNameDraft}
          workspaceMenuKey={workspaceMenuKey}
          workspaceNameDraft={workspaceNameDraft}
          workspaces={visibleWorkspaces}
        />
      ) : null}

      {workspaceState.error ? (
        <Text style={[styles.error, { color: colors.danger }]}>
          {formatWorkspaceError(workspaceState.error)}
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
  message: {
    fontSize: typography.sizes.bodySmall,
  },
  meta: {
    fontSize: typography.sizes.label,
    marginTop: 4,
  },
  notice: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  screenContent: {
    paddingBottom: 88,
    position: 'relative',
  },
  screenDismissLayer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
});
