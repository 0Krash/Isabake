import { createSecondaryMenuItems } from './appNavigationModel';

describe('AppSecondaryMenu model', () => {
  test('secondary menu exposes friendly non-primary destinations', () => {
    expect(createSecondaryMenuItems()).toEqual([
      {
        description: 'Sesion y seguridad',
        key: 'account',
        label: 'Cuenta',
      },
      {
        description: 'Colaboradores e invitaciones',
        key: 'workspace',
        label: 'Compartir negocio',
      },
      {
        description: 'Enviar o recibir cambios manualmente',
        key: 'sync',
        label: 'Respaldo y sincronizacion',
      },
      {
        description: 'Cambios que necesitan decision',
        key: 'conflicts',
        label: 'Cambios por revisar',
      },
    ]);
  });

  test('dev tools are hidden unless dev tools are explicitly enabled', () => {
    expect(
      createSecondaryMenuItems().some((item) => item.key === 'dev-sync'),
    ).toBe(false);
    expect(
      createSecondaryMenuItems({ devToolsEnabled: true }).at(-1),
    ).toEqual({
      description: 'Solo desarrollo',
      key: 'dev-sync',
      label: 'Herramientas dev',
    });
  });
});
