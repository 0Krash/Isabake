import { capitalizeUserEntry } from './textEntryFormat';

describe('textEntryFormat', () => {
  test('capitalizes the first typed letter without trimming user spacing', () => {
    expect(capitalizeUserEntry('negocio nuevo')).toBe('Negocio nuevo');
    expect(capitalizeUserEntry('  ázucar glass')).toBe('  Ázucar glass');
    expect(capitalizeUserEntry('')).toBe('');
  });
});
