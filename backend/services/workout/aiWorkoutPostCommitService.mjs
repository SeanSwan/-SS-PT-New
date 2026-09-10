/** Independent secondary effects after the canonical transaction has committed.
 * Preserve historical/source suppression. A failed award never undoes a workout
 * and never prevents the other effects from running. Fixed codes avoid raw errors.
 */
import logger from '../../utils/logger.mjs';
import { runWorkoutXpAwardStep } from './workoutXpAwardStep.mjs';
import { detectAndRecordPersonalRecords } from './workoutPrDetectionService.mjs';
import { applyAiWorkoutChallengeProgress } from './aiWorkoutChallengeProgressBridge.mjs';
import { accrueFlatSessionEarning } from '../trainerSessionEarningService.mjs';

export async function runAiWorkoutPostCommit({
  sequelize, models, parsedClientId, parsedTrainerId, dailyForm, workoutSession,
  workoutDateIso, workoutDate, estimatedDuration, normalizedExercises, linkedScheduledSession, sourcePolicy,
}) {
  const warnings = [];
  const run = async (code, action, fallback) => {
    try { return await action(); }
    catch {
      warnings.push(code);
      logger.warn('[aiWorkoutDailyForm] Secondary effect unavailable', { code });
      return fallback;
    }
  };
  if (linkedScheduledSession?.trainerId)
    await run('EARNINGS_UNAVAILABLE', () => accrueFlatSessionEarning({ session: linkedScheduledSession }), null);
  const challengeProgress = sourcePolicy.suppressEngagementSideEffects
    ? { status: 'suppressed_historical', updatedCount: 0, skippedCount: 0, headline: null, updates: [] }
    : await run('CHALLENGE_UNAVAILABLE', () => applyAiWorkoutChallengeProgress({
      sequelize, models, userId: parsedClientId, dailyForm, workoutSession,
      workoutDateIso, estimatedDuration, exercises: normalizedExercises,
    }), { status: 'failed', updates: [] });
  const xp = await run('XP_UNAVAILABLE', () => runWorkoutXpAwardStep({
    sequelize, userId: parsedClientId, workoutId: dailyForm.id, sessionId: workoutSession.id,
    duration: estimatedDuration, exercisesCompleted: normalizedExercises.length,
    workoutDate, awardedBy: parsedTrainerId, suppress: sourcePolicy.suppressEngagementSideEffects,
  }), null);
  // Synthetic filler can never set records. Real historical imports retain their
  // workout-date baselines without awarding points, matching the existing writer.
  const pr = sourcePolicy.suppressPersonalRecords ? null : await run('PERSONAL_RECORDS_UNAVAILABLE',
    () => detectAndRecordPersonalRecords({
      userId: parsedClientId, formId: dailyForm.id, sessionId: workoutSession.id,
      exercises: normalizedExercises, date: workoutDateIso,
      awardPoints: !sourcePolicy.suppressEngagementSideEffects, achievedAt: workoutDateIso,
    }), null);
  return { xpAwarded: xp?.pointsAwarded ?? null, streakDays: xp?.streakDays ?? null,
    xp, prEvents: pr?.prEvents || [], challengeProgress, ...(warnings.length ? { warnings } : {}) };
}
