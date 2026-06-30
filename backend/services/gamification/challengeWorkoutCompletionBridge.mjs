/**
 * Bridges accepted workout logs into challenge progress.
 *
 * This keeps challenge progress as a consumer of canonical workout completion
 * events instead of creating another workout logging path.
 */

import { awardWorkoutChallengeCompletionXp } from './challengeCompletionRewardService.mjs';
import { applyWorkoutChallengeProgressEvent } from './challengeProgressEventService.mjs';

const toFiniteNonNegative = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const countExercises = (exercises) => (Array.isArray(exercises) ? exercises.length : 0);
const countPersonalRecords = (...sources) => {
  const value = sources.find((source) => source !== undefined && source !== null);
  if (Array.isArray(value)) return value.length;
  const count = Number(value?.count ?? value?.personalRecordCount ?? value ?? 0);
  return Number.isFinite(count) && count > 0 ? Math.round(count) : 0;
};

const normalizeToken = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '_')
  .replace(/-/g, '_');

const addToken = (tokens, value) => {
  const token = normalizeToken(value);
  if (token) tokens.add(token);
};

const addTokenList = (tokens, values) => {
  if (!Array.isArray(values)) return;
  values.forEach((value) => addToken(tokens, value));
};

const workoutTokensFromExercises = (exercises) => {
  const tokens = new Set();
  if (!Array.isArray(exercises)) return [];

  for (const exercise of exercises) {
    addToken(tokens, exercise?.exerciseFamily);
    addToken(tokens, exercise?.category);
    addToken(tokens, exercise?.movementPattern);
    addToken(tokens, exercise?.nasmMovementPattern);
    addToken(tokens, exercise?.bodyPartCategory);
    addTokenList(tokens, exercise?.tags);
    addTokenList(tokens, exercise?.muscleGroups);
  }

  return [...tokens];
};

const workoutTagsFromSources = ({ dailyForm, workoutSession, exercises }) => {
  const tokens = new Set(workoutTokensFromExercises(exercises));
  addToken(tokens, dailyForm?.category);
  addToken(tokens, dailyForm?.workoutCategory);
  addToken(tokens, workoutSession?.category);
  addToken(tokens, workoutSession?.workoutCategory);
  addTokenList(tokens, dailyForm?.tags);
  addTokenList(tokens, workoutSession?.tags);
  return [...tokens];
};

const isAssignedWorkout = ({ dailyForm, workoutSession }) => Boolean(
  dailyForm?.assignmentId
  || dailyForm?.assignedWorkoutId
  || dailyForm?.workoutPlanId
  || workoutSession?.assignmentId
  || workoutSession?.assignedWorkoutId
  || workoutSession?.workoutPlanId
);

const stableSourceId = ({ dailyForm, workoutSession }) => {
  const workoutSessionId = String(workoutSession?.id ?? '').trim();
  if (workoutSessionId) return `workout-session:${workoutSessionId}`;

  const formId = String(dailyForm?.id ?? '').trim();
  return formId ? `daily-form:${formId}` : null;
};

export const buildDailyWorkoutChallengeProgressEvent = ({
  dailyForm,
  workoutSession,
  workoutDateIso,
  estimatedDuration,
  exercises,
  personalRecords,
} = {}) => {
  const exerciseFamilies = workoutTokensFromExercises(exercises);

  return {
    sourceId: stableSourceId({ dailyForm, workoutSession }),
    workoutId: dailyForm?.id ?? null,
    sessionId: workoutSession?.id ?? null,
    occurredAt: dailyForm?.submittedAt ?? workoutDateIso,
    durationMinutes: toFiniteNonNegative(estimatedDuration),
    exercisesCompleted: countExercises(exercises),
    personalRecordCount: countPersonalRecords(
      personalRecords,
      dailyForm?.personalRecords,
      dailyForm?.formData?.personalRecords,
      dailyForm?.personalRecordCount,
      workoutSession?.personalRecords,
      workoutSession?.personalRecordCount,
    ),
    exerciseFamilies,
    workoutTags: workoutTagsFromSources({ dailyForm, workoutSession, exercises }),
    isAssignedSession: isAssignedWorkout({ dailyForm, workoutSession }),
  };
};

export const applyDailyWorkoutFormChallengeProgress = async ({
  sequelize,
  models,
  userId,
  dailyForm,
  workoutSession,
  workoutDateIso,
  estimatedDuration,
  exercises,
  personalRecords,
} = {}) => {
  const transaction = await sequelize.transaction();

  try {
    const result = await applyWorkoutChallengeProgressEvent({
      models,
      userId,
      event: buildDailyWorkoutChallengeProgressEvent({
        dailyForm,
        workoutSession,
        workoutDateIso,
        estimatedDuration,
        exercises,
      }),
      transaction,
    });
    const completedUpdates = Array.isArray(result?.updated)
      ? result.updated.filter((update) => update?.completed === true)
      : [];
    const xpAwarded = await awardWorkoutChallengeCompletionXp({
      userId,
      completions: completedUpdates,
      transaction,
    });

    await transaction.commit();
    return { ...result, xpAwarded };
  } catch (error) {
    await transaction.rollback().catch(() => {});
    throw error;
  }
};
