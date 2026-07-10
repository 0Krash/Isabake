jest.mock('../db/database', () => ({
  initDatabase: jest.fn(),
}));

jest.mock('../sync/autoSyncService', () => ({
  recoverStaleAutoSyncState: jest.fn(),
}));

jest.mock('../sync/syncHistoryService', () => ({
  recoverStaleSyncHistoryRuns: jest.fn(),
}));

import {
  DEV_RESET_SCOPES,
  previewDevDataReset,
  runDevDataReset,
} from './devDataResetService';

const createDb = ({ counts = [] } = {}) => {
  const db = {
    getFirstAsync: jest.fn(async () => ({
      count: counts.length ? counts.shift() : 0,
    })),
    runAsync: jest.fn(async () => ({ changes: 1 })),
  };

  return db;
};

describe('devDataResetService', () => {
  test('preview does not delete data', async () => {
    const db = createDb({ counts: [2, 3, 4, 1] });

    await expect(previewDevDataReset({ db })).resolves.toEqual(
      expect.objectContaining({
        deleted: false,
        dryRun: true,
        scope: 'test_data_only',
        success: true,
      }),
    );
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  test('destructive reset requires confirm true', async () => {
    await expect(runDevDataReset()).resolves.toEqual({
      blocked: true,
      error: 'runDevDataReset requires confirm: true.',
      success: false,
    });
  });

  test('test_data_only deletes only dev/test-prefixed tables', async () => {
    const db = createDb({ counts: [2, 1, 1, 1] });

    const result = await runDevDataReset({
      confirm: true,
      db,
      scope: DEV_RESET_SCOPES.TEST_DATA_ONLY,
    });

    expect(result).toEqual(
      expect.objectContaining({
        deleted: true,
        scope: 'test_data_only',
        success: true,
      }),
    );
    expect(result.counts).toEqual({
      documents: 2,
      syncHistory: 1,
      syncOutbox: 1,
      syncState: 1,
    });
    expect(db.runAsync).toHaveBeenCalledTimes(4);
    db.runAsync.mock.calls.forEach(([sql]) => {
      expect(sql).toMatch(/DELETE FROM/);
      expect(sql).not.toMatch(/DROP TABLE|VACUUM/i);
    });
  });

  test('full local reset requires explicit scope and confirm', async () => {
    await expect(
      runDevDataReset({ scope: DEV_RESET_SCOPES.FULL_LOCAL_DEV_RESET }),
    ).resolves.toEqual({
      blocked: true,
      error: 'full_local_dev_reset requires explicit scope and confirm: true.',
      success: false,
    });

    const db = createDb({ counts: [1, 2, 3, 4] });
    const result = await runDevDataReset({
      confirm: true,
      db,
      scope: DEV_RESET_SCOPES.FULL_LOCAL_DEV_RESET,
    });

    expect(result.counts).toEqual({
      documents: 4,
      sync_history: 2,
      sync_outbox: 1,
      sync_state: 3,
    });
    expect(db.runAsync).toHaveBeenCalledTimes(4);
  });

  test('stale sync cleanup does not delete business data', async () => {
    const db = createDb();
    const recoverAutoSync = jest.fn(async () => ({
      staleInFlightRecovered: true,
    }));
    const recoverHistory = jest.fn(async () => ({ recoveredCount: 2 }));

    await expect(
      runDevDataReset({
        confirm: true,
        db,
        recoverAutoSync,
        recoverHistory,
        scope: DEV_RESET_SCOPES.STALE_SYNC_ONLY,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        counts: {
          staleAutoSyncRecovered: 1,
          staleHistoryRecovered: 2,
        },
        deleted: false,
      }),
    );
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  test('conflict cleanup does not auto-resolve real conflicts', async () => {
    const db = createDb({ counts: [5, 4, 2, 1] });
    const result = await runDevDataReset({
      confirm: true,
      db,
      scope: DEV_RESET_SCOPES.CONFLICTS_ONLY,
    });

    expect(result.counts).toEqual(
      expect.objectContaining({
        devDocumentConflicts: 2,
        devOutboxConflicts: 1,
        realDocumentConflicts: 3,
        realOutboxConflicts: 3,
      }),
    );
    db.runAsync.mock.calls.forEach(([sql]) => {
      expect(sql).toMatch(/DELETE FROM/);
      expect(sql).toMatch(/conflict/);
    });
  });
});
