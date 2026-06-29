import { useCallback, useEffect, useState } from 'react';

import {
  addWorkspaceMember,
  createRemoteWorkspace,
  disconnectLocalWorkspace,
  loadWorkspaceMembers,
  refreshWorkspaceState,
  removeWorkspaceMember,
  selectWorkspace as selectWorkspaceService,
  updateWorkspaceMember,
} from '../../data/workspace/workspaceService';

export default function useWorkspaces({ autoLoad = true, client, session } = {}) {
  const [authRequired, setAuthRequired] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(autoLoad));
  const [members, setMembers] = useState([]);
  const [remoteWorkspaces, setRemoteWorkspaces] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);

  const refreshWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await refreshWorkspaceState({ client, session });
      setAuthRequired(Boolean(result.authRequired));
      setCurrentWorkspace(result.currentWorkspace);
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
  }, [client, session]);

  const createWorkspace = useCallback(
    async ({ name } = {}) => {
      setLoading(true);
      setError(null);

      try {
        const workspace = await createRemoteWorkspace({ client, name, session });
        setCurrentWorkspace(workspace);
        await refreshWorkspaces();
        return workspace;
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

  const selectWorkspace = useCallback(async (workspace) => {
    setLoading(true);
    setError(null);

    try {
      const selected = await selectWorkspaceService(workspace);
      setCurrentWorkspace(selected);
      return selected;
    } catch (nextError) {
      const message = String(nextError?.message || nextError);
      setError(message);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

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
        const message = String(nextError?.message || nextError);
        setAuthRequired(message === 'auth_required');
        setError(message);
        throw nextError;
      } finally {
        setLoading(false);
      }
    },
    [client, currentWorkspace, session],
  );

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
    async ({ leaveRemote = true } = {}) => {
      setLoading(true);
      setError(null);

      try {
        const workspace = await disconnectLocalWorkspace({
          client,
          leaveRemote,
          session,
          workspace: currentWorkspace,
        });
        setCurrentWorkspace(workspace);
        setMembers([]);
        await refreshWorkspaces();
        return workspace;
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

  useEffect(() => {
    if (autoLoad) {
      refreshWorkspaces().catch(() => {});
    }
  }, [autoLoad, refreshWorkspaces]);

  return {
    addMember,
    authRequired,
    createWorkspace,
    currentWorkspace,
    disconnectLocalWorkspace: leaveWorkspace,
    error,
    leaveWorkspace,
    loading,
    members,
    refreshMembers,
    refreshWorkspaces,
    remoteWorkspaces,
    removeMember,
    selectWorkspace,
    updateMemberRole,
    updateMemberStatus: updateMemberRole,
    workspaces,
  };
}
