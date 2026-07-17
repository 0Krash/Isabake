const mockDocuments = new Map();
const mockSavedDocuments = [];
const mockAssignedGroupIds = [];

const documentKey = (collection, id) => `${collection}:${id}`;

jest.mock('../db/localIds', () => ({
  createLocalId: (prefix) => `${prefix}_local_1`,
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
import { getCurrentWorkspace, setCurrentWorkspace } from './workspaceRepository';

describe('currentWorkspace', () => {
  beforeEach(() => {
    mockDocuments.clear();
    mockSavedDocuments.length = 0;
    mockAssignedGroupIds.length = 0;
  });

  test('creates a default local workspace when no current workspace exists', async () => {
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
        groupId: 'remote_group_1',
        isRemote: true,
        ownerUserId: 'user_owner',
        remoteGroupId: 'remote_group_1',
        syncStatus: 'remote',
        workspaceRole: 'admin',
      }),
    );
  });
});
