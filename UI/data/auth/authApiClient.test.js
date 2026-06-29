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
      deviceId: 'device_1',
      deviceName: 'iPhone',
      displayName: 'Ana',
      email: 'ana@example.test',
      password: 'password123',
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://api.example.test/auth/register', {
      body: JSON.stringify({
        deviceId: 'device_1',
        deviceName: 'iPhone',
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
      deviceId: 'device_1',
      deviceName: 'iPhone',
      email: 'ana@example.test',
      password: 'password123',
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://api.example.test/auth/login', {
      body: JSON.stringify({
        deviceId: 'device_1',
        deviceName: 'iPhone',
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

  test('sends list and revoke session requests', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    }));
    const client = createAuthApiClient({
      baseUrl: 'http://api.example.test',
      fetchImpl,
    });
    const authHeaders = { Authorization: 'Bearer jwt_access' };

    await client.listSessions({ authHeaders });
    await client.revokeSession({ authHeaders, sessionId: 'session_1' });
    await client.logout({
      authHeaders,
      refreshToken: 'jwt_refresh',
      sessionId: 'session_1',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.example.test/auth/sessions',
      expect.objectContaining({
        headers: expect.objectContaining(authHeaders),
        method: 'GET',
      }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.example.test/auth/sessions/session_1',
      expect.objectContaining({
        headers: expect.objectContaining(authHeaders),
        method: 'DELETE',
      }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.example.test/auth/logout',
      expect.objectContaining({
        body: JSON.stringify({
          refreshToken: 'jwt_refresh',
          sessionId: 'session_1',
        }),
        headers: expect.objectContaining(authHeaders),
        method: 'POST',
      }),
    );
  });

  test('sends workspace management requests', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    }));
    const client = createAuthApiClient({
      baseUrl: 'http://api.example.test',
      fetchImpl,
    });
    const authHeaders = { Authorization: 'Bearer jwt_access' };

    await client.listWorkspaces({ authHeaders });
    await client.createWorkspace({ authHeaders, name: 'Panaderia' });
    await client.listWorkspaceMembers({ authHeaders, groupId: 'group_1' });
    await client.addWorkspaceMember({
      authHeaders,
      groupId: 'group_1',
      role: 'member',
      status: 'active',
      userId: 'user_2',
    });
    await client.updateWorkspaceMember({
      authHeaders,
      groupId: 'group_1',
      role: 'viewer',
      status: 'active',
      userId: 'user_2',
    });
    await client.removeWorkspaceMember({
      authHeaders,
      groupId: 'group_1',
      userId: 'user_2',
    });
    await client.leaveWorkspace({ authHeaders, groupId: 'group_1' });

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.example.test/workspaces',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.example.test/workspaces',
      expect.objectContaining({
        body: JSON.stringify({
          name: 'Panaderia',
        }),
        method: 'POST',
      }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.example.test/workspaces/group_1/members',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.example.test/workspaces/group_1/members',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.example.test/workspaces/group_1/members/user_2',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.example.test/workspaces/group_1/members/user_2',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.example.test/workspaces/group_1/leave',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
