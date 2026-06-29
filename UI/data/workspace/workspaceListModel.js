export const normalizeWorkspaceId = (workspace = {}) =>
  String(
    workspace.groupId ||
      workspace.remoteGroupId ||
      workspace.workspaceId ||
      workspace.id ||
      '',
  ).trim();

export const getWorkspaceListKey = (workspace = {}) => {
  const id = normalizeWorkspaceId(workspace);
  const scope = workspace.isRemote ? 'remote' : 'local';

  return id ? `${scope}:${id}` : `${scope}:unknown`;
};

const isSameWorkspaceIdentity = (left, right) => {
  const leftId = normalizeWorkspaceId(left);
  const rightId = normalizeWorkspaceId(right);

  return Boolean(leftId && rightId && leftId === rightId);
};

const mergeWorkspace = (existing, next, currentWorkspace) => {
  const existingIsRemote = Boolean(existing?.isRemote);
  const nextIsRemote = Boolean(next?.isRemote);
  const preferred =
    nextIsRemote && !existingIsRemote
      ? next
      : existingIsRemote && !nextIsRemote
        ? existing
        : {
            ...existing,
            ...next,
          };
  const fallback = preferred === next ? existing : next;
  const merged = {
    ...fallback,
    ...preferred,
  };

  if (currentWorkspace && isSameWorkspaceIdentity(merged, currentWorkspace)) {
    return {
      ...currentWorkspace,
      ...merged,
      isRemote: merged.isRemote || currentWorkspace.isRemote,
      workspaceRole: merged.workspaceRole || currentWorkspace.workspaceRole,
      workspaceStatus:
        merged.workspaceStatus || currentWorkspace.workspaceStatus,
    };
  }

  return merged;
};

export const dedupeWorkspaces = (workspaces = [], { currentWorkspace } = {}) => {
  const byIdentity = new Map();
  const orderedIds = [];

  workspaces.forEach((workspace) => {
    const id = normalizeWorkspaceId(workspace);

    if (!id) {
      return;
    }

    if (!byIdentity.has(id)) {
      byIdentity.set(id, workspace);
      orderedIds.push(id);
      return;
    }

    byIdentity.set(
      id,
      mergeWorkspace(byIdentity.get(id), workspace, currentWorkspace),
    );
  });

  return orderedIds.map((id) => byIdentity.get(id));
};

export default {
  dedupeWorkspaces,
  getWorkspaceListKey,
  normalizeWorkspaceId,
};
