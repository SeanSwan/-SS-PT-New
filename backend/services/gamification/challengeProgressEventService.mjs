/**
 * Challenge progress event service.
 * Applies canonical workout-completed events to active challenge participants.
 */

import { Op } from 'sequelize';
import { challengeRequiresAssignedSessionEvidence, evaluateWorkoutChallengeProgressRule, normalizeChallengeRuleTokens } from './challengeProgressRuleService.mjs';

const WORKOUT_EVENT_TYPE = 'workout_completed';
const AUTO_PROGRESS_UNITS = new Set(['sessions', 'workouts', 'minutes', 'days']);
const ACTIVE_PARTICIPANT_STATUSES = ['joined', 'active'];

export class ChallengeProgressEventValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ChallengeProgressEventValidationError';
    this.statusCode = statusCode;
    this.publicMessage = message;
  }
}

const parsePositiveInteger = (value) => {
  const stringValue = String(value ?? '').trim();
  if (!/^[1-9]\d*$/.test(stringValue)) return null;
  return Number(stringValue);
};

const toFiniteNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const round2 = (value) => Math.round(value * 100) / 100;

const getSourceId = (event = {}) => {
  const value = event.sourceId ?? event.workoutId ?? event.sessionId;
  const stringValue = String(value ?? '').trim();
  return stringValue.length > 0 ? stringValue : null;
};

const parseOccurredAt = (value, now) => {
  if (value === undefined || value === null || value === '') return now;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ChallengeProgressEventValidationError('Workout event timestamp is invalid');
  }

  return parsed;
};

export const normalizeWorkoutChallengeProgressEvent = ({ userId, event = {}, now = new Date() } = {}) => {
  const normalizedUserId = parsePositiveInteger(userId);
  if (!normalizedUserId) {
    throw new ChallengeProgressEventValidationError('Valid user ID is required');
  }

  const sourceId = getSourceId(event);
  if (!sourceId) {
    throw new ChallengeProgressEventValidationError('Workout event source ID is required');
  }

  return {
    userId: normalizedUserId,
    sourceId,
    occurredAt: parseOccurredAt(event.occurredAt, now),
    durationMinutes: Math.max(0, toFiniteNumber(event.durationMinutes ?? event.sessionDurationMinutes)),
    exercisesCompleted: Math.max(0, toFiniteNumber(event.exercisesCompleted)),
    personalRecordCount: Math.round(Math.max(0, toFiniteNumber(event.personalRecordCount ?? event.prCount ?? (Array.isArray(event.personalRecords) ? event.personalRecords.length : 0)))),
    exerciseFamilies: normalizeChallengeRuleTokens(event.exerciseFamilies, event.exerciseFamily),
    workoutTags: normalizeChallengeRuleTokens(event.workoutTags, event.tags, event.category, event.workoutCategory),
    isAssignedSession: Boolean(event.isAssignedSession || event.assignedSession || event.assignmentId || event.assignedWorkoutId),
  };
};

const getChallengeFromParticipant = (participant) =>
  participant?.challenge ?? participant?.challengeDetails ?? null;

const getJsonArray = (value) => (Array.isArray(value) ? [...value] : []);

const getJsonObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};

const hasProcessedEvent = (progressHistory, sourceId) =>
  progressHistory.some((entry) =>
    String(entry?.sourceId ?? '') === sourceId &&
    (entry?.sourceType === WORKOUT_EVENT_TYPE || entry?.source === WORKOUT_EVENT_TYPE)
  );

const getProgressDelta = ({ challenge, participant, event, dateKey }) => {
  const progressUnit = String(challenge?.progressUnit ?? '').toLowerCase();
  if (!AUTO_PROGRESS_UNITS.has(progressUnit)) {
    return { delta: 0, reason: 'unsupported_progress_unit' };
  }

  if (progressUnit === 'minutes') {
    return event.durationMinutes > 0
      ? { delta: event.durationMinutes, reason: null }
      : { delta: 0, reason: 'missing_duration' };
  }

  if (progressUnit === 'days') {
    const dailyProgress = getJsonObject(participant?.dailyProgress);
    return toFiniteNumber(dailyProgress[dateKey]) > 0
      ? { delta: 0, reason: 'day_already_counted' }
      : { delta: 1, reason: null };
  }

  return { delta: 1, reason: null };
};

const buildUpdateFields = ({ participant, challenge, event, delta, dateKey }) => {
  const previousProgress = Math.max(0, toFiniteNumber(participant.currentProgress));
  const maxProgress = Math.max(1, toFiniteNumber(challenge.maxProgress, 1));
  const currentProgress = round2(Math.min(maxProgress, previousProgress + delta));
  const progressPercentage = round2(Math.min(100, Math.max(0, (currentProgress / maxProgress) * 100)));
  const progressHistory = getJsonArray(participant.progressHistory);
  const dailyProgress = getJsonObject(participant.dailyProgress);
  const previousDaily = toFiniteNumber(dailyProgress[dateKey]);
  const nextDaily = round2(previousDaily + delta);
  const wasCompleted = participant.status !== 'completed' && progressPercentage >= 100;
  const progressUnit = String(challenge.progressUnit ?? '').toLowerCase();

  dailyProgress[dateKey] = nextDaily;
  progressHistory.push({
    source: WORKOUT_EVENT_TYPE,
    sourceType: WORKOUT_EVENT_TYPE,
    sourceId: event.sourceId,
    occurredAt: event.occurredAt.toISOString(),
    progressUnit,
    delta: round2(delta),
    durationMinutes: round2(event.durationMinutes), exercisesCompleted: round2(event.exercisesCompleted),
    personalRecordCount: event.personalRecordCount, assignedSession: event.isAssignedSession === true,
    previousProgress: round2(previousProgress),
    currentProgress,
  });

  const dailyValues = Object.values(dailyProgress)
    .map((value) => Math.max(0, toFiniteNumber(value)))
    .filter((value) => value > 0);

  return {
    fields: {
      currentProgress,
      progressPercentage,
      status: wasCompleted ? 'completed' : 'active',
      startedAt: participant.startedAt ?? event.occurredAt,
      completedAt: wasCompleted ? event.occurredAt : participant.completedAt ?? null,
      lastProgressUpdate: event.occurredAt,
      checkInsCount: Math.max(0, toFiniteNumber(participant.checkInsCount)) + 1,
      progressHistory,
      dailyProgress,
      averageDailyProgress: dailyValues.length > 0
        ? round2(dailyValues.reduce((sum, value) => sum + value, 0) / dailyValues.length)
        : 0,
      bestSingleDayProgress: round2(Math.max(toFiniteNumber(participant.bestSingleDayProgress), nextDaily)),
      updatedAt: event.occurredAt,
    },
    wasCompleted,
    progressUnit,
  };
};

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

export const applyWorkoutChallengeProgressEvent = async ({
  models,
  userId,
  event,
  transaction,
  now = new Date(),
} = {}) => {
  const { Challenge, ChallengeParticipant } = models ?? {};
  if (!Challenge || !ChallengeParticipant) {
    throw new ChallengeProgressEventValidationError('Challenge models are unavailable', 500);
  }

  const normalizedEvent = normalizeWorkoutChallengeProgressEvent({ userId, event, now });
  const lockOption = transaction?.LOCK?.UPDATE
    ? { lock: transaction.LOCK.UPDATE }
    : {};

  const participants = await ChallengeParticipant.findAll({
    where: {
      userId: normalizedEvent.userId,
      status: { [Op.in]: ACTIVE_PARTICIPANT_STATUSES },
    },
    include: [{
      model: Challenge,
      as: 'challenge',
      required: true,
      where: {
        status: 'active',
        autoComplete: true,
        startDate: { [Op.lte]: normalizedEvent.occurredAt },
        endDate: { [Op.gte]: normalizedEvent.occurredAt },
      },
    }],
    transaction,
    ...lockOption,
  });

  const dateKey = normalizedEvent.occurredAt.toISOString().slice(0, 10);
  const updated = [];
  const skipped = [];

  for (const participant of participants) {
    const challenge = getChallengeFromParticipant(participant);
    const progressHistory = getJsonArray(participant.progressHistory);
    const baseResult = {
      participantId: participant.id,
      challengeId: challenge?.id ?? participant.challengeId,
    };

    if (!challenge) {
      skipped.push({ ...baseResult, reason: 'missing_challenge' });
      continue;
    }

    if (hasProcessedEvent(progressHistory, normalizedEvent.sourceId)) {
      skipped.push({ ...baseResult, reason: 'duplicate_event' });
      continue;
    }

    const ruleResult = evaluateWorkoutChallengeProgressRule({
      challenge,
      event: normalizedEvent,
    });

    if (!ruleResult.eligible) {
      skipped.push({ ...baseResult, reason: ruleResult.reason });
      continue;
    }

    const { delta, reason } = getProgressDelta({
      challenge,
      participant,
      event: normalizedEvent,
      dateKey,
    });

    if (delta <= 0) {
      skipped.push({ ...baseResult, reason });
      continue;
    }

    const { fields, wasCompleted, progressUnit } = buildUpdateFields({
      participant,
      challenge,
      event: normalizedEvent,
      delta,
      dateKey,
    });

    await participant.update(fields, { transaction });
    if (wasCompleted) {
      await updateCompletionRate({ ChallengeParticipant, challenge, transaction });
    }

    updated.push({
      ...baseResult,
      title: challenge.title ?? challenge.name ?? null,
      progressUnit,
      delta: round2(delta),
      currentProgress: fields.currentProgress,
      progressPercentage: fields.progressPercentage,
      completed: wasCompleted,
      xpReward: Math.max(0, toFiniteNumber(challenge.xpReward)),
      bonusXpReward: Math.max(0, toFiniteNumber(challenge.bonusXpReward)),
      assignedSessionOnly: challengeRequiresAssignedSessionEvidence(challenge),
      assignedSession: normalizedEvent.isAssignedSession === true,
    });
  }

  return {
    event: {
      type: WORKOUT_EVENT_TYPE,
      userId: normalizedEvent.userId,
      sourceId: normalizedEvent.sourceId,
      occurredAt: normalizedEvent.occurredAt.toISOString(),
    },
    updated,
    skipped,
    updatedCount: updated.length,
    skippedCount: skipped.length,
  };
};
