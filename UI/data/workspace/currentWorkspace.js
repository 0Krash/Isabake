import {
  assignDocumentGroupId,
  getDocumentsMissingGroupId,
} from '../db/documentStore';
import {
  getCurrentWorkspace,
  getOrCreateDefaultLocalWorkspace,
} from './workspaceRepository';

const summarizeByCollection = (documents = []) =>
  documents.reduce((summary, document) => {
    summary[document.collection] = (summary[document.collection] || 0) + 1;
    return summary;
  }, {});

export const ensureDefaultWorkspace = async (options = {}) =>
  getOrCreateDefaultLocalWorkspace(options);

export const getCurrentGroupId = async (options = {}) => {
  const workspace =
    (await getCurrentWorkspace(options)) || (await ensureDefaultWorkspace(options));

  return workspace?.groupId || null;
};

export const requireCurrentGroupId = async (options = {}) => {
  const groupId = await getCurrentGroupId(options);

  if (!groupId) {
    throw new Error('No hay workspace/grupo local activo.');
  }

  return groupId;
};

export const assignUngroupedLocalDataToCurrentWorkspace = async ({
  dryRun = true,
  ...options
} = {}) => {
  const workspace = await ensureDefaultWorkspace(options);
  const documents = await getDocumentsMissingGroupId(options);
  const countsByCollection = summarizeByCollection(documents);

  if (dryRun) {
    return {
      assignedCount: 0,
      countsByCollection,
      dryRun: true,
      groupId: workspace.groupId,
      inspectedCount: documents.length,
    };
  }

  const assigned = [];

  for (const document of documents) {
    assigned.push(
      await assignDocumentGroupId(
        document.collection,
        document.id,
        workspace.groupId,
        options,
      ),
    );
  }

  return {
    assignedCount: assigned.length,
    countsByCollection,
    dryRun: false,
    groupId: workspace.groupId,
    inspectedCount: documents.length,
  };
};

export default {
  assignUngroupedLocalDataToCurrentWorkspace,
  ensureDefaultWorkspace,
  getCurrentGroupId,
  requireCurrentGroupId,
};
