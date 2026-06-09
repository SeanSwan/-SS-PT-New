/**
 * Client Training Safe Read Value Service
 * =======================================
 *
 * Small value helpers for read-safe client-training services. Keeping these
 * helpers shared avoids repeated optional-branching in LLM-facing read models.
 */

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const toPlainObject = (value) => {
  if (value && typeof value.toJSON === 'function') return value.toJSON();
  return value;
};

export const compactString = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

export const compactStringOr = (value, fallback) => compactString(value) || fallback;

export const toBoolean = (value) => value === true;

export const toFiniteNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const valueOr = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  return value;
};

export const stringIdOrNull = (value) => {
  if (value === undefined || value === null) return null;
  return String(value);
};

const isDateOnlyString = (value) => (
  typeof value === 'string' && DATE_ONLY_PATTERN.test(value)
);

const parseDateValue = (value) => {
  if (value instanceof Date) return value;
  return new Date(value);
};

const formatDateOnly = (date) => {
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

export const toDateOnly = (value) => {
  const raw = valueOr(value, '');
  if (isDateOnlyString(raw)) return raw;
  return formatDateOnly(parseDateValue(raw));
};
