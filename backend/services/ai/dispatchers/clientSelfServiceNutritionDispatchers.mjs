/**
 * Client self-service nutrition dispatchers
 * =========================================
 * Authenticated-client macro logging for Swan Coach. Uses the canonical
 * DailyMacroLog write service and returns totals without echoing meal text.
 */
import { createMacroEntries } from '../../nutrition/macroLogService.mjs';

const displayTimeZone = () => process.env.SWAN_DISPLAY_TZ || 'America/Los_Angeles';

const formatDisplayDate = (date = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: displayTimeZone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    if (values.year && values.month && values.day) return `${values.year}-${values.month}-${values.day}`;
  } catch {
    // Fall back to UTC when SWAN_DISPLAY_TZ is invalid or unavailable.
  }
  return date.toISOString().slice(0, 10);
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const selfUserId = (ctx = {}) => toNumber(ctx.user?.id);

export const dispatchLogMyNutrition = async (params = {}, ctx = {}) => {
  const userId = selfUserId(ctx);
  const result = await createMacroEntries(params.meals || [], {
    clientId: userId,
    date: params.date || formatDisplayDate(),
  });

  return {
    userId,
    mealsLogged: toNumber(result.mealsLogged),
    date: result.date ?? null,
    totalCalories: toNumber(result.totalCalories),
    totalProtein: toNumber(result.totalProtein),
    totalCarbs: toNumber(result.totalCarbs),
    totalFat: toNumber(result.totalFat),
  };
};
