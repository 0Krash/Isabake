import { createSettingsMenuItems } from '../../components/appNavigationModel';

describe('SettingsScreen navigation model', () => {
  test('shows account-adjacent configuration destinations in order', () => {
    expect(createSettingsMenuItems()).toEqual([
      {
        description: 'Equipo, accesos e invitaciones.',
        key: 'workspace',
        label: 'Administrar negocios',
      },
      {
        description: 'Lugares donde surtes materiales para tus productos.',
        key: 'stores',
        label: 'Tiendas',
      },
      {
        description: 'Clientes asociados a ventas y transacciones.',
        key: 'clients',
        label: 'Clientes',
      },
      {
        description: 'Preferencias generales de la aplicacion.',
        key: 'app-options',
        label: 'Opciones de la app',
      },
    ]);
  });

  test('keeps dev tools hidden unless explicitly enabled', () => {
    expect(
      createSettingsMenuItems().some((item) => item.key === 'dev-sync'),
    ).toBe(false);
    expect(createSettingsMenuItems({ devToolsEnabled: true }).at(-1)).toEqual({
      description: 'Solo desarrollo',
      key: 'dev-sync',
      label: 'Herramientas dev',
    });
  });
});
