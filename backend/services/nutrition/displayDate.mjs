/**
 * Nutrition display-date utilities.
 *
 * Provides the studio-facing calendar date used when nutrition writers need
 * an omitted-date fallback.
 */
const displayTimeZone = () => process.env.SWAN_DISPLAY_TZ || 'America/Los_Angeles';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const NUTRITION_DATE_ERROR = 'Date must be a real YYYY-MM-DD calendar date';
export const NUTRITION_FUTURE_DATE_ERROR = 'Cannot log meals for a future date';

export const formatDisplayDate = (date = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: displayTimeZone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    if (values.year && values.month && values.day) {
      return `${values.year}-${values.month}-${values.day}`;
    }
  } catch {
    // Fall back to UTC when SWAN_DISPLAY_TZ is invalid or unavailable.
  }
  return date.toISOString().slice(0, 10);
};

export const isRealCalendarDate = (value) => {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
};

export const serverUtcDateOnly = (offsetDays = 0, now = new Date()) => {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
  return date.toISOString().slice(0, 10);
};

export const resolveNutritionWriteDate = (value, now = new Date()) => {
  if (value === undefined || value === null || value === '') return formatDisplayDate(now);
  if (!isRealCalendarDate(value)) throw new Error(NUTRITION_DATE_ERROR);
  if (value > serverUtcDateOnly(1, now)) throw new Error(NUTRITION_FUTURE_DATE_ERROR);
  return value;
};
