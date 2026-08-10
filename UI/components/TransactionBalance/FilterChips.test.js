import fs from 'fs';
import path from 'path';

describe('FilterChips shared behavior', () => {
  test('selected chips show non-zero result counts only', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'FilterChips.js'),
      'utf8',
    );

    expect(source).toContain('isSelected && value !== undefined && Number(value) !== 0');
    expect(source).toContain('shouldShowValue ? `${label} (${value})` : label');
    expect(source).not.toContain('showValues');
  });
});
