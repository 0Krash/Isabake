import { runSafeInvitationAction } from './invitationAcceptModel';

describe('invitationAcceptModel', () => {
  test('handled action failure sets error and does not throw', async () => {
    const setError = jest.fn();
    const setLoading = jest.fn();
    const setMessage = jest.fn();

    await expect(
      runSafeInvitationAction({
        action: jest.fn(async () => {
          throw new Error('auth_required');
        }),
        getToken: () => 'invite_token',
        setError,
        setLoading,
        setMessage,
        successMessage: 'ok',
      }),
    ).resolves.toEqual({
      error: 'auth_required',
      ok: false,
    });
    expect(setError).toHaveBeenLastCalledWith('auth_required');
    expect(setLoading).toHaveBeenLastCalledWith(false);
    expect(setMessage).toHaveBeenCalledWith(null);
  });

  test('missing token returns safe invalid link error', async () => {
    const setError = jest.fn();

    await expect(
      runSafeInvitationAction({
        action: jest.fn(),
        getToken: () => null,
        setError,
      }),
    ).resolves.toEqual({
      error: 'invalid_invitation_link',
      ok: false,
    });
    expect(setError).toHaveBeenLastCalledWith('invalid_invitation_link');
  });
});
