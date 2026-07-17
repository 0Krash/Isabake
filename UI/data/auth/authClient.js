import { getSyncBaseUrl } from '../sync/syncConfig';
import { getFreshAuthHeaders } from './authService';
import { getAuthHeaders } from './authSession';

const parseJsonResponse = async (response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

export const requestAuthenticatedJson = async (path, options = {}) => {
  const baseUrl = getSyncBaseUrl(options);

  if (!baseUrl) {
    throw new Error('Sync API URL no configurada');
  }

  const authHeaders = options.authHeaders
    ? options.authHeaders
    : options.authSession
      ? await getFreshAuthHeaders({
          client: options.authClient,
          session: options.authSession,
        })
    : await getFreshAuthHeaders({
        client: options.authClient,
        session: await options.getAuthSession?.(),
      }).catch((error) => {
          if (options.requireAuth === false) {
            return {};
          }

          throw error;
        });

  if (options.requireAuth !== false && !authHeaders.Authorization) {
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

export default {
  requestAuthenticatedJson,
};
