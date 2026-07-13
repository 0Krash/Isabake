export const canWriteToWorkspace = (workspace = {}) =>
  workspace?.workspaceRole !== 'viewer';

export default {
  canWriteToWorkspace,
};
