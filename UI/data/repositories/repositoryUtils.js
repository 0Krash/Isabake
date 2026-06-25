import {
  getCollection,
  getDocument,
  saveDocument,
  softDeleteDocument,
} from '../db/documentStore';
import { createLocalId } from '../db/localIds';

export const normalizeName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

export const documentToEntity = (document) => {
  if (!document) {
    return null;
  }

  return {
    ...document.data,
    deletedAt: document.deletedAt,
    deviceId: document.deviceId,
    groupId: document.groupId,
    id: document.id,
    localId: document.id,
    localVersion: document.localVersion,
    remoteId: document.remoteId,
    serverVersion: document.serverVersion,
    syncStatus: document.syncStatus,
  };
};

export const documentsToEntities = (documents) =>
  documents.map(documentToEntity);

const stripDocumentMetadata = ({
  deletedAt,
  deviceId,
  groupId,
  localId,
  localVersion,
  remoteId,
  serverVersion,
  syncStatus,
  ...entity
}) => entity;

export const createRepository = ({
  collection,
  idField,
  idPrefix,
  prepareCreate = (data) => data,
  prepareUpdate = (data) => data,
}) => {
  const resolveId = (data = {}, options = {}) =>
    String(options.id || data.id || data.localId || createLocalId(idPrefix));

  const withIdentity = (data, id) => {
    const entity = {
      ...data,
      id,
    };

    if (idField && entity[idField] === undefined) {
      entity[idField] = id;
    }

    return entity;
  };

  const getAll = async (options = {}) => {
    const documents = await getCollection(collection, options);
    return documentsToEntities(documents);
  };

  const getById = async (id, options = {}) =>
    documentToEntity(await getDocument(collection, String(id), options));

  const create = async (data, options = {}) => {
    const id = resolveId(data, options);
    const entity = withIdentity(prepareCreate(data, id), id);
    const documentData = stripDocumentMetadata(entity);
    const document = await saveDocument(collection, id, documentData, {
      groupId: options.groupId ?? data.groupId ?? null,
      remoteId: options.remoteId ?? data.remoteId ?? null,
      serverVersion: options.serverVersion ?? data.serverVersion ?? null,
      skipOutbox: options.skipOutbox,
      syncStatus: options.syncStatus,
    });

    return documentToEntity(document);
  };

  const update = async (id, updates, options = {}) => {
    const current = await getById(id, { includeDeleted: true });

    if (!current) {
      return null;
    }

    const entity = withIdentity(
      prepareUpdate(
        {
          ...current,
          ...updates,
        },
        String(id),
      ),
      String(id),
    );
    const documentData = stripDocumentMetadata(entity);
    const document = await saveDocument(collection, String(id), documentData, {
      groupId: options.groupId ?? entity.groupId ?? null,
      remoteId: options.remoteId ?? entity.remoteId ?? null,
      serverVersion: options.serverVersion ?? entity.serverVersion ?? null,
      skipOutbox: options.skipOutbox,
      syncStatus: options.syncStatus,
    });

    return documentToEntity(document);
  };

  const softDelete = async (id, options = {}) =>
    documentToEntity(await softDeleteDocument(collection, String(id), options));

  return {
    collection,
    create,
    getAll,
    getById,
    softDelete,
    update,
  };
};
