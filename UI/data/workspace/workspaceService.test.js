const mockLocalWorkspaces = [];
let mockCurrentWorkspace = null;
let mockCreatedLocalWorkspaceCount = 0;
const mockSetCurrentWorkspaceCalls = [];
const mockGetFreshAuthSession = jest.fn();
const mockGetFreshAuthHeaders = jest.fn();
const mockDocumentStore = new Map();

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
  deleteWorkspaceMetadata: jest.fn(async () => {}),
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
      name: 'Proyecto personal',
      syncStatus: 'local',
      workspaceId: 'local_default',
    };
    mockLocalWorkspaces.push(workspace);
    mockCurrentWorkspace = workspace;
    return workspace;
  }),
  getOrCreatePersonalWorkspace: jest.fn(async () => {
    const workspace =
      mockLocalWorkspaces.find((item) => !item.isRemote) || {
        groupId: 'local_default',
        isRemote: false,
        name: 'Proyecto personal',
        syncStatus: 'local',
        workspaceId: 'local_default',
      };

    if (!mockLocalWorkspaces.some((item) => item.groupId === workspace.groupId)) {
      mockLocalWorkspaces.push(workspace);
    }

    return workspace;
  }),
  saveWorkspace: jest.fn(async (workspace) => {
    const existingIndex = mockLocalWorkspaces.findIndex(
      (item) => item.groupId === workspace.groupId,
    );

    if (existingIndex >= 0) {
      mockLocalWorkspaces[existingIndex] = workspace;
    } else {
      mockLocalWorkspaces.push(workspace);
    }

    return workspace;
  }),
  setCurrentWorkspace: jest.fn(async (workspace) => {
    mockSetCurrentWorkspaceCalls.push(workspace);
    const existingIndex = mockLocalWorkspaces.findIndex(
      (item) => item.groupId === workspace.groupId,
    );

    if (existingIndex >= 0) {
      mockLocalWorkspaces[existingIndex] = workspace;
    } else {
      mockLocalWorkspaces.push(workspace);
    }

    mockCurrentWorkspace = workspace;
    return workspace;
  }),
}));

jest.mock('../db/documentStore', () => ({
  getDocument: jest.fn(async (collection, id) => {
    const document = mockDocumentStore.get(`${collection}:${id}`);
    return document || null;
  }),
  hardDeleteDocument: jest.fn(async () => {}),
  hardDeleteDocumentsByGroupId: jest.fn(async () => 0),
  saveDocument: jest.fn(async (collection, id, data, options = {}) => {
    const document = {
      collection,
      data,
      groupId: options.groupId || null,
      id,
    };
    mockDocumentStore.set(`${collection}:${id}`, document);
    return document;
  }),
}));

jest.mock('../sync/syncOutbox', () => ({
  deleteOutboxEventsByGroupId: jest.fn(async () => 0),
}));

jest.mock('../sync/syncStateRepository', () => ({
  deleteSyncState: jest.fn(async () => 0),
}));

import {
  acceptWorkspaceInvitation,
  acceptWorkspaceInvitationByToken,
  createPrivateWorkspace,
  createRemoteWorkspace,
  createWorkspaceInvitation,
  deletePrivateWorkspace,
  deleteRemoteWorkspace,
  declineWorkspaceInvitation,
  declineWorkspaceInvitationByToken,
  disconnectLocalWorkspace,
  loadCachedWorkspaceDetails,
  loadCachedWorkspaceMembers,
  loadCachedWorkspaceInvitations,
  loadCachedMyWorkspaceInvitations,
  loadCachedWorkspaceState,
  loadMyWorkspaceInvitations,
  loadWorkspaceMembers,
  loadWorkspaceInvitationPreviewByToken,
  loadWorkspaceInvitations,
  regenerateWorkspaceInvitationLink,
  refreshWorkspaceState,
  revokeWorkspaceInvitation,
  selectWorkspace,
  toRemoteWorkspaceMetadata,
  updatePrivateWorkspace,
  updateRemoteWorkspace,
} from './workspaceService';
import { deleteWorkspaceMetadata } from './workspaceRepository';
import { hardDeleteDocumentsByGroupId } from '../db/documentStore';
import { deleteOutboxEventsByGroupId } from '../sync/syncOutbox';
import { deleteSyncState } from '../sync/syncStateRepository';
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
    mockDocumentStore.clear();
    mockGetFreshAuthSession.mockResolvedValue({ accessToken: 'jwt_access' });
    mockGetFreshAuthHeaders.mockResolvedValue({
      Authorization: 'Bearer jwt_access',
    });
  });

  test('loads local and remote workspaces', async () => {
    const client = {
      listMyWorkspaceInvitations: jest.fn(async () => ({
        invitations: [
          { invitationId: 'mine_1', status: 'invited' },
          { invitationId: 'mine_accepted', status: 'accepted' },
        ],
      })),
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
    expect(result.myInvitations).toEqual([
      { invitationId: 'mine_1', status: 'invited' },
    ]);
    expect(result.workspaces).toEqual([
      expect.objectContaining({ groupId: 'local_1', isRemote: false }),
      expect.objectContaining({
        groupId: 'group_1',
        isRemote: true,
        workspaceRole: 'admin',
      }),
    ]);
  });

  test('tags refreshed remote workspaces with the authenticated account', async () => {
    mockGetFreshAuthSession.mockResolvedValueOnce({
      accessToken: 'jwt_access',
      userId: 'account_1',
    });
    const client = {
      listMyWorkspaceInvitations: jest.fn(async () => ({ invitations: [] })),
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

    expect(result.remoteWorkspaces).toEqual([
      expect.objectContaining({
        accountUserId: 'account_1',
        groupId: 'group_1',
      }),
    ]);
    expect(mockLocalWorkspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountUserId: 'account_1',
          groupId: 'group_1',
        }),
      ]),
    );
  });

  test('hides cached remote workspaces from a different authenticated account', async () => {
    const cachedRemoteWorkspace = {
      accountUserId: 'account_1',
      groupId: 'group_1',
      isRemote: true,
      name: 'Panaderia',
      syncStatus: 'remote',
      workspaceId: 'group_1',
      workspaceRole: 'owner',
    };
    mockCurrentWorkspace = cachedRemoteWorkspace;
    mockLocalWorkspaces.push(cachedRemoteWorkspace);

    const result = await loadCachedWorkspaceState({
      session: { userId: 'account_2' },
    });

    expect(result.currentWorkspace).toEqual(
      expect.objectContaining({ groupId: 'local_1', isRemote: false }),
    );
    expect(result.remoteWorkspaces).toEqual([]);
    expect(result.workspaces).toEqual([
      expect.objectContaining({ groupId: 'local_1', isRemote: false }),
    ]);
    expect(mockSetCurrentWorkspaceCalls).toEqual([
      expect.objectContaining({ groupId: 'local_1', isRemote: false }),
    ]);
  });

  test('can hide cached remote workspaces while auth session is unresolved', async () => {
    const cachedRemoteWorkspace = {
      accountUserId: 'account_1',
      groupId: 'group_1',
      isRemote: true,
      name: 'Panaderia',
      syncStatus: 'remote',
      workspaceId: 'group_1',
      workspaceRole: 'owner',
    };
    mockCurrentWorkspace = cachedRemoteWorkspace;
    mockLocalWorkspaces.push(cachedRemoteWorkspace);

    const result = await loadCachedWorkspaceState({
      includeRemoteWithoutSession: false,
      session: null,
    });

    expect(result.currentWorkspace).toEqual(
      expect.objectContaining({ groupId: 'local_1', isRemote: false }),
    );
    expect(result.remoteWorkspaces).toEqual([]);
    expect(result.workspaces).toEqual([
      expect.objectContaining({ groupId: 'local_1', isRemote: false }),
    ]);
    expect(hardDeleteDocumentsByGroupId).not.toHaveBeenCalled();
    expect(deleteWorkspaceMetadata).not.toHaveBeenCalled();
  });

  test('refresh updates current remote workspace membership metadata', async () => {
    mockCurrentWorkspace = {
      groupId: 'group_1',
      isRemote: true,
      name: 'Panaderia',
      remoteGroupId: 'group_1',
      syncStatus: 'remote',
      workspaceId: 'group_1',
      workspaceRole: null,
      workspaceStatus: null,
    };

    const client = {
      listMyWorkspaceInvitations: jest.fn(async () => ({ invitations: [] })),
      listWorkspaces: jest.fn(async () => ({
        workspaces: [
          {
            groupId: 'group_1',
            membership: { role: 'owner', status: 'active' },
            name: 'Panaderia',
            ownerUserId: 'owner',
            workspaceId: 'group_1',
          },
        ],
      })),
    };

    const result = await refreshWorkspaceState({ client });

    expect(result.currentWorkspace).toEqual(
      expect.objectContaining({
        groupId: 'group_1',
        isRemote: true,
        workspaceRole: 'owner',
        workspaceStatus: 'active',
      }),
    );
    expect(mockSetCurrentWorkspaceCalls.at(-1)).toEqual(
      expect.objectContaining({
        groupId: 'group_1',
        workspaceRole: 'owner',
      }),
    );
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

  test('hides cached remote workspaces missing from authenticated backend list', async () => {
    mockCurrentWorkspace = {
      groupId: 'group_removed',
      isRemote: true,
      name: 'Cached removed workspace',
      syncStatus: 'remote',
      workspaceId: 'group_removed',
      workspaceRole: 'member',
    };
    mockLocalWorkspaces.push(mockCurrentWorkspace);
    const client = {
      listWorkspaces: jest.fn(async () => ({
        workspaces: [],
      })),
    };

    const result = await refreshWorkspaceState({ client });

    expect(result.authRequired).toBe(false);
    expect(result.currentWorkspace).toEqual(
      expect.objectContaining({ groupId: 'local_1', isRemote: false }),
    );
    expect(result.workspaces).toEqual([
      expect.objectContaining({ groupId: 'local_1', isRemote: false }),
    ]);
    expect(
      result.workspaces.some((workspace) => workspace.groupId === 'group_removed'),
    ).toBe(false);
    expect(mockSetCurrentWorkspaceCalls).toEqual([
      expect.objectContaining({ groupId: 'local_1', isRemote: false }),
    ]);
    expect(deleteOutboxEventsByGroupId).toHaveBeenCalledWith('group_removed');
    expect(deleteSyncState).toHaveBeenCalledWith('group_removed');
    expect(hardDeleteDocumentsByGroupId).toHaveBeenCalledWith('group_removed');
    expect(deleteWorkspaceMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: 'group_removed',
        isRemote: true,
        workspaceId: 'group_removed',
      }),
    );
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

  test('strict refresh does not expose cached remote workspaces when auth is missing', async () => {
    mockGetFreshAuthSession.mockRejectedValueOnce(new Error('auth_required'));
    mockLocalWorkspaces.push({
      accountUserId: 'account_1',
      groupId: 'group_1',
      isRemote: true,
      name: 'Cuenta 1',
      syncStatus: 'remote',
      workspaceId: 'group_1',
    });
    mockLocalWorkspaces.push({
      accountUserId: 'account_2',
      groupId: 'group_2',
      isRemote: true,
      name: 'Cuenta 2',
      syncStatus: 'remote',
      workspaceId: 'group_2',
    });

    const result = await refreshWorkspaceState({
      client: { listWorkspaces: jest.fn() },
      includeRemoteWithoutSession: false,
      session: null,
    });

    expect(result.authRequired).toBe(true);
    expect(result.remoteWorkspaces).toEqual([]);
    expect(result.workspaces).toEqual([
      expect.objectContaining({ groupId: 'local_1', isRemote: false }),
    ]);
  });

  test('create remote workspace stores and selects metadata', async () => {
    mockGetFreshAuthSession.mockResolvedValueOnce({
      accessToken: 'jwt_access',
      userId: 'account_1',
    });
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
        accountUserId: 'account_1',
        workspaceRole: 'owner',
      }),
    );
    expect(mockSetCurrentWorkspaceCalls).toHaveLength(1);
  });

  test('keeps a newly created shared workspace visible for the same account cache load', async () => {
    mockGetFreshAuthSession.mockResolvedValueOnce({
      accessToken: 'jwt_access',
      userId: 'account_1',
    });
    const client = {
      createWorkspace: jest.fn(async () => ({
        workspace: {
          groupId: 'group_1',
          membership: { role: 'owner', status: 'active' },
          name: 'Panaderia',
          workspaceId: 'group_1',
        },
      })),
    };

    await createRemoteWorkspace({ client, name: 'Panaderia' });
    const result = await loadCachedWorkspaceState({
      session: { userId: 'account_1' },
    });

    expect(result.currentWorkspace).toEqual(
      expect.objectContaining({
        accountUserId: 'account_1',
        groupId: 'group_1',
        isRemote: true,
      }),
    );
    expect(result.remoteWorkspaces).toEqual([
      expect.objectContaining({
        accountUserId: 'account_1',
        groupId: 'group_1',
      }),
    ]);
  });

  test('update remote workspace renames and selects metadata', async () => {
    const client = {
      updateWorkspace: jest.fn(async () => ({
        workspace: {
          groupId: 'group_1',
          membership: { role: 'owner', status: 'active' },
          name: 'Panaderia Norte',
          ownerUserId: 'owner',
          workspaceId: 'group_1',
        },
      })),
    };

    const result = await updateRemoteWorkspace({
      client,
      groupId: 'group_1',
      name: 'Panaderia Norte',
    });

    expect(client.updateWorkspace).toHaveBeenCalledWith({
      authHeaders: { Authorization: 'Bearer jwt_access' },
      groupId: 'group_1',
      name: 'Panaderia Norte',
    });
    expect(result).toEqual(
      expect.objectContaining({
        groupId: 'group_1',
        isRemote: true,
        name: 'Panaderia Norte',
      }),
    );
    expect(mockSetCurrentWorkspaceCalls).toEqual([
      expect.objectContaining({ name: 'Panaderia Norte' }),
    ]);
  });

  test('create private workspace creates a local project without backend calls', async () => {
    const result = await createPrivateWorkspace({ name: 'Privado A' });

    expect(result).toEqual(
      expect.objectContaining({
        groupId: 'local_1',
        isRemote: false,
        name: 'Privado A',
      }),
    );
    expect(mockCreatedLocalWorkspaceCount).toBe(1);
  });

  test('update private workspace renames the same local project', async () => {
    const workspace = {
      groupId: 'local_1',
      isRemote: false,
      name: 'Privado A',
      syncStatus: 'local',
      workspaceId: 'local_1',
    };
    mockCurrentWorkspace = workspace;

    const result = await updatePrivateWorkspace({
      name: 'Privado editado',
      workspace,
    });

    expect(result).toEqual(
      expect.objectContaining({
        groupId: 'local_1',
        isRemote: false,
        name: 'Privado editado',
      }),
    );
    expect(mockCreatedLocalWorkspaceCount).toBe(0);
    expect(mockSetCurrentWorkspaceCalls).toEqual([
      expect.objectContaining({
        groupId: 'local_1',
        name: 'Privado editado',
      }),
    ]);
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

  test('remote workspace metadata uses group id as canonical local identity', () => {
    const workspace = toRemoteWorkspaceMetadata({
      groupId: 'owner_group',
      membership: { role: 'owner', status: 'active' },
      name: 'S1',
      workspaceId: 'legacy_workspace_id',
    });

    expect(workspace).toEqual(
      expect.objectContaining({
        groupId: 'owner_group',
        remoteGroupId: 'owner_group',
        workspaceId: 'owner_group',
        workspaceRole: 'owner',
      }),
    );
  });

  test('accept invitation selects accepted workspace metadata', async () => {
    const client = {
      acceptWorkspaceInvitation: jest.fn(async () => ({
        invitation: {
          groupId: 'group_invited',
          role: 'member',
          status: 'accepted',
          workspace: { name: 'Panaderia Invitada' },
          workspaceId: 'group_invited',
        },
        status: 'success',
      })),
    };

    await acceptWorkspaceInvitation({
      client,
      invitationId: 'invitation_1',
    });

    expect(mockSetCurrentWorkspaceCalls).toEqual([
      expect.objectContaining({
        groupId: 'group_invited',
        isRemote: true,
        name: 'Panaderia Invitada',
        workspaceRole: 'member',
        workspaceStatus: 'active',
      }),
    ]);
  });

  test('disconnect switches to personal project without deleting documents', async () => {
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

  test('leave remote calls backend then switches to personal project', async () => {
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

  test('delete remote workspace calls backend delete then switches to personal project', async () => {
    const client = {
      deleteWorkspace: jest.fn(async () => ({ status: 'success' })),
    };

    await deleteRemoteWorkspace({
      client,
      groupId: 'group_1',
      workspace: {
        groupId: 'group_1',
        isRemote: true,
        workspaceId: 'workspace_1',
      },
    });

    expect(client.deleteWorkspace).toHaveBeenCalledWith({
      authHeaders: { Authorization: 'Bearer jwt_access' },
      groupId: 'group_1',
    });
    expect(deleteOutboxEventsByGroupId).toHaveBeenCalledWith('group_1');
    expect(deleteSyncState).toHaveBeenCalledWith('group_1');
    expect(hardDeleteDocumentsByGroupId).toHaveBeenCalledWith('group_1');
    expect(deleteWorkspaceMetadata).toHaveBeenCalledWith({
      groupId: 'group_1',
      isRemote: true,
      workspaceId: 'workspace_1',
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
        invitations: [
          { invitationId: 'invitation_1', status: 'invited' },
          { invitationId: 'invitation_old', status: 'accepted' },
        ],
      })),
      listWorkspaceInvitations: jest.fn(async () => ({
        invitations: [
          { invitationId: 'invitation_2', status: 'invited' },
          { invitationId: 'invitation_accepted', status: 'accepted' },
        ],
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
    await expect(
      loadWorkspaceInvitations({ client, groupId: 'group_1' }),
    ).resolves.toEqual([{ invitationId: 'invitation_2', status: 'invited' }]);
    await expect(loadMyWorkspaceInvitations({ client })).resolves.toEqual([
      { invitationId: 'invitation_1', status: 'invited' },
    ]);
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

  test('caches workspace members and invitations for offline display', async () => {
    const client = {
      listMyWorkspaceInvitations: jest.fn(async () => ({
        invitations: [{ invitationId: 'mine_1', status: 'invited' }],
      })),
      listWorkspaceInvitations: jest.fn(async () => ({
        invitations: [{ invitationId: 'invitation_1', status: 'invited' }],
      })),
      listWorkspaceMembers: jest.fn(async () => ({
        members: [{ role: 'owner', status: 'active', userId: 'owner_1' }],
      })),
    };

    await loadWorkspaceMembers({ client, groupId: 'group_1' });
    await loadWorkspaceInvitations({ client, groupId: 'group_1' });
    await loadMyWorkspaceInvitations({ client });

    await expect(loadCachedWorkspaceMembers('group_1')).resolves.toEqual([
      { role: 'owner', status: 'active', userId: 'owner_1' },
    ]);
    await expect(loadCachedWorkspaceInvitations('group_1')).resolves.toEqual([
      { invitationId: 'invitation_1', status: 'invited' },
    ]);
    await expect(loadCachedMyWorkspaceInvitations()).resolves.toEqual([
      { invitationId: 'mine_1', status: 'invited' },
    ]);
    await expect(
      loadCachedWorkspaceDetails({ groupId: 'group_1', isRemote: true }),
    ).resolves.toEqual({
      invitations: [{ invitationId: 'invitation_1', status: 'invited' }],
      members: [{ role: 'owner', status: 'active', userId: 'owner_1' }],
    });
  });
});
