import { createWorkspaceApiClient } from './workspaceApiClient';
import { setCurrentWorkspace } from './workspaceRepository';

const toLocalRemoteWorkspace = (workspace, membership = {}) => ({
  groupId: workspace.groupId,
  isRemote: true,
  name: workspace.name,
  ownerUserId: workspace.ownerUserId,
  remoteGroupId: workspace.groupId,
  syncStatus: 'remote',
  workspaceId: workspace.workspaceId || workspace.groupId,
  workspaceRole: membership.role || workspace.membership?.role || null,
});

export const createRemoteWorkspace = async ({
  client,
  name,
  ...options
} = {}) => {
  const workspaceClient = client || createWorkspaceApiClient(options);
  const response = await workspaceClient.createWorkspace({
    groupId: options.groupId,
    name,
    workspaceId: options.workspaceId,
  });

  return response.workspace;
};

export const listRemoteWorkspaces = async ({ client, ...options } = {}) => {
  const workspaceClient = client || createWorkspaceApiClient(options);
  const response = await workspaceClient.listWorkspaces();

  return response.workspaces || [];
};

export const selectRemoteWorkspace = async ({
  client,
  groupId,
  ...options
} = {}) => {
  const workspaceClient = client || createWorkspaceApiClient(options);
  const response = await workspaceClient.getWorkspace({ groupId });
  const workspace = toLocalRemoteWorkspace(response.workspace || {}, {
    role: response.workspace?.membership?.role,
  });

  return setCurrentWorkspace(workspace, options);
};

export default {
  createRemoteWorkspace,
  listRemoteWorkspaces,
  selectRemoteWorkspace,
};
