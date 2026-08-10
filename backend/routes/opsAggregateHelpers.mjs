/**
 * opsAggregateHelpers — shared window bounding + rounding for the admin ops
 * rollup routes (SWA-138 S15/S16). Extracted when the second pair of endpoints
 * pushed the route file past the 300-line cap (Rule 4).
 */

export const MAX_WINDOW_DAYS = 365;
export const DEFAULT_WINDOW_DAYS = 30;
/** Sessions that represent real booked trainer time. */
export const BOOKED_STATUSES = ['scheduled', 'confirmed', 'completed'];

/** Clamp a caller-supplied window so no request can scan the whole table. */
export function resolveWindowDays(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_WINDOW_DAYS;
  return Math.min(n, MAX_WINDOW_DAYS);
}

export const since = (days) => new Date(Date.now() - days * 86400000);
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
