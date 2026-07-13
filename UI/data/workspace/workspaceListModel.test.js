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

  test('collapses local workspaces into one local-only entry', () => {
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
    ]);
  });

  test('keeps the current local workspace when old local duplicates exist', () => {
    const result = dedupeWorkspaces(
      [
        {
          groupId: 'local_1',
          isRemote: false,
          name: 'Old local',
        },
        {
          groupId: 'local_2',
          isRemote: false,
          name: 'Current local',
        },
      ],
      {
        currentWorkspace: {
          groupId: 'local_2',
          isRemote: false,
          name: 'Current local',
        },
      },
    );

    expect(result).toEqual([
      expect.objectContaining({ groupId: 'local_2', name: 'Current local' }),
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
