/**
 * Challenge completion reward service.
 * Shared idempotent XP ledger path for challenge completions caused by workouts.
 */

import GamificationPointsService from './GamificationPointsService.mjs';

const toNonNegativeNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
};

const challengeIdFor = (completion) => String(completion?.challengeId ?? '').trim();

export const getChallengeCompletionTitle = (completion) =>
  completion?.title || challengeIdFor(completion) || 'Challenge';

export const getChallengeCompletionReward = (completion) =>
  toNonNegativeNumber(completion?.xpReward) + toNonNegativeNumber(completion?.bonusXpReward);

export const awardWorkoutChallengeCompletionXp = async ({
  userId,
  completions = [],
  transaction,
} = {}) => {
  let xpAwarded = 0;
  const completionList = Array.isArray(completions) ? completions : [];

  for (const completion of completionList) {
    const challengeId = challengeIdFor(completion);
    const totalXpReward = getChallengeCompletionReward(completion);
    if (!challengeId || totalXpReward <= 0) continue;

    await GamificationPointsService.recordLedgerEntry({
      userId,
      points: totalXpReward,
      transactionType: 'earn',
      source: 'challenge_completion',
      sourceId: challengeId,
      description: `Challenge Completed: ${getChallengeCompletionTitle(completion)}`,
      metadata: {
        challengeId,
        sourceType: 'workout_completed',
      },
      idempotencyKey: `challenge:${userId}:${challengeId}`,
      maxPoints: Math.max(totalXpReward, 500),
    }, transaction);

    xpAwarded += totalXpReward;
  }

  return xpAwarded;
};
