/**
 * isoDateOnly.mjs
 * ===============
 * Strict calendar-date validation for date-only API fields.
 */

const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isRealIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_ONLY_REGEX.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
