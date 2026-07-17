export const formatSyncHistoryAction = (actionType = '') => {
  const labels = {
    dev_check: 'Revision dev',
    full_sync: 'Sincronizacion completa',
    pull: 'Recibir cambios',
    push: 'Enviar cambios',
    status_refresh: 'Revision de estado',
  };

  return labels[actionType] || 'Actividad de sincronizacion';
};

export const formatSyncHistoryStatus = (status = '') => {
  const labels = {
    failed: 'Fallo',
    partial: 'Parcial',
    skipped: 'Omitido',
    started: 'En curso',
    success: 'Completado',
  };

  return labels[status] || 'Estado desconocido';
};

export const getSyncHistoryStatusTone = (status = '') => {
  if (status === 'success') {
    return 'success';
  }

  if (status === 'failed') {
    return 'danger';
  }

  if (status === 'partial' || status === 'skipped') {
    return 'warning';
  }

  return 'muted';
};

export const formatSyncHistoryCounts = (record = {}) => {
  const parts = [];

  if (record.pushedCount) {
    parts.push(`Enviados: ${record.pushedCount}`);
  }

  if (record.pulledCount) {
    parts.push(`Recibidos: ${record.pulledCount}`);
  }

  if (record.conflictCount) {
    parts.push(`Conflictos: ${record.conflictCount}`);
  }

  if (record.rejectedCount) {
    parts.push(`Rechazados: ${record.rejectedCount}`);
  }

  if (record.skippedCount) {
    parts.push(`Omitidos: ${record.skippedCount}`);
  }

  if (!parts.length) {
    parts.push('Sin cambios aplicados');
  }

  return parts.join(' · ');
};

export const formatSyncHistoryPending = (record = {}) => {
  const before =
    record.pendingBefore === null || record.pendingBefore === undefined
      ? '-'
      : record.pendingBefore;
  const after =
    record.pendingAfter === null || record.pendingAfter === undefined
      ? '-'
      : record.pendingAfter;

  return `Pendientes: ${before} -> ${after}`;
};

export const sanitizeSyncHistoryDisplayText = (value = '') => {
  const text = String(value || '').trim();

  if (
    /Bearer\s+/i.test(text) ||
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(text) ||
    /(access|refresh|invite)?token(hash)?/i.test(text) ||
    /authorization|password(hash)?|api[_-]?key|cookie/i.test(text)
  ) {
    return 'Dato sensible oculto';
  }

  return text;
};

export default {
  formatSyncHistoryAction,
  formatSyncHistoryCounts,
  formatSyncHistoryPending,
  formatSyncHistoryStatus,
  getSyncHistoryStatusTone,
  sanitizeSyncHistoryDisplayText,
};
