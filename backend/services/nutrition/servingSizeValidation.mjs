/**
 * Nutrition serving-size validation.
 *
 * HTTP routes receive JSON values, so this parser accepts only finite numbers
 * and plain decimal strings. It intentionally rejects JavaScript coercions such
 * as booleans, arrays, hex strings, and exponent notation.
 */
const PLAIN_DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/;

export const parseServingSizeGrams = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (!PLAIN_DECIMAL_PATTERN.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};
