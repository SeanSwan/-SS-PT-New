/**
 * Strict numeric input validation for nutrition data writes.
 *
 * Accepts finite numbers and plain decimal strings. Rejects JavaScript
 * coercions and partial parses so writers do not create false estimates.
 */
const PLAIN_DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/;

export const parsePlainDecimalNumber = (value) => {
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
