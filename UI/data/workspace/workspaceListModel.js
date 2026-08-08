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

const applyCurrentWorkspaceMetadata = (workspace, currentWorkspace) => {
  if (!currentWorkspace || !isSameWorkspaceIdentity(workspace, currentWorkspace)) {
    return workspace;
  }

  return {
    ...currentWorkspace,
    ...workspace,
    isRemote: workspace.isRemote || currentWorkspace.isRemote,
    workspaceRole: workspace.workspaceRole || currentWorkspace.workspaceRole,
    workspaceStatus: workspace.workspaceStatus || currentWorkspace.workspaceStatus,
  };
};

export const dedupeWorkspaces = (workspaces = [], { currentWorkspace } = {}) => {
  const localByIdentity = new Map();
  const localOrderedIds = [];
  const remoteByIdentity = new Map();
  const remoteOrderedIds = [];

  workspaces.forEach((workspace) => {
    const id = normalizeWorkspaceId(workspace);

    if (!id) {
      return;
    }

    if (!workspace?.isRemote) {
      if (!localByIdentity.has(id)) {
        localByIdentity.set(id, workspace);
        localOrderedIds.push(id);
        return;
      }

      localByIdentity.set(
        id,
        mergeWorkspace(localByIdentity.get(id), workspace, currentWorkspace),
      );
      return;
    }

    if (!remoteByIdentity.has(id)) {
      remoteByIdentity.set(id, workspace);
      remoteOrderedIds.push(id);
      return;
    }

    remoteByIdentity.set(
      id,
      mergeWorkspace(remoteByIdentity.get(id), workspace, currentWorkspace),
    );
  });

  const localWorkspaces = localOrderedIds.map((id) =>
    applyCurrentWorkspaceMetadata(localByIdentity.get(id), currentWorkspace),
  );
  const remoteWorkspaces = remoteOrderedIds.map((id) =>
    applyCurrentWorkspaceMetadata(remoteByIdentity.get(id), currentWorkspace),
  );
  const visibleLocalWorkspaces = localWorkspaces.filter(
    (localWorkspace) =>
      !remoteWorkspaces.some((workspace) =>
        isSameWorkspaceIdentity(workspace, localWorkspace),
      ),
  );

  return [...visibleLocalWorkspaces, ...remoteWorkspaces];
};

export default {
  dedupeWorkspaces,
  getWorkspaceListKey,
  normalizeWorkspaceId,
};
