const mongoose = require('mongoose');

const {
  RESET_CONFIRMATION,
  PROJECT_COLLECTIONS,
  RESET_SCOPE,
  resetBackendDatabase,
  validateResetRequest,
} = require('../../services/devDatabaseResetService');

describe('devDatabaseResetService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('is disabled unless explicitly enabled outside production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ENABLE_DEV_BACKEND_RESET;

    expect(
      validateResetRequest({
        confirm: true,
        confirmation: RESET_CONFIRMATION,
        scope: RESET_SCOPE,
      }),
    ).toBe('dev_backend_reset_disabled');

    process.env.ENABLE_DEV_BACKEND_RESET = 'true';
    process.env.NODE_ENV = 'production';

    expect(
      validateResetRequest({
        confirm: true,
        confirmation: RESET_CONFIRMATION,
        scope: RESET_SCOPE,
      }),
    ).toBe('dev_backend_reset_disabled');
  });

  test('requires explicit confirm scope and confirmation header', () => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_BACKEND_RESET = 'true';

    expect(validateResetRequest()).toBe('dev_backend_reset_requires_confirm');
    expect(
      validateResetRequest({
        confirm: true,
        confirmation: 'WRONG',
        scope: RESET_SCOPE,
      }),
    ).toBe('dev_backend_reset_requires_confirmation_header');
  });

  test('deletes only project backend collections when enabled and confirmed', async () => {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_BACKEND_RESET = 'true';
    const users = {
      collectionName: 'users',
      deleteMany: jest.fn(async () => ({ deletedCount: 2 })),
    };
    const workspaces = {
      collectionName: 'workspaces',
      deleteMany: jest.fn(async () => ({ deletedCount: 1 })),
    };
    const unrelated = {
      collectionName: 'unrelated_analytics',
      deleteMany: jest.fn(async () => ({ deletedCount: 9 })),
    };
    const legacyRecipes = {
      collectionName: 'recipes',
      deleteMany: jest.fn(async () => ({ deletedCount: 4 })),
    };
    const originalDb = mongoose.connection.db;

    mongoose.connection.db = {
      collections: jest.fn(async () => [
        users,
        workspaces,
        unrelated,
        legacyRecipes,
      ]),
    };

    const result = await resetBackendDatabase({
      confirm: true,
      confirmation: RESET_CONFIRMATION,
      scope: RESET_SCOPE,
    });

    expect(users.deleteMany).toHaveBeenCalledWith({});
    expect(workspaces.deleteMany).toHaveBeenCalledWith({});
    expect(unrelated.deleteMany).not.toHaveBeenCalled();
    expect(legacyRecipes.deleteMany).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        deletedCollections: ['users', 'workspaces'],
        ok: true,
      }),
    );

    mongoose.connection.db = originalDb;
  });

  test('documents the project collection allowlist', () => {
    expect(PROJECT_COLLECTIONS).toEqual([
      'authsessions',
      'syncdocuments',
      'syncevents',
      'users',
      'workspaceinvitations',
      'workspacememberships',
      'workspaces',
    ]);
  });
});
