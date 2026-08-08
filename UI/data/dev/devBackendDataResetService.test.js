import {
  BACKEND_RESET_CONFIRMATION,
  BACKEND_RESET_SCOPE,
  runDevBackendDataReset,
} from './devBackendDataResetService';

describe('devBackendDataResetService', () => {
  test('calls the backend dev reset endpoint with explicit confirmation', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    }));

    await runDevBackendDataReset({
      baseUrl: 'http://api.example.test/',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.example.test/dev/reset-database',
      {
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
      },
    );
  });

  test('throws user safe backend error messages', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({ message: 'dev_backend_reset_disabled' }),
    }));

    await expect(
      runDevBackendDataReset({
        baseUrl: 'http://api.example.test',
        fetchImpl,
      }),
    ).rejects.toThrow('dev_backend_reset_disabled');
  });
});
