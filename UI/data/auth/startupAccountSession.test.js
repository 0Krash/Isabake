import { restoreAccountSessionOnStartup } from './startupAccountSession';

describe('startup account session restore', () => {
  test('returns connected when a stored session verifies', async () => {
    await expect(
      restoreAccountSessionOnStartup({
        check: jest.fn(async () => ({ userId: 'user_1' })),
      }),
    ).resolves.toEqual({
      session: { userId: 'user_1' },
      status: 'connected',
    });
  });

  test('keeps local mode when verification fails', async () => {
    await expect(
      restoreAccountSessionOnStartup({
        check: jest.fn(async () => {
          throw new Error('session_expired');
        }),
      }),
    ).resolves.toEqual({
      error: 'session_expired',
      session: null,
      status: 'local',
    });
  });
});
