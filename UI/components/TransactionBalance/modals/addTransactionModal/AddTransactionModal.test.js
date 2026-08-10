import fs from 'fs';
import path from 'path';

describe('AddTransactionModal client selection', () => {
  test('requires a selected client before creating a sale', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'AddTransactionModal.js'),
      'utf8',
    );

    expect(source).toContain('validationErrorClient');
    expect(source).toContain('setValidationErrorClient');
    expect(source).toContain('validationErrorAmount &&\n                        validationErrorClient');
  });

  test('uses a separate client picker modal instead of an inline dropdown', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'ClientInputComponent.js'),
      'utf8',
    );

    expect(source).toContain('SelectionPickerModal');
    expect(source).toContain('Seleccionar cliente');
    expect(source).toContain('Sin cliente seleccionado');
    expect(source).toContain('Toca para seleccionar uno registrado');
    expect(source).toContain('Ir a clientes');
    expect(source).toContain('onOpenClientManager');
    expect(source).not.toContain('SelectList');
  });

  test('uses the shared picker modal for stores too', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'StoreInputComponent.js'),
      'utf8',
    );

    expect(source).toContain('SelectionPickerModal');
    expect(source).toContain('Seleccionar tienda');
    expect(source).toContain('Ir a tiendas');
    expect(source).not.toContain('SelectList');
  });
});
