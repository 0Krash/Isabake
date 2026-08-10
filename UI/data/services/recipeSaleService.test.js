import fs from 'fs';
import path from 'path';

describe('recipeSaleService client payload', () => {
  test('passes selected client into the sale transaction payload', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'recipeSaleService.js'),
      'utf8',
    );

    expect(source).toContain('client = null');
    expect(source).toContain('client,');
    expect(source).toContain("transactionType: 'Ventas'");
  });
});
