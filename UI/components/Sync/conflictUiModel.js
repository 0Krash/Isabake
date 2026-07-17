export const stringifyPreviewData = (data) => {
  if (data === null || data === undefined) {
    return 'Sin datos';
  }

  if (typeof data !== 'object') {
    return String(data);
  }

  const importantFields = [
    'name',
    'nombre',
    'title',
    'sku',
    'quantity',
    'amount',
    'price',
    'updatedAt',
  ];
  const lines = importantFields
    .filter((field) => data[field] !== undefined && data[field] !== null)
    .map((field) => {
      const value = String(data[field]);

      if (isTechnicalIdentifier(value)) {
        return null;
      }

      return `${formatFieldLabel(field)}: ${value}`;
    })
    .filter(Boolean);

  if (lines.length > 0) {
    return lines.join('\n');
  }

  return 'Elemento con cambios';
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
      'La version compartida no esta disponible. Usa tu version o revisa manualmente.',
    resolvablePreferLocal,
    resolvablePreferRemote,
  };
};

export const getConflictReason = (conflict) =>
  conflict?.conflictMetadata?.reason ||
  conflict?.reason ||
  conflict?.syncStatus ||
  'conflict';

export const formatConflictCollection = (collection = '') => {
  const labels = {
    categories: 'Categoria',
    inventory: 'Inventario',
    recipes: 'Receta',
    recipeSections: 'Seccion de receta',
    recipeTypes: 'Tipo de receta',
    stockMovements: 'Movimiento de inventario',
    stores: 'Tienda',
    transactions: 'Transaccion',
  };

  return labels[collection] || 'Elemento';
};

export const isTechnicalIdentifier = (value = '') =>
  /^(phase_|sync_|workspace_|group_|local_|remote_)/i.test(
    String(value || '').trim(),
  ) || /_phase_\d+/i.test(String(value || ''));

export const getFriendlyConflictFallback = (conflict = {}) => {
  const collectionLabel = formatConflictCollection(conflict.collection);
  return collectionLabel === 'Elemento'
    ? 'Elemento con cambios'
    : `${collectionLabel} con cambios`;
};

export const getConflictDisplayName = (conflict = {}) => {
  const candidates = [
    conflict.name,
    conflict.title,
    conflict.document?.name,
    conflict.document?.nombre,
    conflict.localData?.name,
    conflict.localData?.nombre,
  ];
  const displayName = candidates.find(
    (candidate) => candidate && !isTechnicalIdentifier(candidate),
  );

  return displayName || getFriendlyConflictFallback(conflict);
};

export const formatFieldLabel = (field = '') => {
  const labels = {
    amount: 'Importe',
    name: 'Nombre',
    nombre: 'Nombre',
    price: 'Precio',
    quantity: 'Cantidad',
    sku: 'SKU',
    title: 'Titulo',
    updatedAt: 'Actualizado',
  };

  return labels[field] || field;
};

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
