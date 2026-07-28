import { challengeRequiresAssignedSessionEvidence } from './challengeProgressRuleService.mjs';

/**
 * Challenge dashboard read model.
 *
 * Builds client-safe challenge progress summaries from existing
 * ChallengeParticipant rows. This intentionally reads current persisted
 * progress data; it does not invent demo challenge cards.
 */

const WORKOUT_EVENT_TYPE = 'workout_completed';

const toPlainObject = (value) => {
  if (!value) return {};
  if (typeof value.toJSON === 'function') return value.toJSON();
  if (typeof value.get === 'function') return value.get({ plain: true });
  return value && typeof value === 'object' ? { ...value } : {};
};

const toFiniteNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const nonNegative = (value, fallback = 0) => Math.max(0, toFiniteNumber(value, fallback));

const clampPercent = (value) => Math.min(100, Math.max(0, Math.round(value)));

const getJsonArray = (value) => (Array.isArray(value) ? [...value] : []);

const getChallengeRecord = (participation) =>
  toPlainObject(participation.challenge || participation.Challenge || participation.challengeDetails);

const isWorkoutProgressEvent = (entry) =>
  String(entry?.sourceType || entry?.source || '').trim() === WORKOUT_EVENT_TYPE;

const parseTime = (value) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const activeMinutesForEntry = (entry) => {
  const explicit = entry?.durationMinutes ?? entry?.sessionDurationMinutes ?? entry?.activeMinutes;
  if (explicit !== undefined && explicit !== null && explicit !== '') return nonNegative(explicit);
  return String(entry?.progressUnit || '').toLowerCase() === 'minutes' ? nonNegative(entry?.delta) : 0;
};
const exercisesCompletedForEntry = (entry) => nonNegative(entry?.exercisesCompleted);
const personalRecordCountForEntry = (entry) => {
  const listCount = Array.isArray(entry?.personalRecords) ? entry.personalRecords.length : null;
  return Math.round(nonNegative(entry?.personalRecordCount ?? entry?.prCount ?? listCount));
};

const normalizeImpact = (entry) => ({
  sourceId: String(entry?.sourceId ?? '').trim() || null,
  occurredAt: new Date(entry.occurredAt).toISOString(),
  progressUnit: String(entry?.progressUnit ?? '').trim() || null,
  delta: nonNegative(entry?.delta),
  activeMinutes: activeMinutesForEntry(entry),
  exercisesCompleted: exercisesCompletedForEntry(entry),
  personalRecordCount: personalRecordCountForEntry(entry),
  assignedSession: entry?.assignedSession === true || entry?.isAssignedSession === true,
  previousProgress: nonNegative(entry?.previousProgress),
  currentProgress: nonNegative(entry?.currentProgress),
});

export const getLatestWorkoutImpact = (progressHistory) => {
  const workoutEvents = getJsonArray(progressHistory)
    .filter(isWorkoutProgressEvent)
    .map((entry) => ({ entry, time: parseTime(entry?.occurredAt) }))
    .filter(({ time }) => time !== null)
    .sort((a, b) => b.time - a.time);

  return workoutEvents.length > 0 ? normalizeImpact(workoutEvents[0].entry) : null;
};

const unitLabel = (unit, amount) => {
  const normalized = String(unit || '').toLowerCase();
  if (normalized === 'sessions') return amount === 1 ? 'session' : 'sessions';
  if (normalized === 'workouts') return amount === 1 ? 'workout' : 'workouts';
  if (normalized === 'minutes') return amount === 1 ? 'minute' : 'minutes';
  if (normalized === 'days') return amount === 1 ? 'day' : 'days';
  if (normalized === 'points') return amount === 1 ? 'point' : 'points';
  return amount === 1 ? 'completion' : 'completions';
};

const formatNumber = (value) => Number.isInteger(value) ? String(value) : value.toFixed(1);

const getProgressPercentage = ({ explicitPercentage, currentProgress, maxProgress }) => {
  const explicit = Number(explicitPercentage);
  if (Number.isFinite(explicit) && explicit >= 0 && explicit <= 100) {
    return clampPercent(explicit);
  }

  return clampPercent(maxProgress > 0 ? (currentProgress / maxProgress) * 100 : 0);
};

const deriveStatus = ({ participantStatus, challengeStatus, endDate, now }) => {
  if (participantStatus === 'completed') return 'completed';
  if (participantStatus === 'cancelled' || challengeStatus === 'cancelled') return 'cancelled';
  if (challengeStatus === 'completed' || challengeStatus === 'archived') return 'completed';

  const endTime = parseTime(endDate);
  if (endTime !== null && endTime < now.getTime()) return 'completed';

  return 'active';
};

const computeDaysLeft = ({ endDate, now }) => {
  const endTime = parseTime(endDate);
  if (endTime === null) return null;

  return Math.max(0, Math.ceil((endTime - now.getTime()) / (1000 * 60 * 60 * 24)));
};

const getNextAction = ({ status, progressUnit, challenge }) => {
  if (status === 'completed') return 'Challenge complete';
  if (progressUnit === 'minutes') return 'Log more workout minutes';
  if (progressUnit === 'days') return 'Complete another challenge day';
  if (progressUnit === 'sessions' || progressUnit === 'workouts') {
    return challengeRequiresAssignedSessionEvidence(challenge)
      ? 'Complete your next assigned workout'
      : 'Complete your next workout';
  }
  return 'Complete the next challenge action';
};

export const buildChallengeDashboardSummary = (participation, { now = new Date() } = {}) => {
  const challenge = getChallengeRecord(participation);
  const challengeId = String(participation.challengeId ?? challenge.id ?? '').trim() || null;
  const title = String(challenge.title || challenge.name || 'Challenge').trim();
  const progressUnit = String(challenge.progressUnit || 'completion').trim().toLowerCase() || 'completion';
  const maxProgress = Math.max(1, nonNegative(challenge.maxProgress, 1));
  const currentProgress = nonNegative(participation.currentProgress);
  const progressPercentage = getProgressPercentage({
    explicitPercentage: participation.progressPercentage ?? participation.progress,
    currentProgress,
    maxProgress,
  });
  const status = deriveStatus({
    participantStatus: participation.status,
    challengeStatus: challenge.status,
    endDate: challenge.endDate,
    now,
  });
  const daysLeft = computeDaysLeft({ endDate: challenge.endDate, now });
  const unit = unitLabel(progressUnit, maxProgress);

  return {
    challengeId,
    title,
    status,
    currentProgress,
    maxProgress,
    progressPercentage,
    progressUnit,
    progressLabel: `${formatNumber(currentProgress)} of ${formatNumber(maxProgress)} ${unit}`,
    nextAction: getNextAction({ status, progressUnit, challenge }),
    daysLeft,
    checkInsCount: Math.round(nonNegative(participation.checkInsCount)),
    lastWorkoutImpact: getLatestWorkoutImpact(participation.progressHistory),
  };
};

export const toChallengeDashboardParticipation = (row, options = {}) => {
  const participation = toPlainObject(row);
  return {
    ...participation,
    dashboardSummary: buildChallengeDashboardSummary(participation, options),
  };
};

export default toChallengeDashboardParticipation;
