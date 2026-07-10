import {
  NETWORK_STATES,
  evaluateSyncUrlStatus,
  getSafeSyncBaseUrlHost,
} from './networkStatusModel';
import {
  __resetNetworkStatusForTests,
  getNetworkDiagnostics,
  getNetworkStatus,
  refreshNetworkStatus,
  subscribeToNetworkStatus,
} from './networkStatusService';

describe('networkStatusService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    __resetNetworkStatusForTests();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('starts with unknown safe state', () => {
    expect(getNetworkStatus()).toEqual(
      expect.objectContaining({
        backendReachable: false,
        networkState: NETWORK_STATES.UNKNOWN,
      }),
    );
  });

  test('detects missing and invalid sync URL without network access', async () => {
    await expect(refreshNetworkStatus({ baseUrl: '' })).resolves.toEqual(
      expect.objectContaining({
        errorCode: NETWORK_STATES.SYNC_URL_MISSING,
        networkState: NETWORK_STATES.SYNC_URL_MISSING,
        syncBaseUrlConfigured: false,
      }),
    );
    await expect(refreshNetworkStatus({ baseUrl: 'ftp://bad' })).resolves.toEqual(
      expect.objectContaining({
        errorCode: NETWORK_STATES.SYNC_URL_INVALID,
        networkState: NETWORK_STATES.SYNC_URL_INVALID,
      }),
    );
  });

  test('clears stale missing-url state when current config is valid', async () => {
    await expect(refreshNetworkStatus({ baseUrl: '' })).resolves.toEqual(
      expect.objectContaining({
        networkState: NETWORK_STATES.SYNC_URL_MISSING,
      }),
    );

    expect(
      getNetworkStatus({ baseUrl: 'https://api.example.test' }),
    ).toEqual(
      expect.objectContaining({
        networkState: NETWORK_STATES.UNKNOWN,
        syncBaseUrlConfigured: true,
        syncBaseUrlHost: 'api.example.test',
      }),
    );
  });

  test('marks backend reachable when fetch resolves', async () => {
    const listener = jest.fn();
    subscribeToNetworkStatus(listener);

    await expect(
      refreshNetworkStatus({
        baseUrl: 'https://api.example.test',
        fetchImpl: jest.fn(async () => ({ ok: false, status: 404 })),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        backendReachable: true,
        networkState: NETWORK_STATES.BACKEND_REACHABLE,
        syncBaseUrlHost: 'api.example.test',
      }),
    );
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        networkState: NETWORK_STATES.BACKEND_REACHABLE,
      }),
    );
  });

  test('marks offline or backend unreachable safely when fetch fails', async () => {
    await expect(
      refreshNetworkStatus({
        baseUrl: 'https://api.example.test',
        fetchImpl: jest.fn(async () => {
          throw new Error('Network request failed');
        }),
        navigatorRef: { onLine: false },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        backendReachable: false,
        errorCode: NETWORK_STATES.OFFLINE,
        isOnline: false,
        networkState: NETWORK_STATES.OFFLINE,
      }),
    );

    await expect(
      refreshNetworkStatus({
        baseUrl: 'https://api.example.test',
        fetchImpl: jest.fn(async () => {
          throw new Error('timeout');
        }),
        navigatorRef: { onLine: true },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        errorCode: NETWORK_STATES.BACKEND_UNREACHABLE,
        networkState: NETWORK_STATES.BACKEND_UNREACHABLE,
      }),
    );
  });

  test('diagnostics expose safe host only and no secrets', async () => {
    await refreshNetworkStatus({
      baseUrl: 'https://api.example.test/sync?token=secret',
      fetchImpl: jest.fn(async () => ({ ok: true, status: 200 })),
    });

    expect(getSafeSyncBaseUrlHost('https://token.example.test')).toBe(null);
    expect(evaluateSyncUrlStatus({ baseUrl: 'https://api.example.test' })).toEqual(
      expect.objectContaining({
        status: expect.objectContaining({
          syncBaseUrlHost: 'api.example.test',
        }),
      }),
    );
    expect(getNetworkDiagnostics()).toEqual(
      expect.objectContaining({
        backendReachable: true,
        networkState: NETWORK_STATES.BACKEND_REACHABLE,
        syncBaseUrlConfigured: true,
        syncBaseUrlHost: 'api.example.test',
      }),
    );
    expect(JSON.stringify(getNetworkDiagnostics())).not.toMatch(
      /secret|Authorization|Bearer|token=/i,
    );
  });
});
