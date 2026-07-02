/**
 * Nonfatal bridge from Swan Coach workout writes into challenge progress.
 */
import { buildChallengeProgressImpactReceipt } from '../gamification/challengeProgressImpactReceipt.mjs';

export const applyAiWorkoutChallengeProgress = async ({
  sequelize,
  models,
  userId,
  dailyForm,
  workoutSession,
  workoutDateIso,
  estimatedDuration,
  exercises,
} = {}) => {
  try {
    const { applyDailyWorkoutFormChallengeProgress } = await import('../gamification/challengeWorkoutCompletionBridge.mjs');
    const result = await applyDailyWorkoutFormChallengeProgress({
      sequelize,
      models: {
        Challenge: models?.Challenge,
        ChallengeParticipant: models?.ChallengeParticipant,
      },
      userId,
      dailyForm,
      workoutSession,
      workoutDateIso,
      estimatedDuration,
      exercises,
    });
    return buildChallengeProgressImpactReceipt(result);
  } catch (_) {
    return buildChallengeProgressImpactReceipt(null, 'failed');
  }
};
