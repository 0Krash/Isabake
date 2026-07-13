const fs = require('fs');
const path = require('path');

describe('TransactionMenu configuration options', () => {
  const source = fs.readFileSync(
    path.join(__dirname, 'TransactionMenu.js'),
    'utf8',
  );

  test('shows actionable configuration destinations instead of static settings', () => {
    expect(source.indexOf("label: 'Cuenta'")).toBeLessThan(
      source.indexOf("label: 'Compartir proyecto'"),
    );
    expect(source).toContain("label: 'Respaldo y sync'");
    expect(source).not.toContain("label: 'Tema del telefono'");
    expect(source).not.toContain("label: 'Moneda'");
    expect(source).not.toContain("label: 'Registros por carga'");
  });
});
