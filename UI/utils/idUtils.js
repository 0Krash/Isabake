export const normalizeId = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

export const idsMatch = (left, right) =>
  normalizeId(left) === normalizeId(right);
