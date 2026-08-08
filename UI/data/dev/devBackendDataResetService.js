import { getSyncBaseUrl } from '../sync/syncConfig';

export const BACKEND_RESET_SCOPE = 'backend_database_reset';
export const BACKEND_RESET_CONFIRMATION = 'RESET_BACKEND_DATABASE';

const parseJsonResponse = async (response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

export const runDevBackendDataReset = async ({
  baseUrl,
  fetchImpl = fetch,
} = {}) => {
  const resolvedBaseUrl = getSyncBaseUrl({ baseUrl });

  if (!resolvedBaseUrl) {
    throw new Error('backend_reset_url_missing');
  }

  const response = await fetchImpl(`${resolvedBaseUrl}/dev/reset-database`, {
    body: JSON.stringify({
      confirm: true,
      scope: BACKEND_RESET_SCOPE,
    }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-dev-reset-confirm': BACKEND_RESET_CONFIRMATION,
    },
    method: 'POST',
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      payload?.message || payload?.error || `Backend reset HTTP ${response.status}`,
    );
  }

  return payload;
};

export default {
  runDevBackendDataReset,
};
