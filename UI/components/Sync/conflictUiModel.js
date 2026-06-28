export const stringifyPreviewData = (data) => {
  if (data === null || data === undefined) {
    return 'Sin datos';
  }

  return JSON.stringify(data, null, 2);
};

export const getRemotePreviewData = (details) =>
  details?.remoteDocument?.document || details?.remoteDocument?.data || null;

export const getConflictReason = (conflict) =>
  conflict?.conflictMetadata?.reason ||
  conflict?.reason ||
  conflict?.syncStatus ||
  'conflict';

export const getConflictKey = (conflict) =>
  conflict ? `${conflict.collection}:${conflict.localId}` : null;

export const groupConflictsByCollection = (conflicts = []) =>
  conflicts.reduce((summary, conflict) => {
    summary[conflict.collection] = (summary[conflict.collection] || 0) + 1;
    return summary;
  }, {});

export const getConflictScreenState = ({
  conflicts = [],
  selectedConflict = null,
  summary = null,
} = {}) => ({
  hasConflicts: conflicts.length > 0,
  selectedKey: getConflictKey(selectedConflict),
  totalConflicts: summary?.conflictDocumentCount || conflicts.length,
});
