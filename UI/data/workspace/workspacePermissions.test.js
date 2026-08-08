import { canWriteToWorkspace } from './workspacePermissions';

describe('workspacePermissions', () => {
  test('viewer workspaces are read-only', () => {
    expect(canWriteToWorkspace({ workspaceRole: 'viewer' })).toBe(false);
  });

  test('local and editing roles can write', () => {
    expect(canWriteToWorkspace({ isRemote: false })).toBe(true);
    expect(canWriteToWorkspace({ workspaceRole: 'owner' })).toBe(true);
    expect(canWriteToWorkspace({ workspaceRole: 'admin' })).toBe(true);
    expect(canWriteToWorkspace({ workspaceRole: 'member' })).toBe(true);
  });
});
