import {
  getCollection,
  getDocument,
  hardDeleteDocument,
  saveDocument,
} from '../db/documentStore';
import { createLocalId, getLocalDeviceId } from '../db/localIds';

const WORKSPACE_COLLECTION = '__local_workspaces';
const LOCAL_META_COLLECTION = '__local_meta';
const CURRENT_WORKSPACE_DOCUMENT_ID = 'currentWorkspace';
const currentWorkspaceListeners = new Set();
let cachedCurrentWorkspace = null;

const nowIso = () => new Date().toISOString();
const PERSONAL_WORKSPACE_NAME = 'Negocio personal';

const getWorkspaceGroupId = (workspace = {}) =>
  workspace.groupId || workspace.remoteGroupId || workspace.workspaceId;

const getWorkspaceDocumentId = (workspace = {}) => {
  const groupId = getWorkspaceGroupId(workspace);

  return workspace.isRemote ? groupId : workspace.workspaceId || groupId;
};

const documentToWorkspace = (document) =>
  document
    ? {
        ...document.data,
        accountUserId: document.data?.accountUserId || null,
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
  cachedCurrentWorkspace = workspace || null;
  currentWorkspaceListeners.forEach((listener) => {
    listener(workspace);
  });
};

export const getCachedCurrentWorkspace = () => cachedCurrentWorkspace;

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
    cachedCurrentWorkspace = null;
    return null;
  }

  const workspaceDocument = await getDocument(WORKSPACE_COLLECTION, workspaceId, {
    db: options.db,
    includeDeleted: true,
  });

  const currentWorkspace = documentToWorkspace(workspaceDocument);
  cachedCurrentWorkspace = currentWorkspace;
  return currentWorkspace;
};

export const getLocalWorkspaces = async (options = {}) => {
  const workspaces = await getCollection(WORKSPACE_COLLECTION, {
    db: options.db,
    includeDeleted: true,
    order: 'ASC',
  });
  const personalWorkspaces = workspaces.filter((document) => {
    const data = document?.data || {};
    const name = String(data.name || '').trim();

    return !data.isRemote && name === PERSONAL_WORKSPACE_NAME;
  });

  if (personalWorkspaces.length > 1) {
    const [, ...duplicates] = personalWorkspaces;
    await Promise.all(
      duplicates.map((document) =>
        hardDeleteDocument(WORKSPACE_COLLECTION, document.id, options),
      ),
    );

    return workspaces
      .filter(
        (document) =>
          !duplicates.some((duplicate) => duplicate.id === document.id),
      )
      .map(documentToWorkspace)
      .filter(Boolean);
  }

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

const saveWorkspaceMetadata = async (workspace, options = {}) => {
  const groupId = getWorkspaceGroupId(workspace);
  const workspaceId = getWorkspaceDocumentId(workspace);

  if (!workspaceId || !groupId) {
    throw new Error('workspaceId o groupId requerido');
  }

  const timestamp = workspace.updatedAt || nowIso();
  const ownerDeviceId =
    workspace.ownerDeviceId || (await getLocalDeviceId({ db: options.db }));

  await saveDocument(
    WORKSPACE_COLLECTION,
    workspaceId,
    {
      groupId,
      accountUserId: workspace.accountUserId || null,
      isRemote: Boolean(workspace.isRemote),
      name: workspace.name || 'Negocio personal',
      ownerDeviceId,
      ownerUserId: workspace.ownerUserId || null,
      remoteGroupId: workspace.isRemote ? groupId : workspace.remoteGroupId || null,
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

  return getDocument(WORKSPACE_COLLECTION, workspaceId, {
    db: options.db,
    includeDeleted: true,
  });
};

export const saveWorkspace = async (workspace, options = {}) => {
  const workspaceDocument = await saveWorkspaceMetadata(workspace, options);
  return documentToWorkspace(workspaceDocument);
};

export const deleteWorkspaceMetadata = async (workspace = {}, options = {}) => {
  const workspaceId = getWorkspaceDocumentId(workspace);

  if (!workspaceId) {
    return;
  }

  await hardDeleteDocument(WORKSPACE_COLLECTION, workspaceId, options);
};

export const setCurrentWorkspace = async (workspace, options = {}) => {
  await saveWorkspaceMetadata(workspace, options);

  const groupId = getWorkspaceGroupId(workspace);
  const workspaceId = getWorkspaceDocumentId(workspace);
  const ownerDeviceId =
    workspace.ownerDeviceId || (await getLocalDeviceId({ db: options.db }));

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
  const workspaceId = createLocalId('workspace');

  return setCurrentWorkspace(
    {
      groupId: workspaceId,
      name: name || 'Negocio personal',
      syncStatus: 'local',
      workspaceId,
    },
    options,
  );
};

export const getOrCreatePersonalWorkspace = async (options = {}) => {
  const firstWorkspace = await getFirstLocalOnlyWorkspace(options);

  if (firstWorkspace) {
    return firstWorkspace;
  }

  return createLocalWorkspace({ name: 'Negocio personal' }, options);
};

export const getOrCreateDefaultLocalWorkspace = async (options = {}) => {
  const currentWorkspace = await getCurrentWorkspace(options);

  if (currentWorkspace) {
    return currentWorkspace;
  }

  return setCurrentWorkspace(
    await getOrCreatePersonalWorkspace(options),
    options,
  );
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
  getCachedCurrentWorkspace,
  createLocalWorkspace,
  deleteWorkspaceMetadata,
  getCurrentWorkspace,
  getFirstLocalOnlyWorkspace,
  getLocalWorkspaces,
  getOrCreateDefaultLocalWorkspace,
  getOrCreatePersonalWorkspace,
  saveWorkspace,
  setCurrentWorkspace,
  subscribeToCurrentWorkspaceChanges,
};
