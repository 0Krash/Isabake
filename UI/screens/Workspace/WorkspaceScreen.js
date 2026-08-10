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
  getInvitationAttentionKey,
  isInvitationAttentionSeen,
  markInvitationAttentionSeen,
} from '../../data/workspace/invitationAttentionState';
import useAuthSession from '../../hooks/auth/useAuthSession';
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

export default function WorkspaceScreen({ onBack, onOpenAccount }) {
  const { colors } = useTransactionBalanceTheme();
  const auth = useAuthSession();
  const workspaceState = useWorkspaces({
    autoLoad: !auth.loading,
    autoLoadRemote: false,
    includeRemoteWithoutSession: false,
    session: auth.session,
  });
  const [activeTab, setActiveTab] = useState('workspaces');
  const [message, setMessage] = useState(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceType, setNewWorkspaceType] = useState('private');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState('');
  const [workspaceMenuKey, setWorkspaceMenuKey] = useState(null);
  const [visitedInvitationAttentionKey, setVisitedInvitationAttentionKey] =
    useState('');
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
    workspaceState.myInvitations.length > 0 &&
    !isInvitationAttentionSeen(workspaceState.myInvitations);
  const invitationAttentionKey = getInvitationAttentionKey(
    workspaceState.myInvitations,
  );
  const authRequiredMessage = formatWorkspaceError('auth_required');
  const workspaceErrorMessage = workspaceState.error
    ? formatWorkspaceError(workspaceState.error)
    : null;
  const visibleWorkspaceError =
    !auth.session ||
    workspaceState.authRequired && workspaceErrorMessage === authRequiredMessage
      ? null
      : workspaceErrorMessage;
  const visibleMessage =
    message &&
    message !== visibleWorkspaceError &&
    !(workspaceState.authRequired && message === authRequiredMessage)
      ? message
      : null;

  useEffect(() => {
    setWorkspaceNameDraft(currentWorkspace?.name || '');
  }, [currentWorkspace?.groupId, currentWorkspace?.name]);

  useEffect(() => {
    if (auth.loading || !auth.session) {
      return;
    }

    workspaceState.refreshMyInvitations().catch(() => {});
  }, [auth.loading, auth.session, workspaceState.refreshMyInvitations]);

  useEffect(() => {
    if (activeTab === 'invitations' && showInvitationAttention) {
      setVisitedInvitationAttentionKey(invitationAttentionKey);
      return;
    }

    if (
      activeTab !== 'invitations' &&
      visitedInvitationAttentionKey &&
      invitationAttentionKey === visitedInvitationAttentionKey
    ) {
      markInvitationAttentionSeen(workspaceState.myInvitations);
      setVisitedInvitationAttentionKey('');
      return;
    }

    if (
      visitedInvitationAttentionKey &&
      invitationAttentionKey !== visitedInvitationAttentionKey
    ) {
      setVisitedInvitationAttentionKey('');
    }
  }, [
    activeTab,
    invitationAttentionKey,
    showInvitationAttention,
    visitedInvitationAttentionKey,
    workspaceState.myInvitations,
  ]);

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
  }, [
    activeTab,
    canAdminWorkspace,
    currentWorkspace?.groupId,
    currentWorkspace?.isRemote,
    currentWorkspace?.workspaceRole,
  ]);

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
        if (workspaceMenuKey) {
          setWorkspaceMenuKey(null);
          return true;
        }

        onBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, [onBack, workspaceMenuKey]);

  const runAction = async (action) => {
    setMessage(null);

    try {
      const result = await action();
      return { ok: true, result };
    } catch (error) {
      const nextMessage = formatWorkspaceError(error);
      setMessage(nextMessage);
      return { error, message: nextMessage, ok: false };
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
      const nextMessage =
        formState.error || 'Agrega un nombre para el negocio.';
      setMessage(nextMessage);
      return { message: nextMessage, ok: false };
    }

    if (newWorkspaceType === 'shared' && !auth.session) {
      const nextMessage =
        'Inicia sesion para crear negocios compartidos. Puedes crear negocios privados sin cuenta.';
      return { message: nextMessage, reason: 'account_required', ok: false };
    }

    const result = await runAction(
      () =>
        workspaceState.createWorkspace({
          name: formState.normalizedName,
          type: newWorkspaceType,
        }),
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
      const nextMessage =
        formState.error || 'Agrega un nombre para el negocio.';
      setMessage(nextMessage);
      return { message: nextMessage, ok: false };
    }

    const result = await runAction(
      () =>
        workspaceState.updateWorkspaceName({
          name: formState.normalizedName,
          workspace,
        }),
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
            runAction(() => workspaceState.revokeInvitation(invitationId)),
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
    );

  const deleteCurrentWorkspace = (workspace = currentWorkspace) =>
    runAction(() => workspaceState.deleteWorkspace(workspace));

  const removeMember = (member) => {
    const userId = member?.userId || member;

    return runAction(() => workspaceState.removeMember(userId));
  };

  const selectWorkspace = async (workspace) => {
    return runAction(() => workspaceState.selectWorkspace(workspace));
  };

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      onRefresh={handlePullToSync}
      refreshing={refreshing || workspaceState.loading}
    >
      {activeTab === 'workspaces' && workspaceMenuKey ? (
        <Pressable
          accessibilityLabel="Cerrar menu de negocio"
          onPress={() => setWorkspaceMenuKey(null)}
          style={styles.screenDismissLayer}
        />
      ) : null}
      <AppHeader
        subtitle="Organiza equipo, accesos e invitaciones."
        title="Administrar negocios"
      />

      <BusinessContextCard
        colors={colors}
        role={currentRole}
        workspace={currentWorkspace}
      />

      <BusinessShareTabs
        activeTab={activeTab}
        colors={colors}
        onChange={setActiveTab}
        showInvitationAttention={showInvitationAttention}
      />

      {activeTab === 'team' ? (
        <TeamTab
          canAdminWorkspace={Boolean(
            currentWorkspace?.isRemote && canAdminWorkspace,
          )}
          colors={colors}
          currentWorkspace={currentWorkspace}
          isLocalWorkspace={!currentWorkspace?.isRemote}
          loading={workspaceState.loading}
          members={visibleMembers}
          onInviteUser={() => setActiveTab('invitations')}
          onLeaveWorkspace={leaveCurrentWorkspace}
          onRemove={removeMember}
          onUpdateRole={(userId, nextRole) =>
            runAction(() =>
              workspaceState.updateMemberRole({
                role: nextRole,
                userId,
              }),
            )
          }
          role={currentRole}
        />
      ) : null}

      {activeTab === 'invitations' ? (
        <InvitationsTab
          canAdminWorkspace={Boolean(
            currentWorkspace?.isRemote && canAdminWorkspace,
          )}
          colors={colors}
          inviteEmail={inviteEmail}
          inviteRole={inviteRole}
          invitations={workspaceState.myInvitations}
          loading={workspaceState.loading}
          members={visibleMembers}
          onAccept={(invitationId) =>
            runAction(() => workspaceState.acceptInvitation(invitationId))
          }
          onCreateInvitation={createInvitation}
          onDecline={(invitationId) =>
            runAction(() => workspaceState.declineInvitation(invitationId))
          }
          onRegenerate={(invitationId) =>
            runAction(() => workspaceState.regenerateInvitationLink(invitationId))
          }
          onRevoke={confirmRevokeInvitation}
          onSetInviteEmail={setInviteEmail}
          onSetInviteRole={setInviteRole}
          outgoingInvitations={workspaceState.invitations}
        />
      ) : null}

      {activeTab === 'workspaces' ? (
        <WorkspacesTab
          authRequired={workspaceState.authRequired}
          hasAccountSession={Boolean(auth.session)}
          colors={colors}
          currentWorkspace={currentWorkspace}
          loading={workspaceState.loading}
          members={visibleMembers}
          newWorkspaceName={newWorkspaceName}
          newWorkspaceType={newWorkspaceType}
          onCreateWorkspace={createWorkspace}
          onDeleteWorkspace={deleteCurrentWorkspace}
          onLeave={leaveCurrentWorkspace}
          onOpenAccount={onOpenAccount}
          onRenameWorkspace={updateWorkspaceName}
          onSelectWorkspace={selectWorkspace}
          onSetNewWorkspaceName={setNewWorkspaceName}
          onSetNewWorkspaceType={setNewWorkspaceType}
          onSetWorkspaceMenuKey={setWorkspaceMenuKey}
          onSetWorkspaceNameDraft={setWorkspaceNameDraft}
          workspaceMenuKey={workspaceMenuKey}
          workspaceNameDraft={workspaceNameDraft}
          workspaces={visibleWorkspaces}
        />
      ) : null}

      {visibleWorkspaceError ? (
        <Text style={[styles.error, { color: colors.danger }]}>
          {visibleWorkspaceError}
        </Text>
      ) : null}
      {visibleMessage ? (
        <Text style={[styles.message, { color: colors.primaryText }]}>
          {visibleMessage}
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
