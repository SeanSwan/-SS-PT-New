/**
 * ============================================================================
 * FILE: workoutAchievementEvaluator.mjs
 * PURPOSE: Actually award achievements when a workout is logged.
 * ADDED: 2026-08-04 (SWA-87 follow-up — 1,067 defined, 0 ever awarded)
 * ============================================================================
 *
 * THE PROBLEM THIS SOLVES: production had 1,067 active achievements and **zero** `UserAchievements`
 * rows. Not one had ever been earned. Two independent causes, both now understood:
 *
 *   1. `workoutService.checkAchievements` existed and was correct, but is reachable ONLY from
 *      `updateWorkoutSession` when a session TRANSITIONS to completed. The canonical logger
 *      (`POST /api/workout-forms`) creates sessions already `completed`, so that transition never
 *      happens — all 53 production sessions are `completed` and none went through it.
 *   2. The live award path the logger DOES call — `awardWorkoutXP` — grants XP and streak points
 *      only. It contains no achievement logic at all.
 *
 * So the feature was not broken so much as never connected. This module is the connection.
 *
 * SCOPE — DELIBERATELY NARROW, and the boundary is the honest part:
 * only `progressUnit = 'workouts'` achievements are evaluated here, because "complete N workouts"
 * is the one criterion a completed-workout event can settle unambiguously from data we already
 * have. The catalog also carries `completion` (475), `days` (300), `custom` (95), `sessions` (46)
 * and `exercises` (30). Those are NOT evaluated:
 *   - `completion` is too generic — it covers `first_login` and `complete_profile`, which a workout
 *     must not grant. Awarding them here would be a data-integrity bug dressed up as a feature.
 *   - `days` needs a streak/calendar evaluator; `sessions` means booked training sessions, a
 *     different entity; `custom` has no machine-readable rule at all.
 * Each needs its own evaluator driven by its own event. Adding them here would mean guessing.
 *
 * SAFETY: additive only — it INSERTs `UserAchievements` rows and never updates or deletes one.
 * Idempotent by construction (skips what the user already has) and again at the DB level (the
 * unique `(userId, achievementId)` index makes a concurrent double-award impossible. A violation
 * propagates to the caller's savepoint so the optional award batch rolls back without poisoning
 * the already-earned workout XP.
 *
 * FAILURE POLICY: the caller MUST treat this as best-effort. Logging a workout is the user's real
 * intent; a gamification miss must never fail that write.
 */

import { Op } from 'sequelize';

/** The one criterion a completed-workout event can settle on its own. */
const SUPPORTED_PROGRESS_UNIT = 'workouts';

/**
 * Categories excluded even within the `workouts` unit, because their names encode a condition the
 * DATA does not: `streak` means a cadence (`weekly_3x_4wk` is not "12 workouts", it is 3/week for
 * 4 weeks) and `special` means a context (`outdoor_workout_1` is not "1 workout"). Awarding those
 * on a raw count would hand out achievements the user did not actually earn — a data-integrity bug
 * wearing a feature's clothes. They need evaluators fed by data we do not currently capture.
 */
const EXCLUDED_CATEGORIES = ['streak', 'special'];

/**
 * Award every `workouts`-unit achievement the user has now qualified for.
 *
 * @param {object}  params
 * @param {number}  params.userId
 * @param {object}  models           - { UserAchievement, Achievement, WorkoutSession }
 * @param {object} [transaction]     - passed through so awards join the caller's transaction
 * @returns {Promise<{awarded: Array<{achievementId: number, name: string, xpReward: number}>,
 *                    completedWorkouts: number, pointsAwarded?: number,
 *                    newBalance?: number, newLevel?: number, newTier?: string}>}
 */
export async function evaluateWorkoutAchievements({ userId, models, transaction, awardPoints } = {}) {
  const { UserAchievement, Achievement, WorkoutSession } = models || {};
  if (!userId || !UserAchievement?.findAll || !Achievement?.findAll || !WorkoutSession?.count) {
    return { awarded: [], completedWorkouts: 0 };
  }

  const options = transaction ? { transaction } : {};

  // The user's qualifying total. Counted from the sessions table rather than incremented on a
  // counter column, so a backfill or a correction cannot drift the two apart.
  const completedWorkouts = await WorkoutSession.count({
    where: { userId, status: 'completed' },
    ...options,
  });
  if (completedWorkouts < 1) return { awarded: [], completedWorkouts };

  // Already-earned ids, so the catalog query can exclude them in SQL rather than in JS.
  const owned = await UserAchievement.findAll({
    where: { userId },
    attributes: ['achievementId'],
    ...options,
  });
  const ownedIds = owned.map((row) => row.achievementId).filter((id) => id !== null && id !== undefined);

  // Only unearned, active, workouts-unit achievements at or below the user's total. This is the
  // whole selection — no post-filtering in JS, so the 1,067-row catalog never lands in memory.
  const candidates = await Achievement.findAll({
    where: {
      progressUnit: SUPPORTED_PROGRESS_UNIT,
      isActive: { [Op.ne]: false },
      maxProgress: { [Op.lte]: completedWorkouts },
      category: { [Op.notIn]: EXCLUDED_CATEGORIES },
      ...(ownedIds.length ? { id: { [Op.notIn]: ownedIds } } : {}),
    },
    attributes: ['id', 'name', 'xpReward', 'maxProgress', 'requirements'],
    ...options,
  });

  // A non-empty `requirements` array is an explicit, unmet extra condition — `weekend_warrior`
  // carries `[{ type: 'day_of_week', days: [0,6] }]`, which a plain workout count cannot satisfy.
  // Evaluating those rules is a separate slice; until then, refusing to award is the honest answer.
  const eligible = candidates.filter((achievement) => {
    const requirements = achievement.requirements;
    return !Array.isArray(requirements) || requirements.length === 0;
  });
  if (!eligible.length) return { awarded: [], completedWorkouts };

  const earnedAt = new Date();
  const awarded = [];
  let pointsAwarded = 0;
  let latestLedger = {};

  for (const achievement of eligible) {
    const xpReward = Number.isFinite(Number(achievement.xpReward)) ? Number(achievement.xpReward) : 0;
    await UserAchievement.create({
      userId,
      achievementId: achievement.id,
      isCompleted: true,
      progress: 100,
      earnedAt,
      pointsAwarded: xpReward,
    }, options);

    if (xpReward > 0 && typeof awardPoints === 'function') {
      latestLedger = await awardPoints({
        achievementId: achievement.id,
        name: achievement.name,
        xpReward,
      });
      pointsAwarded += Number(latestLedger?.pointsAwarded) || 0;
    }

    awarded.push({
      achievementId: achievement.id,
      name: achievement.name,
      xpReward,
    });
  }

  return {
    awarded,
    completedWorkouts,
    pointsAwarded,
    newBalance: latestLedger?.newBalance,
    newLevel: latestLedger?.newLevel,
    newTier: latestLedger?.newTier,
  };
}

export default { evaluateWorkoutAchievements };
