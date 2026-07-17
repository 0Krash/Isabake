const mockLocalWorkspaces = [];
let mockCurrentWorkspace = null;
let mockCreatedLocalWorkspaceCount = 0;
const mockSetCurrentWorkspaceCalls = [];
const mockGetFreshAuthSession = jest.fn();
const mockGetFreshAuthHeaders = jest.fn();

jest.mock('../auth/authService', () => ({
  getFreshAuthHeaders: (...args) => mockGetFreshAuthHeaders(...args),
  getFreshAuthSession: (...args) => mockGetFreshAuthSession(...args),
}));

jest.mock('./workspaceRepository', () => ({
  createLocalWorkspace: jest.fn(async ({ name }) => {
    mockCreatedLocalWorkspaceCount += 1;
    const workspace = {
      groupId: `local_${mockCreatedLocalWorkspaceCount}`,
      isRemote: false,
      name,
      syncStatus: 'local',
      workspaceId: `local_${mockCreatedLocalWorkspaceCount}`,
    };
    mockLocalWorkspaces.push(workspace);
    mockCurrentWorkspace = workspace;
    return workspace;
  }),
  getCurrentWorkspace: jest.fn(async () => mockCurrentWorkspace),
  getFirstLocalOnlyWorkspace: jest.fn(async () =>
    mockLocalWorkspaces.find((workspace) => !workspace.isRemote) || null,
  ),
  getLocalWorkspaces: jest.fn(async () => mockLocalWorkspaces),
  getOrCreateDefaultLocalWorkspace: jest.fn(async () => {
    if (mockCurrentWorkspace) {
      return mockCurrentWorkspace;
    }

    const workspace = {
      groupId: 'local_default',
      isRemote: false,
      name: 'Workspace local',
      syncStatus: 'local',
      workspaceId: 'local_default',
    };
    mockLocalWorkspaces.push(workspace);
    mockCurrentWorkspace = workspace;
    return workspace;
  }),
  setCurrentWorkspace: jest.fn(async (workspace) => {
    mockSetCurrentWorkspaceCalls.push(workspace);
    mockCurrentWorkspace = workspace;
    return workspace;
  }),
}));

import {
  acceptWorkspaceInvitation,
  acceptWorkspaceInvitationByToken,
  createRemoteWorkspace,
  createWorkspaceInvitation,
  declineWorkspaceInvitation,
  declineWorkspaceInvitationByToken,
  disconnectLocalWorkspace,
  loadMyWorkspaceInvitations,
  loadWorkspaceInvitationPreviewByToken,
  loadWorkspaceInvitations,
  regenerateWorkspaceInvitationLink,
  refreshWorkspaceState,
  revokeWorkspaceInvitation,
  selectWorkspace,
  toRemoteWorkspaceMetadata,
} from './workspaceService';
import { getWorkspaceListKey } from './workspaceListModel';

describe('workspaceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalWorkspaces.length = 0;
    mockCurrentWorkspace = {
      groupId: 'local_1',
      isRemote: false,
      name: 'Local',
      syncStatus: 'local',
      workspaceId: 'local_1',
    };
    mockLocalWorkspaces.push(mockCurrentWorkspace);
    mockCreatedLocalWorkspaceCount = 0;
    mockSetCurrentWorkspaceCalls.length = 0;
    mockGetFreshAuthSession.mockResolvedValue({ accessToken: 'jwt_access' });
    mockGetFreshAuthHeaders.mockResolvedValue({
      Authorization: 'Bearer jwt_access',
    });
  });

  test('loads local and remote workspaces', async () => {
    const client = {
      listWorkspaces: jest.fn(async () => ({
        workspaces: [
          {
            groupId: 'group_1',
            membership: { role: 'admin', status: 'active' },
            name: 'Panaderia',
            workspaceId: 'group_1',
          },
        ],
      })),
    };

    const result = await refreshWorkspaceState({ client });

    expect(result.authRequired).toBe(false);
    expect(result.workspaces).toEqual([
      expect.objectContaining({ groupId: 'local_1', isRemote: false }),
      expect.objectContaining({
        groupId: 'group_1',
        isRemote: true,
        workspaceRole: 'admin',
      }),
    ]);
  });

  test('dedupes local stored remote workspace with backend workspace', async () => {
    mockCurrentWorkspace = {
      groupId: 'group_1',
      isRemote: true,
      name: 'Stored remote copy',
      syncStatus: 'remote',
      workspaceId: 'group_1',
      workspaceRole: 'member',
    };
    mockLocalWorkspaces.push(mockCurrentWorkspace);
    const client = {
      listWorkspaces: jest.fn(async () => ({
        workspaces: [
          {
            groupId: 'group_1',
            membership: { role: 'owner', status: 'active' },
            name: 'Remote source',
            workspaceId: 'group_1',
          },
          {
            groupId: 'group_1',
            membership: { role: 'owner', status: 'active' },
            name: 'Remote source duplicate',
            workspaceId: 'group_1',
          },
        ],
      })),
    };

    const result = await refreshWorkspaceState({ client });
    const keys = result.workspaces.map(getWorkspaceListKey);

    expect(keys).toEqual(['local:local_1', 'remote:group_1']);
    expect(new Set(keys).size).toBe(keys.length);
    expect(result.workspaces).toEqual([
      expect.objectContaining({ groupId: 'local_1', isRemote: false }),
      expect.objectContaining({
        groupId: 'group_1',
        isRemote: true,
        name: 'Remote source duplicate',
        workspaceRole: 'owner',
      }),
    ]);
  });

  test('returns local-only state when auth is missing', async () => {
    mockGetFreshAuthSession.mockRejectedValueOnce(new Error('auth_required'));

    const result = await refreshWorkspaceState({
      client: { listWorkspaces: jest.fn() },
    });

    expect(result.authRequired).toBe(true);
    expect(result.workspaces).toEqual([
      expect.objectContaining({ groupId: 'local_1' }),
    ]);
  });

  test('create remote workspace stores and selects metadata', async () => {
    const client = {
      createWorkspace: jest.fn(async () => ({
        workspace: {
          groupId: 'group_1',
          membership: { role: 'owner', status: 'active' },
          name: 'Panaderia',
          ownerUserId: 'owner',
          workspaceId: 'group_1',
        },
      })),
    };

    const result = await createRemoteWorkspace({ client, name: 'Panaderia' });

    expect(client.createWorkspace).toHaveBeenCalledWith({
      authHeaders: { Authorization: 'Bearer jwt_access' },
      name: 'Panaderia',
    });
    expect(result).toEqual(
      expect.objectContaining({
        groupId: 'group_1',
        isRemote: true,
        workspaceRole: 'owner',
      }),
    );
    expect(mockSetCurrentWorkspaceCalls).toHaveLength(1);
  });

  test('select workspace updates local pointer without sync calls', async () => {
    const workspace = toRemoteWorkspaceMetadata({
      groupId: 'group_2',
      membership: { role: 'member', status: 'active' },
      name: 'Sucursal',
      workspaceId: 'group_2',
    });

    await expect(selectWorkspace(workspace)).resolves.toEqual(
      expect.objectContaining({ groupId: 'group_2', isRemote: true }),
    );
    expect(mockSetCurrentWorkspaceCalls).toEqual([workspace]);
  });

  test('disconnect switches to local workspace without deleting documents', async () => {
    mockCurrentWorkspace = {
      groupId: 'group_1',
      isRemote: true,
      name: 'Remote',
      workspaceId: 'group_1',
    };

    const result = await disconnectLocalWorkspace({
      leaveRemote: false,
      workspace: mockCurrentWorkspace,
    });

    expect(result).toEqual(expect.objectContaining({ groupId: 'local_1' }));
    expect(mockSetCurrentWorkspaceCalls).toEqual([
      expect.objectContaining({ groupId: 'local_1' }),
    ]);
  });

  test('leave remote calls backend then switches to local workspace', async () => {
    const client = {
      leaveWorkspace: jest.fn(async () => ({ status: 'success' })),
    };
    const remote = {
      groupId: 'group_1',
      isRemote: true,
      name: 'Remote',
      workspaceId: 'group_1',
    };

    await disconnectLocalWorkspace({
      client,
      leaveRemote: true,
      workspace: remote,
    });

    expect(client.leaveWorkspace).toHaveBeenCalledWith({
      authHeaders: { Authorization: 'Bearer jwt_access' },
      groupId: 'group_1',
    });
    expect(mockSetCurrentWorkspaceCalls[0].groupId).toBe('local_1');
  });

  test('invitation APIs call backend with auth headers', async () => {
    const client = {
      acceptWorkspaceInvitation: jest.fn(async () => ({ status: 'success' })),
      acceptWorkspaceInvitationByToken: jest.fn(async () => ({
        status: 'success',
      })),
      createWorkspaceInvitation: jest.fn(async () => ({ status: 'success' })),
      declineWorkspaceInvitation: jest.fn(async () => ({ status: 'success' })),
      declineWorkspaceInvitationByToken: jest.fn(async () => ({
        status: 'success',
      })),
      getWorkspaceInvitationPreviewByToken: jest.fn(async () => ({
        invitation: { email: 'invitee@example.test' },
      })),
      listMyWorkspaceInvitations: jest.fn(async () => ({
        invitations: [{ invitationId: 'invitation_1' }],
      })),
      listWorkspaceInvitations: jest.fn(async () => ({
        invitations: [{ invitationId: 'invitation_2' }],
      })),
      regenerateWorkspaceInvitationLink: jest.fn(async () => ({
        status: 'success',
      })),
      revokeWorkspaceInvitation: jest.fn(async () => ({ status: 'success' })),
    };

    await createWorkspaceInvitation({
      client,
      email: 'invitee@example.test',
      groupId: 'group_1',
      role: 'member',
    });
    await loadWorkspaceInvitationPreviewByToken({
      client,
      token: 'invite_token_1',
    });
    await loadWorkspaceInvitations({ client, groupId: 'group_1' });
    await loadMyWorkspaceInvitations({ client });
    await acceptWorkspaceInvitation({ client, invitationId: 'invitation_1' });
    await acceptWorkspaceInvitationByToken({
      client,
      token: 'invite_token_1',
    });
    await declineWorkspaceInvitation({ client, invitationId: 'invitation_1' });
    await declineWorkspaceInvitationByToken({
      client,
      token: 'invite_token_1',
    });
    await regenerateWorkspaceInvitationLink({
      client,
      groupId: 'group_1',
      invitationId: 'invitation_1',
    });
    await revokeWorkspaceInvitation({
      client,
      groupId: 'group_1',
      invitationId: 'invitation_1',
    });

    expect(client.createWorkspaceInvitation).toHaveBeenCalledWith({
      authHeaders: { Authorization: 'Bearer jwt_access' },
      email: 'invitee@example.test',
      groupId: 'group_1',
      role: 'member',
    });
    expect(client.getWorkspaceInvitationPreviewByToken).toHaveBeenCalledWith({
      token: 'invite_token_1',
    });
    expect(client.listWorkspaceInvitations).toHaveBeenCalledWith({
      authHeaders: { Authorization: 'Bearer jwt_access' },
      groupId: 'group_1',
    });
    expect(client.listMyWorkspaceInvitations).toHaveBeenCalledWith({
      authHeaders: { Authorization: 'Bearer jwt_access' },
    });
    expect(client.acceptWorkspaceInvitation).toHaveBeenCalledWith({
      authHeaders: { Authorization: 'Bearer jwt_access' },
      invitationId: 'invitation_1',
    });
    expect(client.acceptWorkspaceInvitationByToken).toHaveBeenCalledWith({
      authHeaders: { Authorization: 'Bearer jwt_access' },
      token: 'invite_token_1',
    });
    expect(client.declineWorkspaceInvitation).toHaveBeenCalledWith({
      authHeaders: { Authorization: 'Bearer jwt_access' },
      invitationId: 'invitation_1',
    });
    expect(client.declineWorkspaceInvitationByToken).toHaveBeenCalledWith({
      authHeaders: { Authorization: 'Bearer jwt_access' },
      token: 'invite_token_1',
    });
    expect(client.regenerateWorkspaceInvitationLink).toHaveBeenCalledWith({
      authHeaders: { Authorization: 'Bearer jwt_access' },
      groupId: 'group_1',
      invitationId: 'invitation_1',
    });
    expect(client.revokeWorkspaceInvitation).toHaveBeenCalledWith({
      authHeaders: { Authorization: 'Bearer jwt_access' },
      groupId: 'group_1',
      invitationId: 'invitation_1',
    });
  });
});
