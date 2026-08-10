import { createRepository } from './repositoryUtils';

export const CLIENT_COLLECTION = 'clients';

const normalizeClient = (client = {}) => ({
  address: client.address || client.Address || '',
  email: client.email || client.Email || '',
  latitude: client.latitude ?? client.Latitude ?? null,
  longitude: client.longitude ?? client.Longitude ?? null,
  name: client.name || client.Name || '',
  notes: client.notes || client.Notes || '',
  phone: client.phone || client.Phone || '',
  type: client.type || client.Type || '',
});

const repository = createRepository({
  collection: CLIENT_COLLECTION,
  idField: 'clientId',
  idPrefix: 'client',
  prepareCreate: (client, id) => ({
    ...normalizeClient(client),
    clientId: client.clientId || id,
  }),
  prepareUpdate: (client, id) => ({
    ...client,
    ...normalizeClient(client),
    clientId: client.clientId || id,
  }),
});

const getAll = async (options = {}) => {
  const clients = await repository.getAll(options);

  return clients.sort((clientA, clientB) =>
    String(clientA.name || '').localeCompare(String(clientB.name || ''), 'es', {
      sensitivity: 'base',
    }),
  );
};

const getByClientId = repository.getById;

export default {
  ...repository,
  getAll,
  getByClientId,
};
