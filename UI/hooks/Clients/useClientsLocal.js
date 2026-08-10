import { useCallback, useEffect, useState } from 'react';

import { clientRepository } from '../../data/repositories';
import { requestLocalChangeSync } from '../../data/sync/localChangeSync';
import { getCurrentGroupId } from '../../data/workspace/currentWorkspace';
import useCurrentWorkspaceScope from '../workspace/useCurrentWorkspaceScope';

const normalizeClientPayload = (client = {}) => ({
  address: client.address || '',
  email: client.email || '',
  name: client.name || '',
  notes: client.notes || '',
  phone: client.phone || '',
  type: client.type || '',
});

export default function useClientsLocal({ autoLoad = true } = {}) {
  const { groupId, loading: workspaceLoading } = useCurrentWorkspaceScope({
    autoLoad,
  });
  const waitingForWorkspace = Boolean(autoLoad && workspaceLoading && !groupId);
  const [clients, setClients] = useState([]);
  const [clientsGroupId, setClientsGroupId] = useState(null);
  const [loading, setLoading] = useState(
    () => Boolean(autoLoad) && !waitingForWorkspace,
  );
  const [error, setError] = useState(null);

  const refreshClients = useCallback(async () => {
    const effectiveGroupId = groupId || (await getCurrentGroupId());

    if (!effectiveGroupId) {
      setClients([]);
      setClientsGroupId(null);
      setLoading(false);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const localClients = await clientRepository.getAll({
        groupId: effectiveGroupId,
      });
      setClients(localClients);
      setClientsGroupId(effectiveGroupId);
      return localClients;
    } catch (requestError) {
      setError(requestError);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const createClient = useCallback(
    async (data) => {
      const effectiveGroupId = groupId || (await getCurrentGroupId());
      const client = await clientRepository.create(normalizeClientPayload(data), {
        groupId: effectiveGroupId,
      });
      requestLocalChangeSync();
      await refreshClients();
      return client;
    },
    [groupId, refreshClients],
  );

  const updateClient = useCallback(
    async (id, updates) => {
      const client = await clientRepository.update(
        String(id),
        normalizeClientPayload(updates),
      );

      if (!client) {
        throw new Error('Cliente no encontrado');
      }

      requestLocalChangeSync();
      await refreshClients();
      return client;
    },
    [refreshClients],
  );

  const deleteClient = useCallback(
    async (id) => {
      const client = await clientRepository.softDelete(String(id));

      if (!client) {
        throw new Error('Cliente no encontrado');
      }

      requestLocalChangeSync();
      await refreshClients();
      return client;
    },
    [refreshClients],
  );

  useEffect(() => {
    if (!autoLoad || waitingForWorkspace) {
      setClients([]);
      setClientsGroupId(null);
      return;
    }

    refreshClients().catch((requestError) => {
      console.warn('Error al cargar clientes locales:', requestError);
    });
  }, [autoLoad, refreshClients, waitingForWorkspace]);

  return {
    clients: clientsGroupId === groupId ? clients : [],
    createClient,
    deleteClient,
    error,
    loading: loading || waitingForWorkspace,
    refreshClients,
    updateClient,
  };
}
