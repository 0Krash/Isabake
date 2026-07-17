const mockDocuments = new Map();
const mockSavedDocuments = [];
const mockAssignedGroupIds = [];
let mockLocalIdCounter = 0;

const documentKey = (collection, id) => `${collection}:${id}`;

jest.mock('../db/localIds', () => ({
  createLocalId: (prefix) => {
    mockLocalIdCounter += 1;
    return `${prefix}_local_${mockLocalIdCounter}`;
  },
  getLocalDeviceId: jest.fn(async () => 'device_local_1'),
}));

jest.mock('../db/documentStore', () => ({
  assignDocumentGroupId: jest.fn(async (collection, id, groupId) => {
    mockAssignedGroupIds.push({ collection, groupId, id });
    return { collection, groupId, id };
  }),
  getCollection: jest.fn(async (collection) =>
    Array.from(mockDocuments.values()).filter(
      (document) => document.collection === collection,
    ),
  ),
  getDocument: jest.fn(async (collection, id) =>
    mockDocuments.get(documentKey(collection, id)) || null,
  ),
  getDocumentsMissingGroupId: jest.fn(async () => [
    { collection: 'recipes', id: 'recipe_1' },
    { collection: 'inventory', id: 'inventory_1' },
    { collection: 'inventory', id: 'inventory_2' },
  ]),
  hardDeleteDocument: jest.fn(async (collection, id) => {
    mockDocuments.delete(documentKey(collection, id));
  }),
  saveDocument: jest.fn(async (collection, id, data, options = {}) => {
    const document = {
      collection,
      createdAt: options.createdAt || 'created_at',
      data,
      deviceId: options.deviceId || null,
      groupId: options.groupId || null,
      id,
      syncStatus: options.syncStatus || 'pending',
      updatedAt: options.updatedAt || 'updated_at',
    };

    mockDocuments.set(documentKey(collection, id), document);
    mockSavedDocuments.push(document);

    return document;
  }),
}));

import {
  assignUngroupedLocalDataToCurrentWorkspace,
  getCurrentGroupId,
} from './currentWorkspace';
import {
  getCurrentWorkspace,
  createLocalWorkspace,
  getLocalWorkspaces,
  getOrCreatePersonalWorkspace,
  setCurrentWorkspace,
  subscribeToCurrentWorkspaceChanges,
} from './workspaceRepository';

describe('currentWorkspace', () => {
  beforeEach(() => {
    mockDocuments.clear();
    mockSavedDocuments.length = 0;
    mockAssignedGroupIds.length = 0;
    mockLocalIdCounter = 0;
  });

  test('creates a default personal project when no current workspace exists', async () => {
    await expect(getCurrentGroupId()).resolves.toBe('workspace_local_1');

    expect(mockSavedDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: '__local_workspaces',
          groupId: 'workspace_local_1',
          id: 'workspace_local_1',
        }),
        expect.objectContaining({
          collection: '__local_meta',
          id: 'currentWorkspace',
        }),
      ]),
    );
  });

  test('creates another personal project when requested', async () => {
    await createLocalWorkspace({ name: 'Negocio personal' });
    mockSavedDocuments.length = 0;

    const workspace = await createLocalWorkspace({ name: 'Otro local' });

    expect(workspace).toEqual(
      expect.objectContaining({
        groupId: 'workspace_local_2',
        isRemote: false,
        name: 'Otro local',
      }),
    );
    expect(
      mockSavedDocuments.filter(
        (document) => document.collection === '__local_workspaces',
      ),
    ).toHaveLength(1);
    expect(mockSavedDocuments[0]).toEqual(
      expect.objectContaining({
        groupId: 'workspace_local_2',
        id: 'workspace_local_2',
      }),
    );
  });

  test('reuses the first personal project for default fallbacks', async () => {
    await createLocalWorkspace({ name: 'Negocio personal' });
    mockSavedDocuments.length = 0;

    const workspace = await getOrCreatePersonalWorkspace();

    expect(workspace).toEqual(
      expect.objectContaining({
        groupId: 'workspace_local_1',
        name: 'Negocio personal',
      }),
    );
    expect(
      mockSavedDocuments.filter(
        (document) => document.collection === '__local_workspaces',
      ),
    ).toHaveLength(0);
  });

  test('removes duplicated default personal projects from local metadata', async () => {
    await createLocalWorkspace({ name: 'Negocio personal' });
    await createLocalWorkspace({ name: 'Negocio personal' });
    await createLocalWorkspace({ name: 'Privado especial' });

    const workspaces = await getLocalWorkspaces();

    expect(
      workspaces.filter((workspace) => workspace.name === 'Negocio personal'),
    ).toHaveLength(1);
    expect(
      workspaces.filter((workspace) => workspace.name === 'Privado especial'),
    ).toHaveLength(1);
  });

  test('dry-run assignment previews ungrouped shared data without assigning', async () => {
    const result = await assignUngroupedLocalDataToCurrentWorkspace({
      dryRun: true,
    });

    expect(result).toEqual(
      expect.objectContaining({
        assignedCount: 0,
        dryRun: true,
        groupId: 'workspace_local_1',
        inspectedCount: 3,
      }),
    );
    expect(result.countsByCollection).toEqual({
      inventory: 2,
      recipes: 1,
    });
    expect(mockAssignedGroupIds).toEqual([]);
  });

  test('real assignment applies current groupId to each ungrouped shared document', async () => {
    const result = await assignUngroupedLocalDataToCurrentWorkspace({
      dryRun: false,
    });

    expect(result.assignedCount).toBe(3);
    expect(mockAssignedGroupIds).toEqual([
      { collection: 'recipes', groupId: 'workspace_local_1', id: 'recipe_1' },
      {
        collection: 'inventory',
        groupId: 'workspace_local_1',
        id: 'inventory_1',
      },
      {
        collection: 'inventory',
        groupId: 'workspace_local_1',
        id: 'inventory_2',
      },
    ]);
  });

  test('stores remote workspace metadata as current workspace', async () => {
    await setCurrentWorkspace({
      accountUserId: 'user_1',
      groupId: 'remote_group_1',
      isRemote: true,
      name: 'Workspace remoto',
      ownerUserId: 'user_owner',
      remoteGroupId: 'remote_group_1',
      syncStatus: 'remote',
      workspaceId: 'remote_group_1',
      workspaceRole: 'admin',
    });

    await expect(getCurrentGroupId()).resolves.toBe('remote_group_1');
    await expect(getCurrentWorkspace()).resolves.toEqual(
      expect.objectContaining({
        accountUserId: 'user_1',
        groupId: 'remote_group_1',
        isRemote: true,
        ownerUserId: 'user_owner',
        remoteGroupId: 'remote_group_1',
        syncStatus: 'remote',
        workspaceRole: 'admin',
      }),
    );
  });

  test('notifies subscribers when current workspace changes', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToCurrentWorkspaceChanges(listener);

    await setCurrentWorkspace({
      groupId: 'workspace_a',
      name: 'Negocio A',
      workspaceId: 'workspace_a',
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: 'workspace_a',
        name: 'Negocio A',
      }),
    );

    unsubscribe();
    listener.mockClear();

    await setCurrentWorkspace({
      groupId: 'workspace_b',
      name: 'Negocio B',
      workspaceId: 'workspace_b',
    });

    expect(listener).not.toHaveBeenCalled();
  });
});
