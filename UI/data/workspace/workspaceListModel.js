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

const mergeLocalWorkspace = (existing, next, currentWorkspace) => {
  if (!existing) {
    return next;
  }

  if (isSameWorkspaceIdentity(existing, next)) {
    return mergeWorkspace(existing, next, currentWorkspace);
  }

  if (currentWorkspace && isSameWorkspaceIdentity(next, currentWorkspace)) {
    return {
      ...existing,
      ...next,
    };
  }

  if (currentWorkspace && isSameWorkspaceIdentity(existing, currentWorkspace)) {
    return {
      ...next,
      ...existing,
    };
  }

  return existing;
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
  const byIdentity = new Map();
  const orderedIds = [];
  let localWorkspace = null;

  workspaces.forEach((workspace) => {
    if (!workspace?.isRemote) {
      localWorkspace = mergeLocalWorkspace(
        localWorkspace,
        workspace,
        currentWorkspace,
      );
      return;
    }

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

  const remoteWorkspaces = orderedIds.map((id) =>
    applyCurrentWorkspaceMetadata(byIdentity.get(id), currentWorkspace),
  );

  if (
    localWorkspace &&
    !remoteWorkspaces.some((workspace) =>
      isSameWorkspaceIdentity(workspace, localWorkspace),
    )
  ) {
    return [localWorkspace, ...remoteWorkspaces];
  }

  return remoteWorkspaces;
};

export default {
  dedupeWorkspaces,
  getWorkspaceListKey,
  normalizeWorkspaceId,
};
