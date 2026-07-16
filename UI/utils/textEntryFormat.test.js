import { capitalizeUserEntry } from './textEntryFormat';

describe('textEntryFormat', () => {
  test('capitalizes the first typed letter without trimming user spacing', () => {
    expect(capitalizeUserEntry('proyecto nuevo')).toBe('Proyecto nuevo');
    expect(capitalizeUserEntry('  ázucar glass')).toBe('  Ázucar glass');
    expect(capitalizeUserEntry('')).toBe('');
  });
});
