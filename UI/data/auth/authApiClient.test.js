import { createAuthApiClient } from './authApiClient';

describe('authApiClient', () => {
  test('sends register request', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    }));
    const client = createAuthApiClient({
      baseUrl: 'http://api.example.test/',
      fetchImpl,
    });

    await client.register({
      displayName: 'Ana',
      email: 'ana@example.test',
      password: 'password123',
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://api.example.test/auth/register', {
      body: JSON.stringify({
        displayName: 'Ana',
        email: 'ana@example.test',
        password: 'password123',
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });

  test('sends login request', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    }));
    const client = createAuthApiClient({
      baseUrl: 'http://api.example.test',
      fetchImpl,
    });

    await client.login({
      email: 'ana@example.test',
      password: 'password123',
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://api.example.test/auth/login', {
      body: JSON.stringify({
        email: 'ana@example.test',
        password: 'password123',
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });
});
