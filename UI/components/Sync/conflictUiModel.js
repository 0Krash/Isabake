export const stringifyPreviewData = (data) => {
  if (data === null || data === undefined) {
    return 'Sin datos';
  }

  return JSON.stringify(data, null, 2);
};

export const getRemotePreviewData = (details) =>
  details?.remoteDocument?.document || details?.remoteDocument?.data || null;

export const getConflictResolutionState = (details = {}) => {
  const remoteData = getRemotePreviewData(details);
  const resolvablePreferRemote =
    details.resolvablePreferRemote ?? Boolean(remoteData);
  const resolvablePreferLocal =
    details.resolvablePreferLocal ??
    (details.localData !== null && details.localData !== undefined);

  return {
    missingLocalDocument:
      details.missingLocalDocument ?? !resolvablePreferLocal,
    missingRemoteDocument:
      details.missingRemoteDocument ?? !resolvablePreferRemote,
    remoteUnavailableMessage:
      'Remote version is not available for this conflict. Choose Prefer local or resolve manually.',
    resolvablePreferLocal,
    resolvablePreferRemote,
  };
};

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
  preferLocalResolvableCount:
    summary?.preferLocalResolvableCount ??
    conflicts.filter((conflict) => conflict.resolvablePreferLocal).length,
  preferRemoteResolvableCount:
    summary?.preferRemoteResolvableCount ??
    conflicts.filter((conflict) => conflict.resolvablePreferRemote).length,
  selectedKey: getConflictKey(selectedConflict),
  totalConflicts: summary?.conflictDocumentCount || conflicts.length,
  unresolvedMissingRemoteCount:
    summary?.unresolvedMissingRemoteCount ??
    conflicts.filter((conflict) => conflict.missingRemoteDocument).length,
});
