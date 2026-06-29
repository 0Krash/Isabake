import {
  dedupeWorkspaces,
  getWorkspaceListKey,
  getWorkspaceModeLabel,
  sanitizeMemberForDisplay,
} from './workspaceUiModel';

describe('WorkspaceScreen model helpers', () => {
  test('labels local-only and shared workspace modes', () => {
    expect(getWorkspaceModeLabel({ isRemote: false })).toBe('Solo local');
    expect(getWorkspaceModeLabel({ isRemote: true })).toBe('Compartido');
    expect(getWorkspaceModeLabel(null)).toBe('Solo local');
  });

  test('sanitizes member display without exposing tokens', () => {
    expect(
      sanitizeMemberForDisplay({
        accessToken: 'secret',
        refreshToken: 'secret',
        role: 'admin',
        status: 'active',
        userId: 'user_1',
      }),
    ).toEqual({
      role: 'admin',
      status: 'active',
      userId: 'user_1',
    });
  });

  test('workspace list model produces unique render keys after dedupe', () => {
    const workspaces = dedupeWorkspaces([
      { groupId: 'local_1', isRemote: false, name: 'Local' },
      { groupId: 'group_1', isRemote: true, name: 'Remote A' },
      { groupId: 'group_1', isRemote: true, name: 'Remote B' },
      { groupId: 'group_2', isRemote: true, name: 'Remote C' },
    ]);
    const keys = workspaces.map(getWorkspaceListKey);

    expect(keys).toEqual(['local:local_1', 'remote:group_1', 'remote:group_2']);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
