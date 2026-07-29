/**
 * workoutXpAwardStep.mjs
 * ======================
 * Post-commit XP step for the unified workout write lane (Phase 1.1a,
 * Fable Vision arc). Extracted from workoutLogService's proven pattern so
 * the canonical adapter (aiWorkoutDailyFormService) can award XP within the
 * 300-line cap and every write lane feeds streaks/levels identically.
 *
 * Contract:
 * - Runs AFTER the diary/session transaction commits; NEVER fails the write
 *   (own transaction; rolled back and swallowed on error).
 * - `workoutId` is the DailyWorkoutForm id — Path A's idempotency key space —
 *   so form-keyed and session-keyed awards converge on one space.
 * - Social auto-posts happen INSIDE awardWorkoutXP (emitWorkoutXpSideEffects).
 *   This step deliberately does NOT post again — the legacy Path B double
 *   auto-post (workoutLogService.mjs) is not reproduced here.
 * - Fully suppressed when the source policy suppresses engagement side
 *   effects (historical imports).
 */
import logger from '../../utils/logger.mjs';
import { getAllModels } from '../../models/index.mjs';
import { awardWorkoutXP } from '../awardWorkoutXP.mjs';
import { fireWorkoutBadgeChecks } from '../badgeGamificationBridge.mjs';

export async function runWorkoutXpAwardStep({
  sequelize,
  userId,
  workoutId,
  sessionId,
  duration,
  exercisesCompleted,
  workoutDate,
  awardedBy,
  suppress = false,
}) {
  if (suppress) {
    logger.info(`[WorkoutXpStep] Engagement side effects suppressed for workout ${workoutId}`);
    return null;
  }

  let xpTx = null;
  try {
    xpTx = await sequelize.transaction();
    const xpResult = await awardWorkoutXP({
      userId,
      workoutId,
      duration,
      exercisesCompleted,
      workoutDate,
      awardedBy,
    }, xpTx);

    if (xpResult && !xpResult.sameDay && !xpResult.alreadyAwarded && sessionId) {
      const { WorkoutSession } = getAllModels();
      await WorkoutSession.update(
        { experiencePoints: xpResult.pointsAwarded },
        { where: { id: sessionId }, transaction: xpTx },
      );
    }
    await xpTx.commit();

    if (!xpResult || xpResult.sameDay || xpResult.alreadyAwarded) return null;

    // Badge sweep rides POST-commit on the persisted stats (never throws,
    // never re-awards: fireWorkoutBadgeChecks guards + DB unique constraint).
    const badgesEarned = await fireWorkoutBadgeChecks({
      userId,
      xpResult,
      exerciseCount: exercisesCompleted ?? 0,
    });

    return {
      pointsAwarded: xpResult.pointsAwarded,
      newBalance: xpResult.newBalance,
      streakDays: xpResult.streakDays,
      milestones: (xpResult.awardedMilestones || []).map((m) => m.name),
      badgesEarned: badgesEarned.map((b) => b?.name).filter(Boolean),
    };
  } catch (xpErr) {
    try { await xpTx?.rollback(); } catch (_) { /* already rolled back */ }
    logger.warn(`[WorkoutXpStep] XP award failed for workout ${workoutId}: ${xpErr.message}`);
    return null;
  }
}

export default runWorkoutXpAwardStep;
