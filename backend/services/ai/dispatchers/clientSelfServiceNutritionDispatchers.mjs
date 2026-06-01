/**
 * Client self-service nutrition dispatchers
 * =========================================
 * Authenticated-client macro logging for Swan Coach. Uses the canonical
 * DailyMacroLog write service and returns totals without echoing meal text.
 */
import { createMacroEntries } from '../../nutrition/macroLogService.mjs';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const selfUserId = (ctx = {}) => toNumber(ctx.user?.id);

export const dispatchLogMyNutrition = async (params = {}, ctx = {}) => {
  const userId = selfUserId(ctx);
  const result = await createMacroEntries(params.meals || [], {
    clientId: userId,
    date: params.date || null,
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
