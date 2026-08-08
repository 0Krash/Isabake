import {
  createAuthModeCopy,
  createAuthStatusDisplay,
  formatAuthError,
  getAuthActionMessage,
  sanitizeSessionForDisplay,
} from './authStatusModel';

describe('AuthStatusScreen helpers', () => {
  test('exposes login and register copy without auto-sync behavior', () => {
    expect(createAuthModeCopy('login')).toEqual({
      button: 'Iniciar sesion',
      switchLabel: 'Crear cuenta',
      title: 'Iniciar sesion',
    });
    expect(createAuthModeCopy('register')).toEqual({
      button: 'Crear cuenta',
      switchLabel: 'Ya tengo cuenta',
      title: 'Crear cuenta',
    });
  });

  test('auth status display does not expose raw tokens', () => {
    const display = createAuthStatusDisplay({
      session: {
        accessToken: 'jwt_access_secret',
        email: 'ana@example.test',
        refreshToken: 'jwt_refresh_secret',
        sessionState: 'authenticated',
      },
    });

    expect(display).toEqual({
      detail: 'ana@example.test',
      state: 'authenticated',
      title: 'Sync compartido activo',
    });
    expect(JSON.stringify(display)).not.toContain('jwt_access_secret');
    expect(JSON.stringify(display)).not.toContain('jwt_refresh_secret');
  });

  test('auth status display includes local-only, expired, refreshing, and revoked states', () => {
    expect(createAuthStatusDisplay().state).toBe('local-only');
    expect(createAuthStatusDisplay({ refreshing: true }).state).toBe('refreshing');
    expect(
      createAuthStatusDisplay({
        session: {
          email: 'ana@example.test',
          sessionState: 'expired',
        },
      }).state,
    ).toBe('expired');
    expect(
      createAuthStatusDisplay({
        error: 'session_revoked',
      }),
    ).toEqual({
      detail: 'Esta sesion fue revocada. Inicia sesion de nuevo en este dispositivo.',
      state: 'revoked',
      title: 'Sesion revocada',
    });
  });

  test('formats safe auth errors and action messages', () => {
    expect(formatAuthError('invalid_credentials')).toBe(
      'Correo o contrasena incorrectos.',
    );
    expect(formatAuthError('refresh_failed')).toBe(
      'No se pudo actualizar la sesion. Vuelve a iniciar sesion si necesitas sync compartido.',
    );
    expect(getAuthActionMessage('logout')).toBe(
      'Sesion cerrada. No se elimino ningun dato local.',
    );
    expect(getAuthActionMessage('login')).toBe(
      'Sesion iniciada. El sync compartido queda disponible.',
    );
  });

  test('session display does not expose token hashes', () => {
    const display = sanitizeSessionForDisplay({
      deviceName: 'iPhone',
      refreshTokenHash: 'hash_secret',
      sessionId: 'session_1',
    });

    expect(display).toEqual({
      deviceName: 'iPhone',
      isCurrent: false,
      lastUsedAt: null,
      revokedAt: null,
      sessionId: 'session_1',
    });
    expect(JSON.stringify(display)).not.toContain('hash_secret');
  });
});
