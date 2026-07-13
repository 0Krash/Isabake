import { useEffect, useState } from 'react';

import {
  getCurrentWorkspace,
  subscribeToCurrentWorkspaceChanges,
} from '../../data/workspace/workspaceRepository';
import { ensureDefaultWorkspace } from '../../data/workspace/currentWorkspace';
import { canWriteToWorkspace } from '../../data/workspace/workspacePermissions';

export const workspaceCanWrite = canWriteToWorkspace;

export default function useCurrentWorkspaceScope({ autoLoad = true } = {}) {
  const [workspace, setWorkspace] = useState(null);

  useEffect(() => {
    if (!autoLoad) {
      return undefined;
    }

    let mounted = true;

    ensureDefaultWorkspace()
      .then((nextWorkspace) => {
        if (mounted) {
          setWorkspace(nextWorkspace);
        }
      })
      .catch(() =>
        getCurrentWorkspace()
          .then((nextWorkspace) => {
            if (mounted) {
              setWorkspace(nextWorkspace);
            }
          })
          .catch(() => {}),
      );

    const unsubscribe = subscribeToCurrentWorkspaceChanges((nextWorkspace) => {
      if (mounted) {
        setWorkspace(nextWorkspace);
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
    workspace,
  };
}
