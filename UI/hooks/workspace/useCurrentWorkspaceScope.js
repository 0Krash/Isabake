import { useEffect, useState } from 'react';

import {
  getCachedCurrentWorkspace,
  getCurrentWorkspace,
  subscribeToCurrentWorkspaceChanges,
} from '../../data/workspace/workspaceRepository';
import { ensureDefaultWorkspace } from '../../data/workspace/currentWorkspace';
import { canWriteToWorkspace } from '../../data/workspace/workspacePermissions';

export const workspaceCanWrite = canWriteToWorkspace;

export default function useCurrentWorkspaceScope({ autoLoad = true } = {}) {
  const [workspace, setWorkspace] = useState(() => getCachedCurrentWorkspace());
  const [loading, setLoading] = useState(
    () => Boolean(autoLoad) && !getCachedCurrentWorkspace(),
  );

  useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    setLoading(!getCachedCurrentWorkspace());

    ensureDefaultWorkspace()
      .then((nextWorkspace) => {
        if (mounted) {
          setWorkspace(nextWorkspace);
          setLoading(false);
        }
      })
      .catch(() =>
        getCurrentWorkspace()
          .then((nextWorkspace) => {
            if (mounted) {
              setWorkspace(nextWorkspace);
              setLoading(false);
            }
          })
          .catch(() => {
            if (mounted) {
              setLoading(false);
            }
          }),
      );

    const unsubscribe = subscribeToCurrentWorkspaceChanges((nextWorkspace) => {
      if (mounted) {
        setWorkspace(nextWorkspace);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [autoLoad]);

  return {
    canWrite: workspaceCanWrite(workspace),
    groupId: workspace?.groupId || null,
    isRemote: Boolean(workspace?.isRemote),
    loading,
    workspace,
  };
}
