/**
 * ============================================================================
 * FILE: nutritionAdherenceService.mjs
 * PURPOSE: Server-side adherence math — the spine every surface reads (S1.2)
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 *
 * WHAT THIS FILE DOES: One computation, many consumers — dashboard summary,
 * coach context, roster triage, and the reward loop all read the SAME numbers
 * from here instead of re-deriving them divergently client-side.
 *
 * DATE LAW (Kimi P1-6): all "today" and streak math is USER-LOCAL via the
 * existing clientTrainingDateService (User.timeZone, IANA-validated). A PST
 * client logging dinner at 9pm must never lose a streak to UTC midnight.
 *
 * DATA-TRUTH LAW (Kimi P1-11): coach-inferred entries are counted and
 * SURFACED (inferredEntryCount) so trainers can discount them — invented
 * data must never be indistinguishable from logged truth.
 */
import { Op } from 'sequelize';
import DailyMacroLog from '../../models/DailyMacroLog.mjs';
import User from '../../models/User.mjs';
import {
  DEFAULT_CLIENT_TIME_ZONE,
  formatDateOnlyInTimeZone,
} from '../clientTrainingDateService.mjs';
import logger from '../../utils/logger.mjs';

const STREAK_LOOKBACK_DAYS = 90;

const daysAgo = (isoDate, n) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
};
const dayBefore = (isoDate) => daysAgo(isoDate, 1);

/**
 * Pure streak math over DISTINCT logged dates (ISO strings, any order).
 * A streak counts consecutive user-local days ending today or yesterday —
 * "yesterday" so a streak isn't reported broken before the user has had a
 * chance to log today (no-penalty framing, ED-safe rule S3.4).
 */
export function computeLogStreak(loggedDates, todayLocal) {
  const days = new Set(loggedDates);
  let cursor = days.has(todayLocal) ? todayLocal : dayBefore(todayLocal);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = dayBefore(cursor);
  }
  return streak;
}

const pct = (actual, target) => {
  if (!Number.isFinite(actual) || !Number.isFinite(target) || target <= 0) return null;
  return Math.round((actual / target) * 100);
};

/**
 * Pure per-range rollup of entries against a target (both optional-tolerant).
 * @param {Array<{date: string, calories?: number, protein?: number, source?: string, reviewStatus?: string}>} entries
 * @param {object|null} target - NutritionTarget-shaped (dailyCalories, proteinGrams, ...)
 * @param {number} rangeDays - calendar length of the queried range
 */
export function summarizeAdherence(entries = [], target = null, rangeDays = 7) {
  const byDay = new Map();
  let inferredEntryCount = 0;
  let needsReviewCount = 0;

  for (const entry of entries) {
    if (!entry?.date) continue;
    const day = byDay.get(entry.date) || { calories: 0, protein: 0 };
    day.calories += Number(entry.calories) || 0;
    day.protein += Number(entry.protein) || 0;
    byDay.set(entry.date, day);
    if (entry.source === 'coach_inferred') inferredEntryCount += 1;
    if (entry.reviewStatus === 'needs_review') needsReviewCount += 1;
  }

  const loggedDays = byDay.size;
  const targetProtein = target ? Number(target.proteinGrams) || null : null;
  const targetCalories = target ? Number(target.dailyCalories) || null : null;

  let proteinHitDays = 0;
  let calorieSum = 0;
  for (const day of byDay.values()) {
    calorieSum += day.calories;
    if (targetProtein && day.protein >= targetProtein * 0.9) proteinHitDays += 1;
  }

  return {
    loggedDays,
    consistencyScore: rangeDays > 0 ? Math.round((loggedDays / rangeDays) * 100) : 0,
    proteinTargetHitRate: targetProtein && loggedDays > 0
      ? Math.round((proteinHitDays / loggedDays) * 100) : null,
    avgCaloriesPctOfTarget: targetCalories && loggedDays > 0
      ? pct(calorieSum / loggedDays, targetCalories) : null,
    inferredEntryCount,
    needsReviewCount,
  };
}

/** User-local today for a user id (falls back to the documented default zone). */
export async function getUserLocalToday(userId) {
  let timeZone = DEFAULT_CLIENT_TIME_ZONE;
  try {
    const user = await User.findByPk(userId, { attributes: ['timeZone'] });
    if (user?.timeZone) timeZone = user.timeZone;
  } catch (err) {
    logger.warn(`[NutritionAdherence] timezone lookup failed for user ${userId}: ${err.message}`);
  }
  return { todayLocal: formatDateOnlyInTimeZone(new Date(), timeZone), timeZone };
}

/**
 * Current log streak for a user, user-local, from distinct logged dates.
 * Best-effort: returns 0 on any failure rather than breaking the caller.
 */
export async function getCurrentLogStreak(userId) {
  try {
    const { todayLocal } = await getUserLocalToday(userId);
    const rows = await DailyMacroLog.findAll({
      attributes: ['date'],
      where: { userId, date: { [Op.gte]: daysAgo(todayLocal, STREAK_LOOKBACK_DAYS) } },
      group: ['date'],
      order: [['date', 'DESC']],
      limit: STREAK_LOOKBACK_DAYS,
      raw: true,
    });
    return computeLogStreak(rows.map((r) => String(r.date)), todayLocal);
  } catch (err) {
    logger.warn(`[NutritionAdherence] streak computation failed for user ${userId}: ${err.message}`);
    return 0;
  }
}

export default {
  computeLogStreak,
  summarizeAdherence,
  getUserLocalToday,
  getCurrentLogStreak,
};
