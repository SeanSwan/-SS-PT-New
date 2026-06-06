/**
 * Client Training Plan Horizon Service
 * ====================================
 *
 * Canonical SwanStudios workout-plan horizon definitions. Kept framework-free
 * so routes, read models, and AI-safe summaries share one vocabulary.
 */

export const PLAN_HORIZONS = Object.freeze([
  Object.freeze({ key: 'one_day', label: '1 Day', durationWeeks: 1, durationDays: 1, isDefault: false }),
  Object.freeze({ key: 'one_week', label: '1 Week', durationWeeks: 1, durationDays: 7, isDefault: false }),
  Object.freeze({ key: 'one_month', label: '1 Month', durationWeeks: 4, durationDays: 30, isDefault: false }),
  Object.freeze({ key: 'three_month', label: '3 Month', durationWeeks: 12, durationDays: 90, isDefault: false }),
  Object.freeze({ key: 'six_month', label: '6 Month', durationWeeks: 26, durationDays: 182, isDefault: true }),
  Object.freeze({ key: 'nine_month', label: '9 Month', durationWeeks: 39, durationDays: 273, isDefault: false }),
  Object.freeze({ key: 'twelve_month', label: '12 Month', durationWeeks: 52, durationDays: 365, isDefault: false }),
]);

export const DEFAULT_PLAN_HORIZON_KEY = PLAN_HORIZONS.find((slot) => slot.isDefault)?.key || 'six_month';

const HORIZON_ALIASES = new Map([
  ['1_day', 'one_day'], ['1-day', 'one_day'], ['day', 'one_day'], ['daily', 'one_day'], ['one-day', 'one_day'],
  ['1_week', 'one_week'], ['1-week', 'one_week'], ['week', 'one_week'], ['weekly', 'one_week'], ['one-week', 'one_week'],
  ['1_month', 'one_month'], ['1-month', 'one_month'], ['month', 'one_month'], ['monthly', 'one_month'], ['one-month', 'one_month'],
  ['3_month', 'three_month'], ['3-month', 'three_month'], ['three-month', 'three_month'], ['quarter', 'three_month'],
  ['6_month', 'six_month'], ['6-month', 'six_month'], ['six-month', 'six_month'], ['default', 'six_month'],
  ['9_month', 'nine_month'], ['9-month', 'nine_month'], ['nine-month', 'nine_month'],
  ['12_month', 'twelve_month'], ['12-month', 'twelve_month'], ['twelve-month', 'twelve_month'], ['annual', 'twelve_month'],
]);

const HORIZON_KEYS = new Set(PLAN_HORIZONS.map((slot) => slot.key));

export const normalizePlanHorizonKey = (value) => {
  const raw = typeof value === 'string' && value.trim() ? value.trim() : null;
  if (!raw) return null;
  const normalized = raw.toLowerCase().replace(/\s+/g, '_');
  if (HORIZON_KEYS.has(normalized)) return normalized;
  return HORIZON_ALIASES.get(normalized) || null;
};
