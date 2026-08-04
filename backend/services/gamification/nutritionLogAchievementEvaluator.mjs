/**
 * ============================================================================
 * FILE: nutritionLogAchievementEvaluator.mjs
 * PURPOSE: Award the dormant nutrition-logging achievements when a macro log lands.
 * ADDED: 2026-08-04 (nutrition blueprint Phase 3, S3.1)
 * ============================================================================
 *
 * THE PROBLEM THIS SOLVES: the catalog has carried `log_nutrition_1/7/30/90`
 * (distinct logged days) and `nutrition_streak_3/7/30` (consecutive user-local
 * days) since seeding — with no evaluator ever connected, so none could be
 * earned. This module is the connection, cloned from
 * workoutAchievementEvaluator.mjs (same shape, same safety contract).
 *
 * SCOPE — DELIBERATELY NARROW: only the seven achievements named below, selected
 * BY NAME with thresholds encoded HERE rather than inferred from `maxProgress`.
 * Tier expansion multiplies maxProgress (`log_nutrition_1_tier2` = 2.5 days
 * "first log") — inferring thresholds from the column would award tier rows a
 * count the user never earned. Not evaluated: `hydration_streak_*` and
 * `gallon_a_day` need hydration data DailyMacroLog does not capture, and
 * `balanced_week` carries a composite requirement spanning workout + recovery.
 * Awarding those from a macro count would be guessing.
 *
 * ED-SAFE LAW (S3.4, launch blocker): this evaluator only ever AWARDS — it never
 * penalizes, and it never writes or emits copy about a lost/broken/at-risk
 * streak. Streak math (computeLogStreak via getCurrentLogStreak) counts a run
 * ending today OR yesterday, so an unlogged today is never treated as a break.
 *
 * SAFETY: additive only — INSERTs UserAchievements rows, never updates or
 * deletes one. Idempotent by construction (skips what the user already has) and
 * again at the DB level (the unique (userId, achievementId) index makes a
 * concurrent double-award impossible; that violation is swallowed). XP flows
 * through GamificationPointsService with idempotencyKey
 * `nutrition:{userId}:{achievementId}` — a replay can never double-pay.
 *
 * FAILURE POLICY: best-effort BY CONSTRUCTION. Unlike the workout template this
 * function never throws — the macro write path fires it un-awaited, so any
 * failure is logged and returns `{ awarded: [] }`. Logging food is the user's
 * real intent; a gamification miss must never touch that write.
 */

import { Op } from 'sequelize';
import logger from '../../utils/logger.mjs';

/** name → distinct-logged-days threshold (count of DISTINCT dates, all-time). */
const LOG_COUNT_THRESHOLDS = {
  log_nutrition_1: 1,
  log_nutrition_7: 7,
  log_nutrition_30: 30,
  log_nutrition_90: 90,
};

/** name → consecutive user-local-day threshold (current streak). */
const STREAK_THRESHOLDS = {
  nutrition_streak_3: 3,
  nutrition_streak_7: 7,
  nutrition_streak_30: 30,
};

const EVALUATED_NAMES = [...Object.keys(LOG_COUNT_THRESHOLDS), ...Object.keys(STREAK_THRESHOLDS)];

/** Is this a unique-constraint violation (someone else awarded it concurrently)? */
function isUniqueViolation(error) {
  const code = error?.parent?.code || error?.original?.code || error?.code;
  return code === '23505' || error?.name === 'SequelizeUniqueConstraintError';
}

/**
 * Award every nutrition-logging achievement the user has now qualified for.
 *
 * @param {object}  params
 * @param {number}  params.userId
 * @param {object}  params.models          - { UserAchievement, Achievement, DailyMacroLog }
 * @param {object} [params.transaction]    - passed through so awards join the caller's transaction
 * @param {Function} [params.getStreak]    - test seam; defaults to nutritionAdherenceService.getCurrentLogStreak
 * @param {object}  [params.pointsService] - test seam; defaults to GamificationPointsService
 * @returns {Promise<{awarded: Array<{achievementId: number, name: string, xpReward: number}>,
 *                    distinctDays: number, streak: number}>}
 */
export async function evaluateNutritionLogAchievements({
  userId,
  models,
  transaction,
  getStreak,
  pointsService,
} = {}) {
  try {
    const { UserAchievement, Achievement, DailyMacroLog } = models || {};
    if (!userId || !UserAchievement?.findAll || !Achievement?.findAll || !DailyMacroLog?.count) {
      return { awarded: [], distinctDays: 0, streak: 0 };
    }

    const options = transaction ? { transaction } : {};

    // Distinct logged dates, counted from the table rather than a counter
    // column, so a backfill or a correction cannot drift the two apart.
    const distinctDays = await DailyMacroLog.count({
      where: { userId },
      distinct: true,
      col: 'date',
      ...options,
    });
    if (distinctDays < 1) return { awarded: [], distinctDays, streak: 0 };

    // User-local streak (reuses the adherence spine — Rule S1.2's one-computation
    // law; best-effort 0 on failure, which can only under-award, never over-award).
    if (!getStreak) {
      ({ getCurrentLogStreak: getStreak } = await import('../nutrition/nutritionAdherenceService.mjs'));
    }
    const streak = await getStreak(userId);

    // Already-earned ids, so the catalog query excludes them in SQL.
    const owned = await UserAchievement.findAll({
      where: { userId },
      attributes: ['achievementId'],
      ...options,
    });
    const ownedIds = owned.map((row) => row.achievementId).filter((id) => id !== null && id !== undefined);

    // Selection is by exact seeded name (tier-1 rows only — see SCOPE above).
    // Threshold checks happen in JS because they depend on which map a name is in.
    const candidates = await Achievement.findAll({
      where: {
        name: { [Op.in]: EVALUATED_NAMES },
        isActive: { [Op.ne]: false },
        ...(ownedIds.length ? { id: { [Op.notIn]: ownedIds } } : {}),
      },
      attributes: ['id', 'name', 'title', 'xpReward'],
      ...options,
    });

    const qualifies = (name) => {
      if (name in LOG_COUNT_THRESHOLDS) return distinctDays >= LOG_COUNT_THRESHOLDS[name];
      if (name in STREAK_THRESHOLDS) return streak >= STREAK_THRESHOLDS[name];
      return false;
    };
    const eligible = candidates.filter((achievement) => qualifies(achievement.name));
    if (!eligible.length) return { awarded: [], distinctDays, streak };

    if (!pointsService) {
      ({ default: pointsService } = await import('./GamificationPointsService.mjs'));
    }

    const earnedAt = new Date();
    const awarded = [];

    for (const achievement of eligible) {
      const xpReward = Number.isFinite(Number(achievement.xpReward)) ? Number(achievement.xpReward) : 0;

      // XP FIRST, row second. The ledger call is idempotent by key, so if the
      // row insert then fails, the next log retries BOTH and converges. The
      // reverse order would strand a visible achievement with permanently
      // unpaid XP whenever the ledger call failed — the unique-violation
      // `continue` below would skip payment forever after that.
      if (xpReward > 0) {
        await pointsService.recordLedgerEntry({
          userId,
          points: xpReward,
          transactionType: 'earn',
          source: 'nutrition_log',
          sourceId: achievement.id,
          description: `Achievement Earned: ${achievement.title || achievement.name}`,
          metadata: { achievementId: achievement.id, sourceType: 'nutrition_log' },
          idempotencyKey: `nutrition:${userId}:${achievement.id}`,
          maxPoints: Math.max(xpReward, 500),
        }, transaction ?? null);
      }

      try {
        await UserAchievement.create({
          userId,
          achievementId: achievement.id,
          isCompleted: true,
          progress: 100,
          earnedAt,
          pointsAwarded: xpReward,
        }, options);
      } catch (error) {
        // A concurrent request already awarded it (and its ledger entry deduped
        // by key above). The desired state holds — not an error, not a re-pay.
        if (isUniqueViolation(error)) continue;
        throw error;
      }

      awarded.push({ achievementId: achievement.id, name: achievement.name, xpReward });
    }

    return { awarded, distinctDays, streak };
  } catch (error) {
    // Never throws (failure policy above): the caller fires this un-awaited.
    logger.warn(`[NutritionAchievements] evaluation failed for user ${userId}: ${error?.message}`);
    return { awarded: [], distinctDays: 0, streak: 0, error: error?.message };
  }
}

export default { evaluateNutritionLogAchievements };
