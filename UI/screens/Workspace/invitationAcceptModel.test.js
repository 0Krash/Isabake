import {
  formatInvitationAcceptError,
  formatInvitationPreviewStatus,
  getInvitationAcceptActionState,
  runSafeInvitationAction,
} from './invitationAcceptModel';

const fs = require('fs');
const path = require('path');

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
      error: 'Inicia sesion con el correo invitado para aceptar o rechazar.',
      ok: false,
    });
    expect(setError).toHaveBeenLastCalledWith(
      'Inicia sesion con el correo invitado para aceptar o rechazar.',
    );
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
      error: 'El link de invitacion no es valido.',
      ok: false,
    });
    expect(setError).toHaveBeenLastCalledWith(
      'El link de invitacion no es valido.',
    );
  });

  test('formats invitation accept errors and preview states safely', () => {
    expect(formatInvitationAcceptError('invitation_email_mismatch')).toBe(
      'Esta invitacion pertenece a otro correo. Cambia de cuenta para continuar.',
    );
    expect(formatInvitationAcceptError('invitation_token_expired')).toBe(
      'Esta invitacion expiro. Solicita una nueva invitacion.',
    );
    expect(formatInvitationAcceptError('invitation_not_active')).toBe(
      'Esta invitacion ya fue usada, rechazada o revocada.',
    );
    expect(formatInvitationPreviewStatus('revoked')).toBe('Revocada');
    expect(formatInvitationPreviewStatus('declined')).toBe('Rechazada');
  });

  test('disables invitation actions when login is required or invitation is closed', () => {
    expect(
      getInvitationAcceptActionState({
        authRequired: false,
        loading: false,
        preview: { status: 'invited' },
      }),
    ).toEqual({
      canAccept: true,
      canDecline: true,
      disabledReason: null,
    });
    expect(
      getInvitationAcceptActionState({
        authRequired: true,
        preview: { status: 'invited' },
      }),
    ).toEqual({
      canAccept: false,
      canDecline: false,
      disabledReason: 'Inicia sesion con el correo invitado.',
    });
    expect(
      getInvitationAcceptActionState({
        preview: { status: 'expired' },
      }),
    ).toEqual({
      canAccept: false,
      canDecline: false,
      disabledReason: 'Esta invitacion ya no esta pendiente.',
    });
  });

  test('invitation screens do not execute sync or auto-sync directly', () => {
    const invitationScreenSource = fs.readFileSync(
      path.join(__dirname, 'InvitationAcceptScreen.js'),
      'utf8',
    );
    const appSource = fs.readFileSync(
      path.join(__dirname, '../../App.js'),
      'utf8',
    );
    const forbiddenSyncCalls = [
      'runSync(',
      'pushPendingChanges',
      'pullRemoteChanges',
      'notifyAutoSyncNeeded',
      'runAutoSyncNow',
    ];

    forbiddenSyncCalls.forEach((forbiddenCall) => {
      expect(invitationScreenSource).not.toContain(forbiddenCall);
    });
    expect(appSource).not.toContain('runAutoSyncNow');
    expect(appSource).not.toContain('notifyAutoSyncNeeded');
  });
});
