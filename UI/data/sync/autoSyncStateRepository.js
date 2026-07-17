import {
  getDocument,
  saveDocument,
} from '../db/documentStore';
import {
  AUTO_SYNC_COLLECTION,
  AUTO_SYNC_SETTINGS_ID,
  AUTO_SYNC_STATE_ID,
} from './autoSyncConfig';

const nowIso = () => new Date().toISOString();

const saveLocalAutoSyncDocument = (id, data) =>
  saveDocument(AUTO_SYNC_COLLECTION, id, data, {
    groupId: null,
    skipOutbox: true,
    syncStatus: 'local',
  });

export const getAutoSyncSettings = async () => {
  const document = await getDocument(AUTO_SYNC_COLLECTION, AUTO_SYNC_SETTINGS_ID, {
    includeDeleted: true,
  });

  return {
    autoSyncEnabled: document?.data?.autoSyncEnabled !== false,
    updatedAt: document?.data?.updatedAt || null,
  };
};

export const setAutoSyncEnabled = async (enabled) => {
  const settings = {
    autoSyncEnabled: Boolean(enabled),
    updatedAt: nowIso(),
  };

  await saveLocalAutoSyncDocument(AUTO_SYNC_SETTINGS_ID, settings);
  return settings;
};

export const getAutoSyncState = async () => {
  const document = await getDocument(AUTO_SYNC_COLLECTION, AUTO_SYNC_STATE_ID, {
    includeDeleted: true,
  });

  return (
    document?.data || {
      lastFinishedAt: null,
      lastReason: null,
      lastStatus: null,
      updatedAt: null,
    }
  );
};

export const setAutoSyncState = async (state = {}) => {
  const nextState = {
    ...state,
    updatedAt: nowIso(),
  };

  await saveLocalAutoSyncDocument(AUTO_SYNC_STATE_ID, nextState);
  return nextState;
};

export default {
  getAutoSyncSettings,
  getAutoSyncState,
  setAutoSyncEnabled,
  setAutoSyncState,
};
