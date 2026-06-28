export const createAuthModeCopy = (mode) =>
  mode === 'register'
    ? {
        button: 'Crear cuenta',
        switchLabel: 'Ya tengo cuenta',
        title: 'Crear cuenta',
      }
    : {
        button: 'Iniciar sesion',
        switchLabel: 'Crear cuenta',
        title: 'Iniciar sesion',
      };
