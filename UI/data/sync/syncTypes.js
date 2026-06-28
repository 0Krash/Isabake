export const SYNC_STATUS = {
  CONFLICT: 'conflict',
  FAILED: 'failed',
  PENDING: 'pending',
  SYNCED: 'synced',
};

export const OUTBOX_STATUS = {
  CONFLICT: 'conflict',
  DONE: 'done',
  FAILED: 'failed',
  PENDING: 'pending',
};

export const SYNC_OPERATIONS = {
  CREATE: 'create',
  DELETE: 'delete',
  UPDATE: 'update',
};

export const DEFAULT_SYNC_ENDPOINTS = {
  PULL: '/sync/pull',
  PUSH: '/sync/push',
};

export const SHARED_SYNC_COLLECTIONS = [
  'categories',
  'inventory',
  'recipes',
  'recipeSections',
  'recipeTypes',
  'stockMovements',
  'stores',
  'transactions',
];
