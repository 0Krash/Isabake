export {
  dedupeWorkspaces,
  getWorkspaceListKey,
  normalizeWorkspaceId,
} from '../../data/workspace/workspaceListModel';

export const getWorkspaceModeLabel = (workspace) =>
  workspace?.isRemote ? 'Compartido' : 'Solo local';

export const sanitizeMemberForDisplay = (member = {}) => ({
  role: member.role || 'member',
  status: member.status || 'active',
  userId: member.userId || member.email || 'sin_usuario',
});
