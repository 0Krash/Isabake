import { getSyncBaseUrl } from '../sync/syncConfig';

const parseJsonResponse = async (response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

const requestJson = async (path, options = {}) => {
  const baseUrl = getSyncBaseUrl(options);

  if (!baseUrl) {
    throw new Error('Auth API URL no configurada');
  }

  const response = await (options.fetchImpl || fetch)(`${baseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    method: options.method || 'GET',
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      payload?.message || payload?.error || `Auth HTTP ${response.status}`,
    );
  }

  return payload;
};

export const createAuthApiClient = (options = {}) => ({
  getMe: ({ authHeaders } = {}) =>
    requestJson('/auth/me', {
      ...options,
      headers: authHeaders,
      method: 'GET',
    }),
  addWorkspaceMember: ({
    authHeaders,
    displayName,
    email,
    groupId,
    role,
    status,
    userId,
  }) =>
    requestJson(`/workspaces/${groupId}/members`, {
      ...options,
      body: { displayName, email, role, status, userId },
      headers: authHeaders,
      method: 'POST',
    }),
  createWorkspace: ({ authHeaders, groupId, name, workspaceId }) =>
    requestJson('/workspaces', {
      ...options,
      body: { groupId, name, workspaceId },
      headers: authHeaders,
      method: 'POST',
    }),
  updateWorkspace: ({ authHeaders, groupId, name }) =>
    requestJson(`/workspaces/${groupId}`, {
      ...options,
      body: { name },
      headers: authHeaders,
      method: 'PATCH',
    }),
  deleteWorkspace: ({ authHeaders, groupId }) =>
    requestJson(`/workspaces/${groupId}`, {
      ...options,
      headers: authHeaders,
      method: 'DELETE',
    }),
  createWorkspaceInvitation: ({ authHeaders, email, groupId, role }) =>
    requestJson(`/workspaces/${groupId}/invitations`, {
      ...options,
      body: { email, role },
      headers: authHeaders,
      method: 'POST',
    }),
  acceptWorkspaceInvitationByToken: ({ authHeaders, token }) =>
    requestJson(`/workspaces/invitations/by-token/${encodeURIComponent(token)}/accept`, {
      ...options,
      headers: authHeaders,
      method: 'POST',
    }),
  declineWorkspaceInvitation: ({ authHeaders, invitationId }) =>
    requestJson(`/workspaces/invitations/${invitationId}/decline`, {
      ...options,
      headers: authHeaders,
      method: 'POST',
    }),
  declineWorkspaceInvitationByToken: ({ authHeaders, token }) =>
    requestJson(`/workspaces/invitations/by-token/${encodeURIComponent(token)}/decline`, {
      ...options,
      headers: authHeaders,
      method: 'POST',
    }),
  getWorkspaceInvitationPreviewByToken: ({ token }) =>
    requestJson(`/workspaces/invitations/by-token/${encodeURIComponent(token)}`, {
      ...options,
      method: 'GET',
    }),
  leaveWorkspace: ({ authHeaders, groupId }) =>
    requestJson(`/workspaces/${groupId}/leave`, {
      ...options,
      headers: authHeaders,
      method: 'POST',
    }),
  listSessions: ({ authHeaders } = {}) =>
    requestJson('/auth/sessions', {
      ...options,
      headers: authHeaders,
      method: 'GET',
    }),
  listWorkspaceMembers: ({ authHeaders, groupId }) =>
    requestJson(`/workspaces/${groupId}/members`, {
      ...options,
      headers: authHeaders,
      method: 'GET',
    }),
  listMyWorkspaceInvitations: ({ authHeaders } = {}) =>
    requestJson('/workspaces/invitations/mine', {
      ...options,
      headers: authHeaders,
      method: 'GET',
    }),
  listWorkspaceInvitations: ({ authHeaders, groupId }) =>
    requestJson(`/workspaces/${groupId}/invitations`, {
      ...options,
      headers: authHeaders,
      method: 'GET',
    }),
  listWorkspaces: ({ authHeaders } = {}) =>
    requestJson('/workspaces', {
      ...options,
      headers: authHeaders,
      method: 'GET',
    }),
  login: ({ deviceId, deviceName, email, password }) =>
    requestJson('/auth/login', {
      ...options,
      body: { deviceId, deviceName, email, password },
      method: 'POST',
    }),
  logout: ({ authHeaders, refreshToken, sessionId } = {}) =>
    requestJson('/auth/logout', {
      ...options,
      body: { refreshToken, sessionId },
      headers: authHeaders,
      method: 'POST',
    }),
  refresh: ({ refreshToken }) =>
    requestJson('/auth/refresh', {
      ...options,
      body: { refreshToken },
      method: 'POST',
    }),
  register: ({ deviceId, deviceName, displayName, email, password }) =>
    requestJson('/auth/register', {
      ...options,
      body: { deviceId, deviceName, displayName, email, password },
      method: 'POST',
    }),
  revokeAllSessions: ({ authHeaders } = {}) =>
    requestJson('/auth/sessions', {
      ...options,
      headers: authHeaders,
      method: 'DELETE',
    }),
  revokeSession: ({ authHeaders, sessionId }) =>
    requestJson(`/auth/sessions/${sessionId}`, {
      ...options,
      headers: authHeaders,
      method: 'DELETE',
    }),
  removeWorkspaceMember: ({ authHeaders, groupId, userId }) =>
    requestJson(`/workspaces/${groupId}/members/${userId}`, {
      ...options,
      headers: authHeaders,
      method: 'DELETE',
    }),
  acceptWorkspaceInvitation: ({ authHeaders, invitationId }) =>
    requestJson(`/workspaces/invitations/${invitationId}/accept`, {
      ...options,
      headers: authHeaders,
      method: 'POST',
    }),
  revokeWorkspaceInvitation: ({ authHeaders, groupId, invitationId }) =>
    requestJson(`/workspaces/${groupId}/invitations/${invitationId}`, {
      ...options,
      headers: authHeaders,
      method: 'DELETE',
    }),
  regenerateWorkspaceInvitationLink: ({ authHeaders, groupId, invitationId }) =>
    requestJson(
      `/workspaces/${groupId}/invitations/${invitationId}/regenerate-link`,
      {
        ...options,
        headers: authHeaders,
        method: 'POST',
      },
    ),
  updateWorkspaceMember: ({ authHeaders, groupId, role, status, userId }) =>
    requestJson(`/workspaces/${groupId}/members/${userId}`, {
      ...options,
      body: { role, status },
      headers: authHeaders,
      method: 'PATCH',
    }),
});

export default createAuthApiClient;
