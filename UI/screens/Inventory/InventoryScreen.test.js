import fs from 'fs';
import path from 'path';

describe('InventoryScreen shared picker wiring', () => {
  test('uses the reusable selection modal for stores', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'InventoryScreen.js'),
      'utf8',
    );

    expect(source).toContain('SelectionPickerModal');
    expect(source).toContain('Seleccionar proveedor');
    expect(source).toContain('Ir al administrador de tiendas');
    expect(source).toContain('onOpenStores');
    expect(source).toContain('onOpenStores?.()');
    expect(source).not.toContain('AddStoreModal');
    expect(source).not.toContain('storePickerOption');
  });
});
