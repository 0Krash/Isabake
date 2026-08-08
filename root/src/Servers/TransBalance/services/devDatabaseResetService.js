const mongoose = require('mongoose');

const RESET_SCOPE = 'backend_database_reset';
const RESET_CONFIRMATION = 'RESET_BACKEND_DATABASE';
const PROJECT_COLLECTIONS = [
  'authsessions',
  'syncdocuments',
  'syncevents',
  'users',
  'workspaceinvitations',
  'workspacememberships',
  'workspaces',
];

const isBackendResetEnabled = () =>
  process.env.NODE_ENV !== 'production' &&
  String(process.env.ENABLE_DEV_BACKEND_RESET || '').toLowerCase() === 'true';

const validateResetRequest = ({ confirm, confirmation, scope } = {}) => {
  if (!isBackendResetEnabled()) {
    return 'dev_backend_reset_disabled';
  }

  if (scope !== RESET_SCOPE || confirm !== true) {
    return 'dev_backend_reset_requires_confirm';
  }

  if (confirmation !== RESET_CONFIRMATION) {
    return 'dev_backend_reset_requires_confirmation_header';
  }

  return null;
};

const resetBackendDatabase = async ({
  confirm,
  confirmation,
  scope,
} = {}) => {
  const error = validateResetRequest({ confirm, confirmation, scope });

  if (error) {
    const nextError = new Error(error);
    nextError.statusCode = error === 'dev_backend_reset_disabled' ? 404 : 400;
    throw nextError;
  }

  const db = mongoose.connection?.db;

  if (!db?.collections) {
    const nextError = new Error('database_not_connected');
    nextError.statusCode = 503;
    throw nextError;
  }

  const projectCollectionNames = new Set(PROJECT_COLLECTIONS);
  const collections = (await db.collections()).filter((collection) =>
    projectCollectionNames.has(collection.collectionName),
  );
  const deletedCollections = [];

  for (const collection of collections) {
    await collection.deleteMany({});
    deletedCollections.push(collection.collectionName);
  }

  return {
    deletedCollections,
    ok: true,
    resetAt: new Date().toISOString(),
  };
};

module.exports = {
  RESET_CONFIRMATION,
  PROJECT_COLLECTIONS,
  RESET_SCOPE,
  isBackendResetEnabled,
  resetBackendDatabase,
  validateResetRequest,
};
