/**
 * Nutrition display-date utilities.
 *
 * Provides the studio-facing calendar date used when nutrition writers need
 * an omitted-date fallback.
 */
const displayTimeZone = () => process.env.SWAN_DISPLAY_TZ || 'America/Los_Angeles';

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
