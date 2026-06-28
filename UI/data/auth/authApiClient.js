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
  login: ({ email, password }) =>
    requestJson('/auth/login', {
      ...options,
      body: { email, password },
      method: 'POST',
    }),
  logout: ({ authHeaders } = {}) =>
    requestJson('/auth/logout', {
      ...options,
      headers: authHeaders,
      method: 'POST',
    }),
  refresh: ({ refreshToken }) =>
    requestJson('/auth/refresh', {
      ...options,
      body: { refreshToken },
      method: 'POST',
    }),
  register: ({ displayName, email, password }) =>
    requestJson('/auth/register', {
      ...options,
      body: { displayName, email, password },
      method: 'POST',
    }),
});

export default createAuthApiClient;
