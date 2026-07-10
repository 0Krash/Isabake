var mockRunAutoSyncNow = jest.fn();

jest.mock('./autoSyncService', () => ({
  runAutoSyncNow: (...args) => mockRunAutoSyncNow(...args),
}));

import { requestLocalChangeSync } from './localChangeSync';

describe('localChangeSync', () => {
  beforeEach(() => {
    mockRunAutoSyncNow.mockReset();
  });

  test('requests an immediate local-change auto-sync', async () => {
    mockRunAutoSyncNow.mockResolvedValueOnce({
      ok: true,
      skipped: false,
    });

    await expect(
      requestLocalChangeSync({ runAutoSync: mockRunAutoSyncNow }),
    ).resolves.toEqual({
      ok: true,
      skipped: false,
    });

    expect(mockRunAutoSyncNow).toHaveBeenCalledWith({
      appState: 'active',
      reason: 'local_change',
    });
  });

  test('swallows sync failures so local writes stay offline-first', async () => {
    mockRunAutoSyncNow.mockRejectedValueOnce(new Error('backend_unreachable'));

    await expect(
      requestLocalChangeSync({ runAutoSync: mockRunAutoSyncNow }),
    ).resolves.toEqual({
      errorCode: 'backend_unreachable',
      ok: false,
      skipped: false,
    });
  });
});
