import {
  formatSyncHistoryAction,
  formatSyncHistoryCounts,
  formatSyncHistoryPending,
  formatSyncHistoryStatus,
  sanitizeSyncHistoryDisplayText,
} from './syncHistoryModel';

describe('syncHistoryModel', () => {
  test('formats friendly action and status labels', () => {
    expect(formatSyncHistoryAction('push')).toBe('Enviar cambios');
    expect(formatSyncHistoryAction('pull')).toBe('Recibir cambios');
    expect(formatSyncHistoryAction('full_sync')).toBe(
      'Sincronizacion completa',
    );
    expect(formatSyncHistoryAction('status_refresh')).toBe(
      'Revision de estado',
    );
    expect(formatSyncHistoryStatus('success')).toBe('Completado');
    expect(formatSyncHistoryStatus('failed')).toBe('Fallo');
  });

  test('formats counts and pending summary without raw ids', () => {
    expect(
      formatSyncHistoryCounts({
        conflictCount: 1,
        pulledCount: 2,
        pushedCount: 3,
      }),
    ).toBe('Enviados: 3 · Recibidos: 2 · Conflictos: 1');
    expect(formatSyncHistoryCounts({})).toBe('Sin cambios aplicados');
    expect(formatSyncHistoryPending({ pendingAfter: 0, pendingBefore: 4 })).toBe(
      'Pendientes: 4 -> 0',
    );
  });

  test('hides token and hash-like display text', () => {
    expect(sanitizeSyncHistoryDisplayText('Bearer secret')).toBe(
      'Dato sensible oculto',
    );
    expect(sanitizeSyncHistoryDisplayText('refreshTokenHash=secret')).toBe(
      'Dato sensible oculto',
    );
    expect(sanitizeSyncHistoryDisplayText('auth_required')).toBe(
      'auth_required',
    );
  });
});
