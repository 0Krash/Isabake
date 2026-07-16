import { useCallback, useEffect, useState } from 'react';

import {
  acceptWorkspaceInvitation,
  addWorkspaceMember,
  createPrivateWorkspace,
  createRemoteWorkspace,
  createWorkspaceInvitation,
  deletePrivateWorkspace,
  deleteRemoteWorkspace,
  declineWorkspaceInvitation,
  disconnectLocalWorkspace,
  loadCachedWorkspaceDetails,
  loadCachedWorkspaceState,
  loadCachedMyWorkspaceInvitations,
  loadMyWorkspaceInvitations,
  loadWorkspaceInvitations,
  loadWorkspaceMembers,
  regenerateWorkspaceInvitationLink,
  refreshWorkspaceState,
  removeWorkspaceMember,
  revokeWorkspaceInvitation,
  selectWorkspace as selectWorkspaceService,
  updatePrivateWorkspace,
  updateRemoteWorkspace,
  updateWorkspaceMember,
} from '../../data/workspace/workspaceService';

const canManageWorkspaceInvitations = (workspace = {}) =>
  ['owner', 'admin'].includes(workspace?.workspaceRole);

export default function useWorkspaces({
  autoLoad = true,
  autoLoadRemote = true,
  client,
  includeRemoteWithoutSession = true,
  session,
} = {}) {
  const [authRequired, setAuthRequired] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(autoLoad));
  const [invitations, setInvitations] = useState([]);
  const [members, setMembers] = useState([]);
  const [myInvitations, setMyInvitations] = useState([]);
  const [remoteWorkspaces, setRemoteWorkspaces] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);

  const refreshWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await refreshWorkspaceState({
        client,
        includeRemoteWithoutSession,
        session,
      });
      setAuthRequired(Boolean(result.authRequired));
      setCurrentWorkspace(result.currentWorkspace);
      setMyInvitations(result.myInvitations || []);
      setRemoteWorkspaces(result.remoteWorkspaces || []);
      setWorkspaces(result.workspaces || []);

      if (result.authRequired && result.error) {
        setError(result.error === 'auth_required' ? 'auth_required' : null);
      }

      return result;
    } catch (nextError) {
      const message = String(nextError?.message || nextError);
      setError(message);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [client, includeRemoteWithoutSession, session]);

  const loadCachedWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await loadCachedWorkspaceState({
        includeRemoteWithoutSession,
        session,
      });
      setAuthRequired(Boolean(result.authRequired));
      setCurrentWorkspace(result.currentWorkspace);
      setMyInvitations(result.myInvitations || []);
      setRemoteWorkspaces(result.remoteWorkspaces || []);
      setWorkspaces(result.workspaces || []);

      const details = await loadCachedWorkspaceDetails(result.currentWorkspace);
      setMembers(details.members);
      setInvitations(details.invitations);
      return result;
    } catch (nextError) {
      const message = String(nextError?.message || nextError);
      setError(message);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [includeRemoteWithoutSession, session]);

  const createWorkspace = useCallback(
    async ({ name, type = 'shared' } = {}) => {
      setLoading(true);
      setError(null);

      try {
        const workspace =
          type === 'private'
            ? await createPrivateWorkspace({ name })
            : await createRemoteWorkspace({ client, name, session });
        setCurrentWorkspace(workspace);
        setMembers([]);
        setInvitations([]);
        const result = await refreshWorkspaces();
        const selected =
          result.currentWorkspace?.groupId === workspace.groupId
            ? result.currentWorkspace
            : workspace;
        setCurrentWorkspace(selected);

        if (selected?.isRemote && selected.groupId) {
          const [nextMembers, nextInvitations] = await Promise.all([
            loadWorkspaceMembers({
              client,
              groupId: selected.groupId,
              session,
            }),
            loadWorkspaceInvitations({
              client,
              groupId: selected.groupId,
              session,
            }),
          ]);
          setMembers(nextMembers);
          setInvitations(nextInvitations);
        }

        return selected;
      } catch (nextError) {
        const message = String(nextError?.message || nextError);
        setAuthRequired(message === 'auth_required');
        setError(message);
        throw nextError;
      } finally {
        setLoading(false);
      }
    },
    [client, refreshWorkspaces, session],
  );

  const selectWorkspace = useCallback(
    async (workspace) => {
      setLoading(true);
      setError(null);

      try {
        const selected = await selectWorkspaceService(workspace);
        setCurrentWorkspace(selected);
        const details = await loadCachedWorkspaceDetails(selected);
        setMembers(details.members);
        setInvitations(details.invitations);
        return selected;
      } catch (nextError) {
        const message = String(nextError?.message || nextError);
        setAuthRequired(message === 'auth_required');
        setError(message);
        throw nextError;
      } finally {
        setLoading(false);
      }
    },
    [client, session],
  );

  const refreshMembers = useCallback(
    async (workspace = currentWorkspace) => {
      if (!workspace?.isRemote || !workspace.groupId) {
        setMembers([]);
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const nextMembers = await loadWorkspaceMembers({
          client,
          groupId: workspace.groupId,
          session,
        });
        setMembers(nextMembers);
        return nextMembers;
      } catch (nextError) {
        const cachedMembers = await loadCachedWorkspaceDetails(workspace);
        setMembers(cachedMembers.members);
        const message = String(nextError?.message || nextError);
        setAuthRequired(message === 'auth_required');
        setError(message);
        return cachedMembers.members;
      } finally {
        setLoading(false);
      }
    },
    [client, currentWorkspace, session],
  );

  const refreshInvitations = useCallback(
    async (workspace = currentWorkspace) => {
      if (!workspace?.isRemote || !workspace.groupId) {
        setInvitations([]);
        return [];
      }

      if (!canManageWorkspaceInvitations(workspace)) {
        setInvitations([]);
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const nextInvitations = await loadWorkspaceInvitations({
          client,
          groupId: workspace.groupId,
          session,
        });
        setInvitations(nextInvitations);
        return nextInvitations;
      } catch (nextError) {
        const cachedDetails = await loadCachedWorkspaceDetails(workspace);
        setInvitations(cachedDetails.invitations);
        const message = String(nextError?.message || nextError);
        setAuthRequired(message === 'auth_required');
        setError(message);
        return cachedDetails.invitations;
      } finally {
        setLoading(false);
      }
    },
    [client, currentWorkspace, session],
  );

  const refreshMyInvitations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextInvitations = await loadMyWorkspaceInvitations({
        client,
        session,
      });
      setMyInvitations(nextInvitations);
      return nextInvitations;
    } catch (nextError) {
      const cachedInvitations = await loadCachedMyWorkspaceInvitations();
      setMyInvitations(cachedInvitations);
      const message = String(nextError?.message || nextError);
      setAuthRequired(message === 'auth_required');
      setError(message);
      return cachedInvitations;
    } finally {
      setLoading(false);
    }
  }, [client, session]);

  const addMember = useCallback(
    async (member) => {
      const groupId = currentWorkspace?.groupId;

      if (!groupId) {
        throw new Error('workspace_required');
      }

      await addWorkspaceMember({ client, groupId, member, session });
      return refreshMembers(currentWorkspace);
    },
    [client, currentWorkspace, refreshMembers, session],
  );

  const createInvitation = useCallback(
    async ({ email, role }) => {
      const groupId = currentWorkspace?.groupId;

      if (!groupId) {
        throw new Error('workspace_required');
      }

      await createWorkspaceInvitation({
        client,
        email,
        groupId,
        role,
        session,
      });
      return refreshInvitations(currentWorkspace);
    },
    [client, currentWorkspace, refreshInvitations, session],
  );

  const updateWorkspaceName = useCallback(
    async ({ name, workspace = currentWorkspace } = {}) => {
      const groupId = workspace?.groupId || workspace?.workspaceId;

      if (!groupId) {
        throw new Error('workspace_required');
      }

      setLoading(true);
      setError(null);

      try {
        const shouldSelectAfterRename =
          workspace?.isRemote ||
          currentWorkspace?.groupId === groupId ||
          currentWorkspace?.workspaceId === groupId;
        const nextWorkspace = workspace?.isRemote
          ? await updateRemoteWorkspace({
              client,
              groupId,
              name,
              session,
            })
          : await updatePrivateWorkspace({
              name,
              workspace,
            });
        const refreshedState = await refreshWorkspaces();

        if (shouldSelectAfterRename) {
          setCurrentWorkspace(nextWorkspace);
          return nextWorkspace;
        }

        return refreshedState.currentWorkspace || currentWorkspace;
      } catch (nextError) {
        const message = String(nextError?.message || nextError);
        setAuthRequired(message === 'auth_required');
        setError(message);
        throw nextError;
      } finally {
        setLoading(false);
      }
    },
    [client, currentWorkspace, refreshWorkspaces, session],
  );

  const revokeInvitation = useCallback(
    async (invitationId) => {
      const groupId = currentWorkspace?.groupId;

      if (!groupId) {
        throw new Error('workspace_required');
      }

      await revokeWorkspaceInvitation({
        client,
        groupId,
        invitationId,
        session,
      });
      return refreshInvitations(currentWorkspace);
    },
    [client, currentWorkspace, refreshInvitations, session],
  );

  const regenerateInvitationLink = useCallback(
    async (invitationId) => {
      const groupId = currentWorkspace?.groupId;

      if (!groupId) {
        throw new Error('workspace_required');
      }

      await regenerateWorkspaceInvitationLink({
        client,
        groupId,
        invitationId,
        session,
      });
      return refreshInvitations(currentWorkspace);
    },
    [client, currentWorkspace, refreshInvitations, session],
  );

  const acceptInvitation = useCallback(
    async (invitationId) => {
      const response = await acceptWorkspaceInvitation({
        client,
        invitationId,
        session,
      });
      const acceptedInvitation = response?.invitation || response || {};
      const acceptedGroupId =
        acceptedInvitation.groupId || acceptedInvitation.workspaceId || null;

      await refreshMyInvitations();
      const workspaceState = await refreshWorkspaces();
      const acceptedWorkspace = acceptedGroupId
        ? (workspaceState.workspaces || []).find(
            (workspace) =>
              workspace?.groupId === acceptedGroupId ||
              workspace?.workspaceId === acceptedGroupId,
          )
        : null;

      if (acceptedWorkspace) {
        return selectWorkspace(acceptedWorkspace);
      }

      return workspaceState;
    },
    [client, refreshMyInvitations, refreshWorkspaces, selectWorkspace, session],
  );

  const declineInvitation = useCallback(
    async (invitationId) => {
      await declineWorkspaceInvitation({ client, invitationId, session });
      return refreshMyInvitations();
    },
    [client, refreshMyInvitations, session],
  );

  const updateMemberRole = useCallback(
    async ({ role, status, userId }) => {
      const groupId = currentWorkspace?.groupId;

      if (!groupId) {
        throw new Error('workspace_required');
      }

      await updateWorkspaceMember({
        client,
        groupId,
        role,
        session,
        status,
        userId,
      });
      return refreshMembers(currentWorkspace);
    },
    [client, currentWorkspace, refreshMembers, session],
  );

  const removeMember = useCallback(
    async (userId) => {
      const groupId = currentWorkspace?.groupId;

      if (!groupId) {
        throw new Error('workspace_required');
      }

      await removeWorkspaceMember({ client, groupId, session, userId });
      return refreshMembers(currentWorkspace);
    },
    [client, currentWorkspace, refreshMembers, session],
  );

  const leaveWorkspace = useCallback(
    async ({ leaveRemote = true, workspace = currentWorkspace } = {}) => {
      setLoading(true);
      setError(null);

      try {
        const nextWorkspace = await disconnectLocalWorkspace({
          client,
          leaveRemote,
          session,
          workspace,
        });
        setCurrentWorkspace(nextWorkspace);
        setMembers([]);
        await refreshWorkspaces();
        return nextWorkspace;
      } catch (nextError) {
        const message = String(nextError?.message || nextError);
        setAuthRequired(message === 'auth_required');
        setError(message);
        throw nextError;
      } finally {
        setLoading(false);
      }
    },
    [client, currentWorkspace, refreshWorkspaces, session],
  );

  const deleteWorkspace = useCallback(async (workspace = currentWorkspace) => {
    const groupId = workspace?.groupId;

    if (!groupId) {
      throw new Error('workspace_required');
    }

    setLoading(true);
    setError(null);

    try {
      const nextWorkspace = workspace?.isRemote
        ? await deleteRemoteWorkspace({
            client,
            groupId,
            session,
            workspace,
          })
        : await deletePrivateWorkspace(workspace);
      setCurrentWorkspace(nextWorkspace);
      setMembers([]);
      setInvitations([]);
      await refreshWorkspaces();
      return nextWorkspace;
    } catch (nextError) {
      const message = String(nextError?.message || nextError);
      setAuthRequired(message === 'auth_required');
      setError(message);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [client, currentWorkspace, refreshWorkspaces, session]);

  useEffect(() => {
    if (autoLoad) {
      const load = autoLoadRemote ? refreshWorkspaces : loadCachedWorkspaces;

      load().catch(() => {});
    }
  }, [autoLoad, autoLoadRemote, loadCachedWorkspaces, refreshWorkspaces]);

  return {
    addMember,
    acceptInvitation,
    authRequired,
    createInvitation,
    createWorkspace,
    currentWorkspace,
    deleteWorkspace,
    declineInvitation,
    disconnectLocalWorkspace: leaveWorkspace,
    error,
    invitations,
    leaveWorkspace,
    loadCachedWorkspaces,
    loading,
    members,
    myInvitations,
    refreshInvitations,
    refreshMembers,
    refreshMyInvitations,
    refreshWorkspaces,
    remoteWorkspaces,
    regenerateInvitationLink,
    removeMember,
    revokeInvitation,
    selectWorkspace,
    updateWorkspaceName,
    updateMemberRole,
    updateMemberStatus: updateMemberRole,
    workspaces,
  };
}
