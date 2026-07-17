import {
  dedupeWorkspaces,
  getWorkspaceListKey,
  normalizeWorkspaceId,
} from './workspaceListModel';

describe('workspaceListModel', () => {
  test('normalizes workspace ids and list keys', () => {
    expect(normalizeWorkspaceId({ groupId: 'group_1' })).toBe('group_1');
    expect(normalizeWorkspaceId({ workspaceId: 'workspace_1' })).toBe(
      'workspace_1',
    );
    expect(getWorkspaceListKey({ groupId: 'group_1', isRemote: true })).toBe(
      'remote:group_1',
    );
    expect(getWorkspaceListKey({ groupId: 'local_1', isRemote: false })).toBe(
      'local:local_1',
    );
  });

  test('dedupes duplicate remote workspaces by canonical id', () => {
    const result = dedupeWorkspaces([
      {
        groupId: 'group_1',
        isRemote: true,
        name: 'Old',
        workspaceRole: 'member',
      },
      {
        groupId: 'group_1',
        isRemote: true,
        name: 'New',
        workspaceRole: 'admin',
      },
    ]);

    expect(result).toEqual([
      expect.objectContaining({
        groupId: 'group_1',
        isRemote: true,
        name: 'New',
        workspaceRole: 'admin',
      }),
    ]);
  });

  test('dedupes duplicate local workspaces and keeps local-only visible', () => {
    const result = dedupeWorkspaces([
      {
        groupId: 'local_1',
        isRemote: false,
        name: 'Local A',
      },
      {
        groupId: 'local_1',
        isRemote: false,
        name: 'Local B',
      },
      {
        groupId: 'local_2',
        isRemote: false,
        name: 'Local only',
      },
    ]);

    expect(result).toEqual([
      expect.objectContaining({ groupId: 'local_1', name: 'Local B' }),
      expect.objectContaining({ groupId: 'local_2', name: 'Local only' }),
    ]);
  });

  test('prefers remote metadata when local and remote share the same group', () => {
    const result = dedupeWorkspaces(
      [
        {
          groupId: 'group_1',
          isRemote: false,
          name: 'Stored remote copy',
          workspaceRole: 'member',
        },
        {
          groupId: 'group_1',
          isRemote: true,
          name: 'Remote source',
          workspaceRole: 'owner',
        },
      ],
      {
        currentWorkspace: {
          groupId: 'group_1',
          isRemote: true,
          name: 'Current',
          workspaceStatus: 'active',
        },
      },
    );

    expect(result).toEqual([
      expect.objectContaining({
        groupId: 'group_1',
        isRemote: true,
        name: 'Remote source',
        workspaceRole: 'owner',
        workspaceStatus: 'active',
      }),
    ]);
    expect(result.map(getWorkspaceListKey)).toEqual(['remote:group_1']);
  });
});
