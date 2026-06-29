import {
  createAuthModeCopy,
  createAuthStatusDisplay,
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

  test('auth status display includes local-only, expired, and refreshing states', () => {
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
  });
});
