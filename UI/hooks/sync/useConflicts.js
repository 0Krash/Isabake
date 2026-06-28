import { useCallback, useEffect, useState } from 'react';

import {
  getConflictDetails,
  getConflictSummary,
  resolveConflictPreferLocal,
  resolveConflictPreferRemote,
} from '../../data/sync/conflictService';

export const loadConflictsSnapshot = async () => {
  const summary = await getConflictSummary();

  return {
    conflicts: summary.documents || [],
    summary,
  };
};

export const resolveConfirmedConflict = async ({
  action,
  conflict,
  resolveLocal,
  resolveRemote,
}) => {
  if (!action || !conflict) {
    return {
      ok: false,
      reason: 'confirmation_required',
      skipped: true,
    };
  }

  if (action === 'local') {
    return resolveLocal(conflict);
  }

  if (action === 'remote') {
    return resolveRemote(conflict);
  }

  throw new Error(`Accion de conflicto desconocida: ${action}`);
};

export const resolveConflictWithRefresh = async ({
  conflict,
  refresh,
  resolveService,
}) => {
  const result = await resolveService({
    collection: conflict.collection,
    documentId: conflict.localId,
  });

  await refresh();
  return result;
};

export default function useConflicts({ autoLoad = true } = {}) {
  const [conflicts, setConflicts] = useState([]);
  const [detailsByKey, setDetailsByKey] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(autoLoad));
  const [summary, setSummary] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const snapshot = await loadConflictsSnapshot();
      setConflicts(snapshot.conflicts);
      setSummary(snapshot.summary);
      return snapshot;
    } catch (nextError) {
      const message = String(nextError?.message || nextError);
      setError(message);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetails = useCallback(async ({ collection, localId }) => {
    const key = `${collection}:${localId}`;
    const details = await getConflictDetails({
      collection,
      documentId: localId,
    });

    setDetailsByKey((current) => ({
      ...current,
      [key]: details,
    }));

    return details;
  }, []);

  const resolvePreferLocal = useCallback(
    async (conflict) =>
      resolveConflictWithRefresh({
        conflict,
        refresh,
        resolveService: resolveConflictPreferLocal,
      }),
    [refresh],
  );

  const resolvePreferRemote = useCallback(
    async (conflict) =>
      resolveConflictWithRefresh({
        conflict,
        refresh,
        resolveService: resolveConflictPreferRemote,
      }),
    [refresh],
  );

  useEffect(() => {
    if (autoLoad) {
      refresh().catch(() => {});
    }
  }, [autoLoad, refresh]);

  return {
    conflicts,
    detailsByKey,
    error,
    loadDetails,
    loading,
    refresh,
    resolvePreferLocal,
    resolvePreferRemote,
    summary,
  };
}
