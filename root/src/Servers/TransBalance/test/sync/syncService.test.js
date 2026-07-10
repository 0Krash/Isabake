const { SyncService } = require('../../services/syncService');
const MemorySyncRepository = require('./memorySyncRepository');

const createEvent = (overrides = {}) => ({
  baseServerVersion: null,
  collection: 'recipes',
  createdAt: '2026-01-01T00:00:00.000Z',
  document: {
    localId: 'recipe_local_1',
    name: 'Pastel',
  },
  documentId: 'recipe_local_1',
  eventId: 'event_1',
  localVersion: 1,
  operation: 'create',
  ...overrides,
});

const push = (service, events, overrides = {}) =>
  service.pushChanges({
    deviceId: 'device_1',
    events,
    groupId: 'group_a',
    ...overrides,
  });

describe('SyncService push', () => {
  test('creates a new remote document', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    const result = await push(service, [createEvent()]);

    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toEqual([]);
    expect(result.accepted[0]).toEqual(
      expect.objectContaining({
        collection: 'recipes',
        eventId: 'event_1',
        localId: 'recipe_local_1',
        serverVersion: 1,
      }),
    );
    expect(repository.documents[0].document).toEqual(
      expect.objectContaining({
        groupId: 'group_a',
        localId: 'recipe_local_1',
        name: 'Pastel',
      }),
    );
  });

  test('is idempotent for same eventId', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    const first = await push(service, [createEvent()]);
    const second = await push(service, [createEvent()]);

    expect(second.accepted).toEqual(first.accepted);
    expect(repository.documents).toHaveLength(1);
    expect(repository.events).toHaveLength(1);
  });

  test('update increments serverVersion', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    const created = await push(service, [createEvent()]);
    const remoteId = created.accepted[0].remoteId;
    const updated = await push(service, [
      createEvent({
        baseServerVersion: 1,
        document: {
          localId: 'recipe_local_1',
          name: 'Pastel editado',
          remoteId,
        },
        eventId: 'event_2',
        operation: 'update',
      }),
    ]);

    expect(updated.accepted[0].serverVersion).toBe(2);
    expect(repository.documents[0].document.name).toBe('Pastel editado');
  });

  test('delete stores deletedAt and returns accepted', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    const created = await push(service, [createEvent()]);
    const remoteId = created.accepted[0].remoteId;
    const deleted = await push(service, [
      createEvent({
        baseServerVersion: 1,
        document: {
          localId: 'recipe_local_1',
          remoteId,
        },
        eventId: 'event_2',
        operation: 'delete',
      }),
    ]);

    expect(deleted.accepted).toHaveLength(1);
    expect(repository.documents[0].deletedAt).toEqual(expect.any(String));
  });

  test('rejects invalid payload', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    const result = await push(service, [
      createEvent({
        document: null,
        eventId: 'bad_event',
      }),
    ]);

    expect(result.accepted).toEqual([]);
    expect(result.rejected).toEqual([
      {
        eventId: 'bad_event',
        reason: 'missing_document',
      },
    ]);
  });

  test('rejects conflict when baseServerVersion is stale', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    const created = await push(service, [createEvent()]);
    const remoteId = created.accepted[0].remoteId;

    await push(service, [
      createEvent({
        baseServerVersion: 1,
        document: {
          localId: 'recipe_local_1',
          name: 'Version 2',
          remoteId,
        },
        eventId: 'event_2',
        operation: 'update',
      }),
    ]);
    const stale = await push(service, [
      createEvent({
        baseServerVersion: 1,
        document: {
          localId: 'recipe_local_1',
          name: 'Version stale',
          remoteId,
        },
        eventId: 'event_3',
        operation: 'update',
      }),
    ]);

    expect(stale.accepted).toEqual([]);
    expect(stale.rejected[0]).toEqual(
      expect.objectContaining({
        attemptedBaseServerVersion: 1,
        currentServerVersion: 2,
        eventId: 'event_3',
        reason: 'conflict',
      }),
    );
    expect(stale.rejected[0].conflictDocument.serverVersion).toBe(2);
  });

  test('non-conflicting update with current baseServerVersion succeeds', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    const created = await push(service, [createEvent()]);
    const remoteId = created.accepted[0].remoteId;

    await push(service, [
      createEvent({
        baseServerVersion: 1,
        document: {
          localId: 'recipe_local_1',
          name: 'Version 2',
          remoteId,
        },
        eventId: 'event_2',
        operation: 'update',
      }),
    ]);
    const current = await push(service, [
      createEvent({
        baseServerVersion: 2,
        document: {
          localId: 'recipe_local_1',
          name: 'Version 3',
          remoteId,
        },
        eventId: 'event_3',
        operation: 'update',
      }),
    ]);

    expect(current.rejected).toEqual([]);
    expect(current.accepted[0]).toEqual(
      expect.objectContaining({
        eventId: 'event_3',
        serverVersion: 3,
      }),
    );
  });

  test('one bad event does not fail all valid events', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    const result = await push(service, [
      createEvent({ eventId: 'event_good' }),
      createEvent({ document: null, eventId: 'event_bad' }),
    ]);

    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(1);
  });
});

describe('SyncService pull', () => {
  test('returns changes for groupId and advances cursor', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);

    await push(service, [createEvent()]);
    const result = await service.pullChanges({
      groupId: 'group_a',
    });

    expect(result.groupId).toBe('group_a');
    expect(result.changes).toHaveLength(1);
    expect(result.cursor).toBe('1');
  });

  test('does not return other group data', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);

    await push(service, [createEvent()]);
    await push(service, [createEvent({ eventId: 'event_b' })], {
      groupId: 'group_b',
    });
    const result = await service.pullChanges({
      groupId: 'group_a',
    });

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].document.groupId).toBe('group_a');
  });

  test('pull after cursor returns only newer changes', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);

    await push(service, [createEvent()]);
    await push(service, [
      createEvent({
        documentId: 'recipe_local_2',
        eventId: 'event_2',
      }),
    ]);
    const result = await service.pullChanges({
      cursor: '1',
      groupId: 'group_a',
    });

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].serverVersion).toBe(2);
    expect(result.cursor).toBe('2');
  });

  test('includes soft-deleted documents', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    const created = await push(service, [createEvent()]);
    const remoteId = created.accepted[0].remoteId;

    await push(service, [
      createEvent({
        baseServerVersion: 1,
        document: {
          localId: 'recipe_local_1',
          remoteId,
        },
        eventId: 'event_delete',
        operation: 'delete',
      }),
    ]);
    const result = await service.pullChanges({
      cursor: '1',
      groupId: 'group_a',
    });

    expect(result.changes[0]).toEqual(
      expect.objectContaining({
        deletedAt: expect.any(String),
        operation: 'delete',
      }),
    );
  });
});

describe('SyncService verifyDocuments', () => {
  test('returns ok for existing document without raw payload', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    const created = await push(service, [createEvent()]);
    const result = await service.verifyDocuments({
      documents: [
        {
          collection: 'recipes',
          remoteId: created.accepted[0].remoteId,
          serverVersion: 1,
        },
      ],
      groupId: 'group_a',
    });

    expect(result.results).toEqual([
      expect.objectContaining({
        collection: 'recipes',
        deleted: false,
        exists: true,
        remoteId: created.accepted[0].remoteId,
        serverVersion: 1,
        status: 'ok',
      }),
    ]);
    expect(result.results[0].document).toBeUndefined();
  });

  test('returns missing for absent document', async () => {
    const service = new SyncService(new MemorySyncRepository());
    const result = await service.verifyDocuments({
      documents: [
        {
          collection: 'recipes',
          remoteId: 'missing_remote',
          serverVersion: 1,
        },
      ],
      groupId: 'group_a',
    });

    expect(result.results[0]).toEqual(
      expect.objectContaining({
        exists: false,
        status: 'missing',
      }),
    );
  });

  test('returns deleted for tombstone and stale for older backend version', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    const created = await push(service, [createEvent()]);
    const remoteId = created.accepted[0].remoteId;

    await push(service, [
      createEvent({
        baseServerVersion: 1,
        document: {
          localId: 'recipe_local_1',
          remoteId,
        },
        eventId: 'delete_event',
        operation: 'delete',
      }),
    ]);
    await push(service, [
      createEvent({
        documentId: 'recipe_local_2',
        document: {
          localId: 'recipe_local_2',
          name: 'Pan',
        },
        eventId: 'event_2',
      }),
    ]);
    const staleRemoteId = repository.documents.find(
      (document) => document.document.localId === 'recipe_local_2',
    ).remoteId;

    const result = await service.verifyDocuments({
      documents: [
        {
          collection: 'recipes',
          remoteId,
          serverVersion: 2,
        },
        {
          collection: 'recipes',
          remoteId: staleRemoteId,
          serverVersion: 99,
        },
      ],
      groupId: 'group_a',
    });

    expect(result.results.map((item) => item.status)).toEqual([
      'deleted',
      'stale',
    ]);
  });

  test('does not verify documents from another group', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    const created = await push(service, [createEvent()]);
    const result = await service.verifyDocuments({
      documents: [
        {
          collection: 'recipes',
          remoteId: created.accepted[0].remoteId,
          serverVersion: 1,
        },
      ],
      groupId: 'group_b',
    });

    expect(result.results[0].status).toBe('missing');
  });

  test('returns unknown for malformed verify entries', async () => {
    const service = new SyncService(new MemorySyncRepository());
    const result = await service.verifyDocuments({
      documents: [
        {
          collection: 'recipes',
        },
      ],
      groupId: 'group_a',
    });

    expect(result.results[0]).toEqual(
      expect.objectContaining({
        remoteId: null,
        status: 'unknown',
      }),
    );
  });
});
