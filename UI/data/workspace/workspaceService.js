import { createAuthApiClient } from '../auth/authApiClient';
import {
  getFreshAuthHeaders,
  getFreshAuthSession,
} from '../auth/authService';
import {
  createLocalWorkspace,
  getCurrentWorkspace,
  getFirstLocalOnlyWorkspace,
  getLocalWorkspaces,
  getOrCreateDefaultLocalWorkspace,
  setCurrentWorkspace,
} from './workspaceRepository';
import { dedupeWorkspaces } from './workspaceListModel';

export const toRemoteWorkspaceMetadata = (workspace = {}) => ({
  groupId: workspace.groupId || workspace.workspaceId,
  isRemote: true,
  name: workspace.name || 'Workspace compartido',
  ownerUserId: workspace.ownerUserId || null,
  remoteGroupId: workspace.groupId || workspace.workspaceId,
  syncStatus: 'remote',
  workspaceId: workspace.workspaceId || workspace.groupId,
  workspaceRole: workspace.membership?.role || workspace.workspaceRole || null,
  workspaceStatus:
    workspace.membership?.status || workspace.workspaceStatus || null,
});

const getClientAndHeaders = async ({ client, session } = {}) => {
  const currentSession = await getFreshAuthSession({ client, session });
  const authClient = client || createAuthApiClient();
  const authHeaders = await getFreshAuthHeaders({
    client,
    session: currentSession,
  });

  return {
    authClient,
    authHeaders,
    session: currentSession,
  };
};

export const refreshWorkspaceState = async ({ client, session } = {}) => {
  const currentWorkspace =
    (await getCurrentWorkspace()) || (await getOrCreateDefaultLocalWorkspace());
  const localWorkspaces = await getLocalWorkspaces();

  try {
    const { authClient, authHeaders } = await getClientAndHeaders({
      client,
      session,
    });
    const response = await authClient.listWorkspaces({ authHeaders });
    const remoteWorkspaces = (response.workspaces || []).map(
      toRemoteWorkspaceMetadata,
    );
    const workspaces = dedupeWorkspaces([...localWorkspaces, ...remoteWorkspaces], {
      currentWorkspace,
    });

    return {
      authRequired: false,
      currentWorkspace,
      localWorkspaces,
      remoteWorkspaces: dedupeWorkspaces(remoteWorkspaces, { currentWorkspace }),
      workspaces,
    };
  } catch (error) {
    return {
      authRequired: true,
      currentWorkspace,
      error: String(error?.message || error),
      localWorkspaces,
      remoteWorkspaces: [],
      workspaces: dedupeWorkspaces(localWorkspaces, { currentWorkspace }),
    };
  }
};

export const createRemoteWorkspace = async ({ client, name, session } = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });
  const response = await authClient.createWorkspace({
    authHeaders,
    name,
  });
  const workspace = toRemoteWorkspaceMetadata(response.workspace);

  return setCurrentWorkspace(workspace);
};

export const selectRemoteWorkspace = async (workspace) =>
  setCurrentWorkspace(toRemoteWorkspaceMetadata(workspace));

export const selectWorkspace = async (workspace) =>
  workspace?.isRemote
    ? selectRemoteWorkspace(workspace)
    : setCurrentWorkspace(workspace);

export const loadWorkspaceMembers = async ({
  client,
  groupId,
  session,
} = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });
  const response = await authClient.listWorkspaceMembers({
    authHeaders,
    groupId,
  });

  return response.members || [];
};

export const addWorkspaceMember = async ({
  client,
  groupId,
  member,
  session,
} = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });

  return authClient.addWorkspaceMember({
    authHeaders,
    groupId,
    ...member,
  });
};

export const updateWorkspaceMember = async ({
  client,
  groupId,
  role,
  session,
  status,
  userId,
} = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });

  return authClient.updateWorkspaceMember({
    authHeaders,
    groupId,
    role,
    status,
    userId,
  });
};

export const removeWorkspaceMember = async ({
  client,
  groupId,
  session,
  userId,
} = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });

  return authClient.removeWorkspaceMember({
    authHeaders,
    groupId,
    userId,
  });
};

export const createWorkspaceInvitation = async ({
  client,
  email,
  groupId,
  role,
  session,
} = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });

  return authClient.createWorkspaceInvitation({
    authHeaders,
    email,
    groupId,
    role,
  });
};

export const loadWorkspaceInvitationPreviewByToken = async ({
  client,
  token,
} = {}) => {
  const authClient = client || createAuthApiClient();
  const response = await authClient.getWorkspaceInvitationPreviewByToken({
    token,
  });

  return response.invitation || null;
};

export const loadWorkspaceInvitations = async ({
  client,
  groupId,
  session,
} = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });
  const response = await authClient.listWorkspaceInvitations({
    authHeaders,
    groupId,
  });

  return response.invitations || [];
};

export const loadMyWorkspaceInvitations = async ({ client, session } = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });
  const response = await authClient.listMyWorkspaceInvitations({
    authHeaders,
  });

  return response.invitations || [];
};

export const acceptWorkspaceInvitation = async ({
  client,
  invitationId,
  session,
} = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });

  return authClient.acceptWorkspaceInvitation({
    authHeaders,
    invitationId,
  });
};

export const acceptWorkspaceInvitationByToken = async ({
  client,
  session,
  token,
} = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });

  return authClient.acceptWorkspaceInvitationByToken({
    authHeaders,
    token,
  });
};

export const declineWorkspaceInvitation = async ({
  client,
  invitationId,
  session,
} = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });

  return authClient.declineWorkspaceInvitation({
    authHeaders,
    invitationId,
  });
};

export const declineWorkspaceInvitationByToken = async ({
  client,
  session,
  token,
} = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });

  return authClient.declineWorkspaceInvitationByToken({
    authHeaders,
    token,
  });
};

export const revokeWorkspaceInvitation = async ({
  client,
  groupId,
  invitationId,
  session,
} = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });

  return authClient.revokeWorkspaceInvitation({
    authHeaders,
    groupId,
    invitationId,
  });
};

export const disconnectLocalWorkspace = async ({
  client,
  leaveRemote = false,
  session,
  workspace,
} = {}) => {
  if (leaveRemote && workspace?.isRemote && workspace.groupId) {
    const { authClient, authHeaders } = await getClientAndHeaders({
      client,
      session,
    });

    await authClient.leaveWorkspace({
      authHeaders,
      groupId: workspace.groupId,
    });
  }

  const localWorkspace =
    (await getFirstLocalOnlyWorkspace()) ||
    (await createLocalWorkspace({ name: 'Workspace local' }));

  return setCurrentWorkspace(localWorkspace);
};

export default {
  addWorkspaceMember,
  acceptWorkspaceInvitation,
  acceptWorkspaceInvitationByToken,
  createRemoteWorkspace,
  createWorkspaceInvitation,
  declineWorkspaceInvitation,
  declineWorkspaceInvitationByToken,
  disconnectLocalWorkspace,
  loadMyWorkspaceInvitations,
  loadWorkspaceInvitationPreviewByToken,
  loadWorkspaceMembers,
  loadWorkspaceInvitations,
  refreshWorkspaceState,
  removeWorkspaceMember,
  revokeWorkspaceInvitation,
  selectRemoteWorkspace,
  selectWorkspace,
  toRemoteWorkspaceMetadata,
  updateWorkspaceMember,
};
