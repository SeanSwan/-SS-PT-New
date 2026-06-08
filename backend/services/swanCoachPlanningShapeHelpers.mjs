/**
 * Shared read-only data-shape helpers for Swan Coach planning context.
 *
 * These helpers normalize JSON-ish workout-plan payloads without exposing PII
 * or mutating plan/session data.
 */

export function tryParse(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const isEmptyValue = value => value === undefined || value === null || value === '';

function recordOrEmpty(value) {
  if (!value || typeof value !== 'object') return {};
  return value;
}

export function firstPresent(...values) {
  return values.find(value => !isEmptyValue(value));
}

export function present(value) {
  if (isEmptyValue(value)) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

export function anyPresent(...values) {
  return values.some(present);
}

export function getWeekDaysOrSessions(week) {
  const record = recordOrEmpty(week);
  const days = asArray(record.days);
  return days.length > 0 ? days : asArray(record.sessions);
}
