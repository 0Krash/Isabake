import {
  getCollection,
  getDocument,
  initDatabase,
  saveDocument,
  softDeleteDocument,
} from './documentStore';
import { createLocalId, getLocalDeviceId } from './localIds';
import { getPendingOutboxEvents } from '../sync/syncOutbox';

const SMOKE_TEST_COLLECTION = '__local_db_smoke_tests';

export const runLocalDbSmokeTest = async () => {
  const isDev = typeof __DEV__ === 'undefined' ? true : __DEV__;

  if (!isDev) {
    return {
      skipped: true,
      reason: 'local DB smoke test is dev-only',
    };
  }

  await initDatabase();

  const deviceId = await getLocalDeviceId();
  const documentId = createLocalId('smoke');
  const payload = {
    createdBy: 'runLocalDbSmokeTest',
    deviceId,
    name: 'SQLite smoke test',
  };

  const savedDocument = await saveDocument(
    SMOKE_TEST_COLLECTION,
    documentId,
    payload,
  );
  const readDocument = await getDocument(SMOKE_TEST_COLLECTION, documentId);
  const collection = await getCollection(SMOKE_TEST_COLLECTION, {
    includeDeleted: true,
  });
  const deletedDocument = await softDeleteDocument(
    SMOKE_TEST_COLLECTION,
    documentId,
  );
  const pendingOutboxEvents = await getPendingOutboxEvents();

  if (!savedDocument || !readDocument || !deletedDocument) {
    throw new Error('Local DB smoke test failed: document lifecycle incomplete');
  }

  if (!pendingOutboxEvents.length) {
    throw new Error('Local DB smoke test failed: no pending outbox events');
  }

  return {
    collectionCount: collection.length,
    deletedAt: deletedDocument.deletedAt,
    deviceId,
    documentId,
    pendingOutboxCount: pendingOutboxEvents.length,
    readDocument,
    savedDocument,
    success: true,
  };
};
