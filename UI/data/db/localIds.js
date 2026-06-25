import { initDatabase } from './database';

const DEVICE_DOCUMENT_COLLECTION = '__local_meta';
const DEVICE_DOCUMENT_ID = 'device';
const DEVICE_ID_PREFIX = 'device';

const getRandomBytes = (size) => {
  const bytes = new Uint8Array(size);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }

  for (let index = 0; index < size; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }

  return bytes;
};

const toHex = (byte) => byte.toString(16).padStart(2, '0');

export const createLocalUuid = () => {
  const bytes = getRandomBytes(16);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, toHex);

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
};

export const createLocalId = (prefix = 'local') =>
  `${prefix}_${createLocalUuid()}`;

export const getLocalDeviceId = async (options = {}) => {
  const db = options.db || (await initDatabase());
  const existingDevice = await db.getFirstAsync(
    `
      SELECT data
      FROM documents
      WHERE collection = ?
        AND id = ?;
    `,
    [DEVICE_DOCUMENT_COLLECTION, DEVICE_DOCUMENT_ID],
  );

  if (existingDevice?.data) {
    const data = JSON.parse(existingDevice.data);

    if (data.deviceId) {
      return data.deviceId;
    }
  }

  const now = new Date().toISOString();
  const deviceId = createLocalId(DEVICE_ID_PREFIX);

  await db.runAsync(
    `
      INSERT INTO documents (
        collection,
        id,
        remoteId,
        groupId,
        data,
        createdAt,
        updatedAt,
        deletedAt,
        localVersion,
        serverVersion,
        syncStatus,
        deviceId
      )
      VALUES (?, ?, NULL, NULL, ?, ?, ?, NULL, 1, NULL, 'local', ?)
      ON CONFLICT(collection, id) DO UPDATE SET
        data = excluded.data,
        updatedAt = excluded.updatedAt,
        deviceId = excluded.deviceId;
    `,
    [
      DEVICE_DOCUMENT_COLLECTION,
      DEVICE_DOCUMENT_ID,
      JSON.stringify({ deviceId }),
      now,
      now,
      deviceId,
    ],
  );

  return deviceId;
};
