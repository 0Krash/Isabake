import { createAuthModeCopy } from './authStatusModel';

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
});
