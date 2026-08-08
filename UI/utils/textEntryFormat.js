export const capitalizeUserEntry = (value = '') =>
  String(value || '').replace(/^(\s*)(\p{L})/u, (match, spacing, letter) =>
    `${spacing}${letter.toLocaleUpperCase('es-MX')}`,
  );

export default capitalizeUserEntry;
