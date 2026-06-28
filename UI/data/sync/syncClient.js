import { getSyncBaseUrl } from './syncConfig';
import { DEFAULT_SYNC_ENDPOINTS } from './syncTypes';
import { getAuthHeaders } from '../auth/authSession';
import { getCurrentSession } from '../auth/authService';

const parseJsonResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  return JSON.parse(text);
};

const requestJson = async (path, options = {}) => {
  const baseUrl = getSyncBaseUrl(options);

  if (!baseUrl) {
    throw new Error('Sync API URL no configurada');
  }

  const authHeaders =
    options.authHeaders ||
    getAuthHeaders(
      options.authSession ||
        (await options.getAuthSession?.()) ||
        (await getCurrentSession()),
    );

  if (
    (options.requireAuth === true || options.requireAuth !== false) &&
    !authHeaders.Authorization
  ) {
    throw new Error('auth_required');
  }

  const response = await (options.fetchImpl || fetch)(`${baseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers || {}),
    },
    method: options.method || 'GET',
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      payload?.message || payload?.error || `Sync HTTP ${response.status}`,
    );
  }

  return payload;
};

export const createSyncClient = (options = {}) => ({
  pullChanges: ({ cursor, groupId }) => {
    const query = new URLSearchParams({
      groupId,
      ...(cursor ? { cursor } : {}),
    }).toString();

    return requestJson(`${DEFAULT_SYNC_ENDPOINTS.PULL}?${query}`, {
      ...options,
      method: 'GET',
    });
  },
  pushChanges: (payload) =>
    requestJson(DEFAULT_SYNC_ENDPOINTS.PUSH, {
      ...options,
      body: payload,
      method: 'POST',
    }),
});

const defaultSyncClient = createSyncClient();

export default defaultSyncClient;
