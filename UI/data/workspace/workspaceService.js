import { createAuthApiClient } from '../auth/authApiClient';
import {
  getFreshAuthHeaders,
  getFreshAuthSession,
} from '../auth/authService';
import {
  createLocalWorkspace,
  deleteWorkspaceMetadata,
  getCurrentWorkspace,
  getLocalWorkspaces,
  getOrCreateDefaultLocalWorkspace,
  getOrCreatePersonalWorkspace,
  saveWorkspace,
  setCurrentWorkspace,
} from './workspaceRepository';
import { dedupeWorkspaces } from './workspaceListModel';
import {
  getDocument,
  hardDeleteDocumentsByGroupId,
  saveDocument,
} from '../db/documentStore';
import { deleteOutboxEventsByGroupId } from '../sync/syncOutbox';
import { deleteSyncState } from '../sync/syncStateRepository';

const isSameRemoteWorkspace = (left = {}, right = {}) => {
  const leftId = left.groupId || left.remoteGroupId || left.workspaceId;
  const rightId = right.groupId || right.remoteGroupId || right.workspaceId;

  return Boolean(leftId && rightId && leftId === rightId);
};

const getWorkspaceIdentity = (workspace = {}) =>
  workspace.groupId || workspace.remoteGroupId || workspace.workspaceId || null;

const purgeRemovedRemoteWorkspace = async (workspace = {}) => {
  const groupId = getWorkspaceIdentity(workspace);

  if (!groupId) {
    return;
  }

  await deleteOutboxEventsByGroupId(groupId);
  await deleteSyncState(groupId);
  await hardDeleteDocumentsByGroupId(groupId);
  await deleteWorkspaceMetadata({
    ...workspace,
    groupId,
    isRemote: true,
    workspaceId: groupId,
  });
};

const getSessionUserId = (session = {}) =>
  session?.userId || session?.user?.userId || session?.user?.id || null;

const isWorkspaceVisibleForSession = (
  workspace = {},
  sessionUserId,
  { includeRemoteWithoutSession = true } = {},
) => {
  if (!workspace?.isRemote) {
    return true;
  }

  if (!sessionUserId) {
    return includeRemoteWithoutSession;
  }

  return workspace.accountUserId === sessionUserId;
};

const filterWorkspacesForSession = (workspaces = [], sessionUserId, options) =>
  workspaces.filter((workspace) =>
    isWorkspaceVisibleForSession(workspace, sessionUserId, options),
  );

export const toRemoteWorkspaceMetadata = (workspace = {}, options = {}) => {
  const groupId =
    workspace.groupId || workspace.remoteGroupId || workspace.workspaceId;

  return {
    accountUserId: options.accountUserId || workspace.accountUserId || null,
    groupId,
    isRemote: true,
    name: workspace.name || 'Proyecto compartido',
    ownerUserId: workspace.ownerUserId || null,
    remoteGroupId: groupId,
    syncStatus: 'remote',
    workspaceId: groupId,
    workspaceRole: workspace.membership?.role || workspace.workspaceRole || null,
    workspaceStatus:
      workspace.membership?.status || workspace.workspaceStatus || null,
  };
};

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

const getPendingInvitations = (invitations = []) =>
  invitations.filter(
    (invitation) => (invitation.status || 'invited') === 'invited',
  );
const WORKSPACE_MEMBERS_CACHE_COLLECTION = '__workspace_members_cache';
const WORKSPACE_INVITATIONS_CACHE_COLLECTION = '__workspace_invitations_cache';
const MY_INVITATIONS_CACHE_ID = 'mine';

const getWorkspaceCacheId = (groupId) => String(groupId || '').trim();

const saveWorkspaceCache = async (collection, id, data) => {
  if (!id) {
    return data;
  }

  await saveDocument(collection, id, { items: data || [] }, {
    groupId: id === MY_INVITATIONS_CACHE_ID ? null : id,
    skipOutbox: true,
    syncStatus: 'local',
  });

  return data;
};

const loadWorkspaceCache = async (collection, id) => {
  if (!id) {
    return [];
  }

  const document = await getDocument(collection, id, { includeDeleted: true });
  return Array.isArray(document?.data?.items) ? document.data.items : [];
};

export const loadCachedWorkspaceMembers = async (groupId) =>
  loadWorkspaceCache(
    WORKSPACE_MEMBERS_CACHE_COLLECTION,
    getWorkspaceCacheId(groupId),
  );

export const loadCachedWorkspaceInvitations = async (groupId) =>
  loadWorkspaceCache(
    WORKSPACE_INVITATIONS_CACHE_COLLECTION,
    getWorkspaceCacheId(groupId),
  );

export const loadCachedMyWorkspaceInvitations = async () =>
  loadWorkspaceCache(
    WORKSPACE_INVITATIONS_CACHE_COLLECTION,
    MY_INVITATIONS_CACHE_ID,
  );

export const loadCachedWorkspaceDetails = async (workspace = {}) => {
  const groupId = workspace?.groupId || workspace?.workspaceId;

  if (!workspace?.isRemote || !groupId) {
    return { invitations: [], members: [] };
  }

  const [members, invitations] = await Promise.all([
    loadCachedWorkspaceMembers(groupId),
    loadCachedWorkspaceInvitations(groupId),
  ]);

  return { invitations, members };
};

export const refreshWorkspaceState = async ({
  client,
  includeRemoteWithoutSession = true,
  session,
} = {}) => {
  const currentWorkspace =
    (await getCurrentWorkspace()) || (await getOrCreateDefaultLocalWorkspace());
  const sessionUserId = getSessionUserId(session);
  const storedWorkspaces = filterWorkspacesForSession(
    await getLocalWorkspaces(),
    sessionUserId,
    { includeRemoteWithoutSession },
  );
  const localOnlyWorkspaces = storedWorkspaces.filter(
    (workspace) => !workspace.isRemote,
  );
  const visibleCurrentWorkspace = isWorkspaceVisibleForSession(
    currentWorkspace,
    sessionUserId,
    { includeRemoteWithoutSession },
  )
    ? currentWorkspace
    : localOnlyWorkspaces[0] || currentWorkspace;

  try {
    const {
      authClient,
      authHeaders,
      session: freshSession,
    } = await getClientAndHeaders({
      client,
      session,
    });
    const accountUserId = getSessionUserId(freshSession);
    const response = await authClient.listWorkspaces({ authHeaders });
    const myInvitationsResponse = authClient.listMyWorkspaceInvitations
      ? await authClient.listMyWorkspaceInvitations({ authHeaders })
      : { invitations: [] };
    const remoteWorkspaces = (response.workspaces || []).map((workspace) =>
      toRemoteWorkspaceMetadata(workspace, { accountUserId }),
    );
    await Promise.all(remoteWorkspaces.map((workspace) => saveWorkspace(workspace)));
    const remoteGroupIds = new Set(
      remoteWorkspaces.map((workspace) => workspace.groupId).filter(Boolean),
    );
    const removedRemoteWorkspaces = storedWorkspaces.filter(
      (workspace) =>
        workspace?.isRemote &&
        getWorkspaceIdentity(workspace) &&
        !remoteGroupIds.has(getWorkspaceIdentity(workspace)),
    );
    await Promise.all(removedRemoteWorkspaces.map(purgeRemovedRemoteWorkspace));
    const currentWorkspaceWasRemoved =
      currentWorkspace?.isRemote &&
      !remoteGroupIds.has(getWorkspaceIdentity(currentWorkspace));
    const fallbackLocalWorkspace = currentWorkspaceWasRemoved
      ? await getOrCreatePersonalWorkspace()
      : null;
    let nextCurrentWorkspace = fallbackLocalWorkspace
      ? await setCurrentWorkspace(fallbackLocalWorkspace)
      : currentWorkspace;
    const currentRemoteMetadata = nextCurrentWorkspace?.isRemote
      ? remoteWorkspaces.find((workspace) =>
          isSameRemoteWorkspace(workspace, nextCurrentWorkspace),
        )
      : null;

    if (currentRemoteMetadata) {
      nextCurrentWorkspace = await setCurrentWorkspace({
        ...nextCurrentWorkspace,
        ...currentRemoteMetadata,
        isRemote: true,
        workspaceRole:
          currentRemoteMetadata.workspaceRole ||
          nextCurrentWorkspace.workspaceRole,
        workspaceStatus:
          currentRemoteMetadata.workspaceStatus ||
          nextCurrentWorkspace.workspaceStatus,
      });
    }
    const workspaces = dedupeWorkspaces([...localOnlyWorkspaces, ...remoteWorkspaces], {
      currentWorkspace: nextCurrentWorkspace,
    });

    return {
      authRequired: false,
      currentWorkspace: nextCurrentWorkspace,
      localWorkspaces: localOnlyWorkspaces,
      myInvitations: getPendingInvitations(
        myInvitationsResponse.invitations || [],
      ),
      remoteWorkspaces: dedupeWorkspaces(remoteWorkspaces, {
        currentWorkspace: nextCurrentWorkspace,
      }),
      workspaces,
    };
  } catch (error) {
    return {
      authRequired: true,
      currentWorkspace: visibleCurrentWorkspace,
      error: String(error?.message || error),
      localWorkspaces: localOnlyWorkspaces,
      myInvitations: [],
      remoteWorkspaces: [],
      workspaces: dedupeWorkspaces(storedWorkspaces, {
        currentWorkspace: visibleCurrentWorkspace,
      }),
    };
  }
};

export const loadCachedWorkspaceState = async ({
  includeRemoteWithoutSession = true,
  session,
} = {}) => {
  const sessionUserId = getSessionUserId(session);
  const currentWorkspace =
    (await getCurrentWorkspace()) || (await getOrCreateDefaultLocalWorkspace());
  const localWorkspaces = filterWorkspacesForSession(
    await getLocalWorkspaces(),
    sessionUserId,
    { includeRemoteWithoutSession },
  );
  const nextCurrentWorkspace = isWorkspaceVisibleForSession(
    currentWorkspace,
    sessionUserId,
    { includeRemoteWithoutSession },
  )
    ? currentWorkspace
    : await setCurrentWorkspace(
        localWorkspaces.find((workspace) => !workspace.isRemote) ||
          (await getOrCreateDefaultLocalWorkspace()),
      );
  const workspaces = dedupeWorkspaces(localWorkspaces, {
    currentWorkspace: nextCurrentWorkspace,
  });

  return {
    authRequired: false,
    currentWorkspace: nextCurrentWorkspace,
    localWorkspaces: localWorkspaces.filter((workspace) => !workspace.isRemote),
    myInvitations: await loadCachedMyWorkspaceInvitations(),
    remoteWorkspaces: localWorkspaces.filter((workspace) => workspace.isRemote),
    workspaces,
  };
};

export const createRemoteWorkspace = async ({ client, name, session } = {}) => {
  const {
    authClient,
    authHeaders,
    session: freshSession,
  } = await getClientAndHeaders({
    client,
    session,
  });
  const response = await authClient.createWorkspace({
    authHeaders,
    name,
  });
  const workspace = toRemoteWorkspaceMetadata(response.workspace, {
    accountUserId: getSessionUserId(freshSession),
  });

  return setCurrentWorkspace(workspace);
};

export const createPrivateWorkspace = async ({ name } = {}) =>
  createLocalWorkspace({ name: name || 'Proyecto personal' });

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

  return saveWorkspaceCache(
    WORKSPACE_MEMBERS_CACHE_COLLECTION,
    getWorkspaceCacheId(groupId),
    response.members || [],
  );
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

export const updateRemoteWorkspace = async ({
  client,
  groupId,
  name,
  session,
} = {}) => {
  const {
    authClient,
    authHeaders,
    session: freshSession,
  } = await getClientAndHeaders({
    client,
    session,
  });
  const response = await authClient.updateWorkspace({
    authHeaders,
    groupId,
    name,
  });
  const workspace = toRemoteWorkspaceMetadata(response.workspace, {
    accountUserId: getSessionUserId(freshSession),
  });

  return setCurrentWorkspace(workspace);
};

export const updatePrivateWorkspace = async ({ name, workspace } = {}) => {
  const targetId = workspace?.workspaceId || workspace?.groupId;

  if (!targetId || workspace?.isRemote) {
    throw new Error('workspace_required');
  }

  const localWorkspaces = await getLocalWorkspaces();
  const existingWorkspace = localWorkspaces.find((localWorkspace) => {
    const localId = localWorkspace.workspaceId || localWorkspace.groupId;
    const localGroupId = localWorkspace.groupId || localWorkspace.workspaceId;

    return (
      !localWorkspace.isRemote &&
      (localId === targetId || localGroupId === targetId)
    );
  });

  if (!existingWorkspace) {
    throw new Error('workspace_required');
  }

  const groupId = existingWorkspace.groupId || existingWorkspace.workspaceId;
  const workspaceId = existingWorkspace.workspaceId || groupId;
  const nextWorkspace = {
    ...existingWorkspace,
    groupId,
    name,
    syncStatus: 'local',
    workspaceId,
  };
  const currentWorkspace = await getCurrentWorkspace();

  return currentWorkspace?.groupId === groupId ||
    currentWorkspace?.workspaceId === workspaceId
    ? setCurrentWorkspace(nextWorkspace)
    : saveWorkspace(nextWorkspace);
};

export const deleteRemoteWorkspace = async ({
  client,
  groupId,
  session,
  workspace,
} = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });

  await authClient.deleteWorkspace({
    authHeaders,
    groupId,
  });

  await deleteOutboxEventsByGroupId(groupId);
  await deleteSyncState(groupId);
  await hardDeleteDocumentsByGroupId(groupId);
  await deleteWorkspaceMetadata(workspace || { groupId, workspaceId: groupId });

  const localWorkspace =
    await getOrCreatePersonalWorkspace();

  return setCurrentWorkspace(localWorkspace);
};

export const deletePrivateWorkspace = async (workspace = {}) => {
  const groupId = workspace?.groupId || workspace?.workspaceId;

  if (!groupId || workspace?.isRemote) {
    throw new Error('workspace_required');
  }

  await deleteOutboxEventsByGroupId(groupId);
  await deleteSyncState(groupId);
  await hardDeleteDocumentsByGroupId(groupId);

  const currentWorkspace = await getCurrentWorkspace();
  const remainingLocalWorkspace = (await getLocalWorkspaces()).find(
    (localWorkspace) =>
      !localWorkspace.isRemote &&
      (localWorkspace.groupId || localWorkspace.workspaceId) !== groupId,
  );
  const fallbackWorkspace =
    remainingLocalWorkspace || (await getOrCreatePersonalWorkspace());

  return currentWorkspace?.groupId === groupId ||
    currentWorkspace?.workspaceId === groupId
    ? setCurrentWorkspace(fallbackWorkspace)
    : currentWorkspace || fallbackWorkspace;
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

  return saveWorkspaceCache(
    WORKSPACE_INVITATIONS_CACHE_COLLECTION,
    getWorkspaceCacheId(groupId),
    getPendingInvitations(response.invitations || []),
  );
};

export const loadMyWorkspaceInvitations = async ({ client, session } = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });
  const response = await authClient.listMyWorkspaceInvitations({
    authHeaders,
  });

  return saveWorkspaceCache(
    WORKSPACE_INVITATIONS_CACHE_COLLECTION,
    MY_INVITATIONS_CACHE_ID,
    getPendingInvitations(response.invitations || []),
  );
};

export const acceptWorkspaceInvitation = async ({
  client,
  invitationId,
  session,
} = {}) => {
  const {
    authClient,
    authHeaders,
    session: freshSession,
  } = await getClientAndHeaders({
    client,
    session,
  });

  const response = await authClient.acceptWorkspaceInvitation({
    authHeaders,
    invitationId,
  });
  const invitation = response?.invitation || {};
  const groupId = invitation.groupId || invitation.workspaceId || null;

  if (groupId) {
    await setCurrentWorkspace(
      toRemoteWorkspaceMetadata({
        accountUserId: getSessionUserId(freshSession),
        groupId,
        membership: {
          role: invitation.role || 'member',
          status: 'active',
        },
        name: invitation.workspace?.name || invitation.workspaceName,
        workspaceId: invitation.workspaceId || groupId,
      }),
    );
  }

  return response;
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

export const regenerateWorkspaceInvitationLink = async ({
  client,
  groupId,
  invitationId,
  session,
} = {}) => {
  const { authClient, authHeaders } = await getClientAndHeaders({
    client,
    session,
  });

  return authClient.regenerateWorkspaceInvitationLink({
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
    await getOrCreatePersonalWorkspace();

  return setCurrentWorkspace(localWorkspace);
};

export default {
  addWorkspaceMember,
  acceptWorkspaceInvitation,
  acceptWorkspaceInvitationByToken,
  createRemoteWorkspace,
  createPrivateWorkspace,
  createWorkspaceInvitation,
  deletePrivateWorkspace,
  deleteRemoteWorkspace,
  declineWorkspaceInvitation,
  declineWorkspaceInvitationByToken,
  disconnectLocalWorkspace,
  loadMyWorkspaceInvitations,
  loadWorkspaceInvitationPreviewByToken,
  loadWorkspaceMembers,
  loadWorkspaceInvitations,
  regenerateWorkspaceInvitationLink,
  refreshWorkspaceState,
  removeWorkspaceMember,
  revokeWorkspaceInvitation,
  selectRemoteWorkspace,
  selectWorkspace,
  toRemoteWorkspaceMetadata,
  updatePrivateWorkspace,
  updateRemoteWorkspace,
  updateWorkspaceMember,
};
