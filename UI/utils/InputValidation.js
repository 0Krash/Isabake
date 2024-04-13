export default function InputValidation({ value, maxLength }) {
  // console.log(value);
  if (value === undefined || value === null || value === '') {
    return { valid: false, error: 'El campo no puede estar vacío' };
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return { valid: false, error: 'El campo no puede estar vacío' };
    }
    if (trimmedValue.length < maxLength) {
      return {
        valid: false,
        error: `Necesita una descripción más extensa, ejemplo: Nombre, Marca, etc...`,
      };
    }
  } else if (typeof value === 'number') {
    if (isNaN(value)) {
      return { valid: false, error: 'El campo no puede estar vacío' };
    }
    if (value <= 0) {
      return { valid: false, error: 'Ingrese un número mayor a cero' };
    }
  }

  return { valid: true, error: '' };
}
