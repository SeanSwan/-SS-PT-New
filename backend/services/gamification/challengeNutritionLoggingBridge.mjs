/**
 * ============================================================================
 * FILE: challengeNutritionLoggingBridge.mjs
 * PURPOSE: Bridge accepted macro-log writes into category:'nutrition' challenge progress.
 * ADDED: 2026-08-04 (nutrition blueprint Phase 3, S3.2)
 * ============================================================================
 *
 * Cloned from challengeWorkoutCompletionBridge + challengeProgressEventService,
 * narrowed to nutrition: a logging day counts ONCE per
 * (challengeId, userId, localDate) no matter how many meals land or how many
 * times a write is retried — the event sourceId encodes the user-local date and
 * BOTH progressHistory and dailyProgress are checked before counting, so a
 * retried macro write cannot double-count a day.
 *
 * This keeps challenge progress a CONSUMER of the canonical macro write path
 * (macroLogService) instead of a second logging path. Completion XP reuses the
 * shared idempotent ledger path (challengeCompletionRewardService, keyed
 * `challenge:{userId}:{challengeId}`) so a replay can never double-pay.
 *
 * FAILURE POLICY: the caller MUST treat this as best-effort — logging food is
 * the user's real intent; a gamification miss must never fail that write.
 * Internally transactional: progress + completion XP commit together or not at all.
 */

import { Op } from 'sequelize';
import { awardWorkoutChallengeCompletionXp } from './challengeCompletionRewardService.mjs';

const NUTRITION_EVENT_TYPE = 'nutrition_logged';
const ACTIVE_PARTICIPANT_STATUSES = ['joined', 'active'];
const LOCAL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const toFiniteNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const round2 = (value) => Math.round(value * 100) / 100;

const getJsonArray = (value) => (Array.isArray(value) ? [...value] : []);

const getJsonObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};

/** Has this participant already been credited for this user-local day? */
const dayAlreadyCounted = ({ progressHistory, dailyProgress, sourceId, localDate }) =>
  progressHistory.some((entry) =>
    String(entry?.sourceId ?? '') === sourceId &&
    (entry?.sourceType === NUTRITION_EVENT_TYPE || entry?.source === NUTRITION_EVENT_TYPE)
  ) || toFiniteNumber(dailyProgress[localDate]) > 0;

const updateCompletionRate = async ({ ChallengeParticipant, challenge, transaction }) => {
  if (typeof ChallengeParticipant.count !== 'function' || typeof challenge?.update !== 'function') return;

  const completedCount = await ChallengeParticipant.count({
    where: { challengeId: challenge.id, status: 'completed' },
    transaction,
  });
  const currentParticipants = Math.max(0, toFiniteNumber(challenge.currentParticipants));
  const completionRate = currentParticipants > 0
    ? round2((completedCount / currentParticipants) * 100)
    : 0;

  await challenge.update({ completionRate }, { transaction });
};

/**
 * Apply one nutrition-logging day to every active nutrition challenge the user
 * has joined. Own transaction; commits progress + completion XP atomically.
 *
 * @param {object}  params
 * @param {number}  params.userId
 * @param {string}  params.localDate  - user-local YYYY-MM-DD of the logged entry
 *                                      (derived from user timezone if absent)
 * @param {object} [params.models]    - { Challenge, ChallengeParticipant }; defaults to getAllModels()
 * @param {object} [params.sequelize] - defaults to the Challenge model's connection
 * @param {Date}   [params.now]
 */
export const applyNutritionLogChallengeProgress = async ({
  userId,
  localDate,
  models,
  sequelize,
  now = new Date(),
} = {}) => {
  if (!userId) throw new Error('Valid user ID is required');

  if (!models) {
    const { getAllModels } = await import('../../models/index.mjs');
    models = getAllModels();
  }
  const { Challenge, ChallengeParticipant } = models;
  if (!Challenge || !ChallengeParticipant) throw new Error('Challenge models are unavailable');

  if (!LOCAL_DATE_REGEX.test(String(localDate ?? ''))) {
    const { getUserLocalToday } = await import('../nutrition/nutritionAdherenceService.mjs');
    ({ todayLocal: localDate } = await getUserLocalToday(userId));
  }
  if (!sequelize) sequelize = Challenge.sequelize;

  const sourceId = `nutrition-day:${localDate}`;
  const transaction = await sequelize.transaction();

  try {
    const lockOption = transaction?.LOCK?.UPDATE ? { lock: transaction.LOCK.UPDATE } : {};
    const participants = await ChallengeParticipant.findAll({
      where: { userId, status: { [Op.in]: ACTIVE_PARTICIPANT_STATUSES } },
      include: [{
        model: Challenge,
        as: 'challenge',
        required: true,
        where: {
          status: 'active',
          autoComplete: true,
          category: 'nutrition',
          startDate: { [Op.lte]: now },
          endDate: { [Op.gte]: now },
        },
      }],
      transaction,
      ...lockOption,
    });

    const updated = [];
    const skipped = [];

    for (const participant of participants) {
      const challenge = participant?.challenge ?? participant?.challengeDetails ?? null;
      const baseResult = {
        participantId: participant.id,
        challengeId: challenge?.id ?? participant.challengeId,
      };
      if (!challenge) {
        skipped.push({ ...baseResult, reason: 'missing_challenge' });
        continue;
      }

      const progressHistory = getJsonArray(participant.progressHistory);
      const dailyProgress = getJsonObject(participant.dailyProgress);
      if (dayAlreadyCounted({ progressHistory, dailyProgress, sourceId, localDate })) {
        skipped.push({ ...baseResult, reason: 'day_already_counted' });
        continue;
      }

      const previousProgress = Math.max(0, toFiniteNumber(participant.currentProgress));
      const maxProgress = Math.max(1, toFiniteNumber(challenge.maxProgress, 1));
      const currentProgress = round2(Math.min(maxProgress, previousProgress + 1));
      const progressPercentage = round2(Math.min(100, Math.max(0, (currentProgress / maxProgress) * 100)));
      const wasCompleted = participant.status !== 'completed' && progressPercentage >= 100;

      dailyProgress[localDate] = 1;
      progressHistory.push({
        source: NUTRITION_EVENT_TYPE,
        sourceType: NUTRITION_EVENT_TYPE,
        sourceId,
        occurredAt: now.toISOString(),
        localDate,
        delta: 1,
        previousProgress: round2(previousProgress),
        currentProgress,
      });

      await participant.update({
        currentProgress,
        progressPercentage,
        status: wasCompleted ? 'completed' : 'active',
        startedAt: participant.startedAt ?? now,
        completedAt: wasCompleted ? now : participant.completedAt ?? null,
        lastProgressUpdate: now,
        checkInsCount: Math.max(0, toFiniteNumber(participant.checkInsCount)) + 1,
        progressHistory,
        dailyProgress,
        updatedAt: now,
      }, { transaction });

      if (wasCompleted) {
        await updateCompletionRate({ ChallengeParticipant, challenge, transaction });
      }

      updated.push({
        ...baseResult,
        title: challenge.title ?? challenge.name ?? null,
        delta: 1,
        currentProgress,
        progressPercentage,
        completed: wasCompleted,
        xpReward: Math.max(0, toFiniteNumber(challenge.xpReward)),
        bonusXpReward: Math.max(0, toFiniteNumber(challenge.bonusXpReward)),
      });
    }

    const completions = updated.filter((update) => update.completed === true);
    const xpAwarded = await awardWorkoutChallengeCompletionXp({ userId, completions, transaction });

    await transaction.commit();
    return {
      event: { type: NUTRITION_EVENT_TYPE, userId, sourceId, localDate },
      updated,
      skipped,
      updatedCount: updated.length,
      skippedCount: skipped.length,
      xpAwarded,
    };
  } catch (error) {
    await transaction.rollback().catch(() => {});
    throw error;
  }
};

export default { applyNutritionLogChallengeProgress };
