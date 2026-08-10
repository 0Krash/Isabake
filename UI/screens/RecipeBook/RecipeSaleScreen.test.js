import fs from 'fs';
import path from 'path';

describe('RecipeSaleScreen client requirement', () => {
  test('moves client selection into the sale confirmation flow', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'RecipeSaleScreen.js'),
      'utf8',
    );

    expect(source).toContain('saleReviewVisible');
    expect(source).toContain('Confirmar venta');
    expect(source).toContain('getRecipeSaleTopPadding');
    expect(source).toContain('recipeSaleBottomPadding');
    expect(source).toContain('Piezas a vender');
    expect(source).toContain('Cantidad que entregarás al cliente');
    expect(source).toContain('Cobro de la venta');
    expect(source).toContain('Monto total que pagará el cliente');
    expect(source).toContain('Ganancia esperada');
    expect(source).toContain('Dinero estimado que queda para ti');
    expect(source).toContain('clientWasSelected');
    expect(source).toContain('ClientInputComponent');
    expect(source).toContain('Selecciona a quien se le vendio para continuar.');
    expect(source).toContain('onOpenClientManager');
    expect(source).toContain('client: selectedClient');
    expect(source).toContain('Rentabilidad de la venta');
    expect(source).not.toContain(
      'Selecciona a quien se le vendio antes de registrar la venta.',
    );
  });

  test('optimizes confirmation header and action button width', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'RecipeSaleScreen.js'),
      'utf8',
    );

    expect(source).toContain('styles.reviewHeaderCopy');
    expect(source).toContain('numberOfLines={1}');
    expect(source).toContain('flex: 1.35');
    expect(source).toContain('flex: 0.85');
  });
});

describe('RecipeBookScreen shared picker wiring', () => {
  test('uses the reusable selection modal for inventory ingredients', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'RecipeBookScreen.js'),
      'utf8',
    );

    expect(source).toContain('SelectionPickerModal');
    expect(source).toContain('Ingrediente de inventario');
    expect(source).toContain('Ir a inventario');
    expect(source).not.toContain('inventoryIngredientScrollRef');
  });
});
