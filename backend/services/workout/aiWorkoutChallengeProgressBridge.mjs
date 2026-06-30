/**
 * Nonfatal bridge from Swan Coach workout writes into challenge progress.
 */
import { applyDailyWorkoutFormChallengeProgress } from '../gamification/challengeWorkoutCompletionBridge.mjs';
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
