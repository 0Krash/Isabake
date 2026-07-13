import {
  getCollection,
  getDocument,
  saveDocument,
} from '../db/documentStore';
import { createLocalId, getLocalDeviceId } from '../db/localIds';

const WORKSPACE_COLLECTION = '__local_workspaces';
const LOCAL_META_COLLECTION = '__local_meta';
const CURRENT_WORKSPACE_DOCUMENT_ID = 'currentWorkspace';
const currentWorkspaceListeners = new Set();

const nowIso = () => new Date().toISOString();

const documentToWorkspace = (document) =>
  document
    ? {
        ...document.data,
        createdAt: document.createdAt,
        groupId: document.groupId || document.data?.groupId,
        isRemote: Boolean(document.data?.isRemote),
        ownerDeviceId: document.deviceId || document.data?.ownerDeviceId,
        ownerUserId: document.data?.ownerUserId || null,
        remoteGroupId: document.data?.remoteGroupId || null,
        syncStatus: document.syncStatus,
        updatedAt: document.updatedAt,
        workspaceId: document.id,
        workspaceRole: document.data?.workspaceRole || null,
      }
    : null;

export const subscribeToCurrentWorkspaceChanges = (listener) => {
  if (typeof listener !== 'function') {
    return () => {};
  }

  currentWorkspaceListeners.add(listener);
  return () => {
    currentWorkspaceListeners.delete(listener);
  };
};

const notifyCurrentWorkspaceChanged = (workspace) => {
  currentWorkspaceListeners.forEach((listener) => {
    listener(workspace);
  });
};

export const getCurrentWorkspace = async (options = {}) => {
  const pointerDocument = await getDocument(
    LOCAL_META_COLLECTION,
    CURRENT_WORKSPACE_DOCUMENT_ID,
    {
      db: options.db,
      includeDeleted: true,
    },
  );
  const workspaceId = pointerDocument?.data?.workspaceId;

  if (!workspaceId) {
    return null;
  }

  const workspaceDocument = await getDocument(WORKSPACE_COLLECTION, workspaceId, {
    db: options.db,
    includeDeleted: true,
  });

  return documentToWorkspace(workspaceDocument);
};

export const getLocalWorkspaces = async (options = {}) => {
  const workspaces = await getCollection(WORKSPACE_COLLECTION, {
    db: options.db,
    includeDeleted: true,
    order: 'ASC',
  });

  return workspaces.map(documentToWorkspace).filter(Boolean);
};

export const getFirstLocalOnlyWorkspace = async (options = {}) => {
  const workspaces = await getLocalWorkspaces(options);

  return (
    workspaces.find((workspace) => !workspace.isRemote) ||
    workspaces.find((workspace) => workspace.syncStatus === 'local') ||
    null
  );
};

export const setCurrentWorkspace = async (workspace, options = {}) => {
  if (!workspace?.workspaceId && !workspace?.groupId) {
    throw new Error('workspaceId o groupId requerido');
  }

  const workspaceId = workspace.workspaceId || workspace.groupId;
  const groupId = workspace.groupId || workspaceId;
  const timestamp = workspace.updatedAt || nowIso();
  const ownerDeviceId =
    workspace.ownerDeviceId || (await getLocalDeviceId({ db: options.db }));

  await saveDocument(
    WORKSPACE_COLLECTION,
    workspaceId,
    {
      groupId,
      isRemote: Boolean(workspace.isRemote),
      name: workspace.name || 'Workspace local',
      ownerDeviceId,
      ownerUserId: workspace.ownerUserId || null,
      remoteGroupId: workspace.remoteGroupId || null,
      workspaceId,
      workspaceRole: workspace.workspaceRole || null,
    },
    {
      createdAt: workspace.createdAt || timestamp,
      db: options.db,
      deviceId: ownerDeviceId,
      groupId,
      remoteId: workspace.remoteId || null,
      serverVersion: workspace.serverVersion || null,
      skipOutbox: true,
      syncStatus: workspace.syncStatus || 'local',
      updatedAt: timestamp,
    },
  );

  await saveDocument(
    LOCAL_META_COLLECTION,
    CURRENT_WORKSPACE_DOCUMENT_ID,
    {
      groupId,
      workspaceId,
    },
    {
      db: options.db,
      deviceId: ownerDeviceId,
      groupId: null,
      skipOutbox: true,
      syncStatus: 'local',
    },
  );

  const currentWorkspace = await getCurrentWorkspace(options);
  notifyCurrentWorkspaceChanged(currentWorkspace);
  return currentWorkspace;
};

export const createLocalWorkspace = async ({ name } = {}, options = {}) => {
  const existingLocalWorkspace = await getFirstLocalOnlyWorkspace(options);

  if (existingLocalWorkspace) {
    return setCurrentWorkspace(existingLocalWorkspace, options);
  }

  const workspaceId = createLocalId('workspace');

  return setCurrentWorkspace(
    {
      groupId: workspaceId,
      name: name || 'Workspace local',
      syncStatus: 'local',
      workspaceId,
    },
    options,
  );
};

export const getOrCreateDefaultLocalWorkspace = async (options = {}) => {
  const currentWorkspace = await getCurrentWorkspace(options);

  if (currentWorkspace) {
    return currentWorkspace;
  }

  const firstWorkspace = await getFirstLocalOnlyWorkspace(options);

  if (firstWorkspace) {
    return setCurrentWorkspace(firstWorkspace, options);
  }

  return createLocalWorkspace({ name: 'Workspace local' }, options);
};

export const clearCurrentWorkspace = async (options = {}) => {
  await saveDocument(
    LOCAL_META_COLLECTION,
    CURRENT_WORKSPACE_DOCUMENT_ID,
    {},
    {
      db: options.db,
      groupId: null,
      skipOutbox: true,
      syncStatus: 'local',
    },
  );

  notifyCurrentWorkspaceChanged(null);
  return null;
};

export default {
  clearCurrentWorkspace,
  createLocalWorkspace,
  getCurrentWorkspace,
  getFirstLocalOnlyWorkspace,
  getLocalWorkspaces,
  getOrCreateDefaultLocalWorkspace,
  setCurrentWorkspace,
  subscribeToCurrentWorkspaceChanges,
};
