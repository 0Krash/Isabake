import { getPrimaryNavigationTabs } from './appNavigationModel';

describe('AppBottomNavigation model', () => {
  test('primary navigation has exactly three business tabs', () => {
    expect(getPrimaryNavigationTabs()).toEqual([
      { key: 'home', label: 'Transacciones' },
      { key: 'recipes', label: 'Recetas' },
      { key: 'inventory', label: 'Inventario' },
    ]);
  });

  test('primary navigation does not include technical tabs', () => {
    const labels = getPrimaryNavigationTabs().map((tab) => tab.label);

    expect(labels).not.toEqual(
      expect.arrayContaining([
        'Sync',
        'Workspace',
        'Conflictos',
        'Cuenta',
        'Sync Dev',
      ]),
    );
  });
});
