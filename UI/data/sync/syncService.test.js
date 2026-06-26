jest.mock('../db/documentStore', () => ({
  getDocument: jest.fn(),
  getDocumentsBySyncStatuses: jest.fn(async () => []),
  markDocumentConflict: jest.fn(),
  markDocumentSynced: jest.fn(),
  saveRemoteDocument: jest.fn(),
}));

jest.mock('../db/localIds', () => ({
  getLocalDeviceId: jest.fn(async () => 'device_local_1'),
}));

jest.mock('./syncOutbox', () => ({
  getFailedOutboxCountsByCollection: jest.fn(async () => ({})),
  getPendingOutboxCountsByCollection: jest.fn(async () => ({})),
  getPendingOutboxEvents: jest.fn(async () => []),
  incrementOutboxAttempt: jest.fn(),
  markOutboxEventFailed: jest.fn(),
  markOutboxEventSynced: jest.fn(),
}));

jest.mock('./syncStateRepository', () => ({
  getLastSyncCursor: jest.fn(async () => null),
  storeLastSyncCursor: jest.fn(),
}));

import {
  pullRemoteChanges,
  pushPendingChanges,
  runSync,
} from './syncService';

describe('syncService safe failures', () => {
  test('pushPendingChanges fails safely when groupId is missing', async () => {
    await expect(pushPendingChanges()).resolves.toEqual({
      accepted: [],
      error: 'groupId_required',
      ok: false,
      rejected: [],
      skipped: [],
    });
  });

  test('pullRemoteChanges fails safely when groupId is missing', async () => {
    await expect(pullRemoteChanges()).resolves.toEqual({
      applied: [],
      conflicts: [],
      error: 'groupId_required',
      ok: false,
    });
  });

  test('runSync returns failed push and pull without throwing when groupId is missing', async () => {
    const result = await runSync();

    expect(result.ok).toBe(false);
    expect(result.push.error).toBe('groupId_required');
    expect(result.pull.error).toBe('groupId_required');
  });
});
