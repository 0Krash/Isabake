import { requestAuthenticatedJson } from '../auth/authClient';

export const createWorkspaceApiClient = (options = {}) => ({
  addMember: ({ displayName, email, groupId, role, status, userId }) =>
    requestAuthenticatedJson(`/workspaces/${groupId}/members`, {
      ...options,
      body: {
        displayName,
        email,
        role,
        status,
        userId,
      },
      method: 'POST',
    }),
  createWorkspace: ({ groupId, name, workspaceId } = {}) =>
    requestAuthenticatedJson('/workspaces', {
      ...options,
      body: {
        groupId,
        name,
        workspaceId,
      },
      method: 'POST',
    }),
  getMembers: ({ groupId }) =>
    requestAuthenticatedJson(`/workspaces/${groupId}/members`, {
      ...options,
      method: 'GET',
    }),
  getWorkspace: ({ groupId }) =>
    requestAuthenticatedJson(`/workspaces/${groupId}`, {
      ...options,
      method: 'GET',
    }),
  listWorkspaces: () =>
    requestAuthenticatedJson('/workspaces', {
      ...options,
      method: 'GET',
    }),
});

export default createWorkspaceApiClient;
