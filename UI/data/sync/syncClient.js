import {
  DEFAULT_SYNC_REQUEST_TIMEOUT_MS,
  validateSyncConfig,
} from './syncConfig';
import { DEFAULT_SYNC_ENDPOINTS } from './syncTypes';
import { getFreshAuthHeaders } from '../auth/authService';

export class SyncRequestError extends Error {
  constructor(code, message = code) {
    super(message);
    this.code = code;
    this.name = 'SyncRequestError';
  }
}

const createSyncRequestError = (code) => new SyncRequestError(code, code);

const parseJsonResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  return JSON.parse(text);
};

const getAbortController = () =>
  typeof AbortController !== 'undefined' ? new AbortController() : null;

const mapFetchError = (error) => {
  if (
    error?.code === 'sync_timeout' ||
    error?.message === 'sync_timeout'
  ) {
    return createSyncRequestError('sync_timeout');
  }

  if (
    error?.name === 'AbortError' ||
    error?.code === 'request_aborted' ||
    error?.message === 'request_aborted'
  ) {
    return createSyncRequestError('request_aborted');
  }

  if (/network request failed|failed to fetch|network/i.test(String(error?.message || error))) {
    return createSyncRequestError('network_error');
  }

  return createSyncRequestError('backend_unreachable');
};

const getSafePayloadErrorCode = (payload = {}, response = {}) => {
  const code =
    payload?.error ||
    payload?.code ||
    (/^[a-z][a-z0-9_:-]{2,80}$/i.test(String(payload?.message || ''))
      ? payload.message
      : null);

  return code || `sync_http_${response.status}`;
};

const requestJson = async (path, options = {}) => {
  const config = validateSyncConfig(options);

  if (!config.ok) {
    throw createSyncRequestError(config.error);
  }

  const baseUrl = config.baseUrl;
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

  if (
    (options.requireAuth === true || options.requireAuth !== false) &&
    !authHeaders.Authorization
  ) {
    throw createSyncRequestError('auth_required');
  }

  const controller = getAbortController();
  const timeoutMs = Number(
    options.timeoutMs || DEFAULT_SYNC_REQUEST_TIMEOUT_MS,
  );
  let timedOut = false;
  const timeoutId =
    controller && timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : null;
  let response;

  try {
    response = await (options.fetchImpl || fetch)(`${baseUrl}${path}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(options.headers || {}),
      },
      method: options.method || 'GET',
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (error) {
    throw timedOut ? createSyncRequestError('sync_timeout') : mapFetchError(error);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw createSyncRequestError(getSafePayloadErrorCode(payload, response));
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
  verifyRemoteDocuments: (payload) =>
    requestJson(DEFAULT_SYNC_ENDPOINTS.VERIFY_DOCUMENTS, {
      ...options,
      body: payload,
      method: 'POST',
    }),
});

const defaultSyncClient = createSyncClient();

export default defaultSyncClient;
