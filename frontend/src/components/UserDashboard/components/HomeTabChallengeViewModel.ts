/**
 * FILE: HomeTabChallengeViewModel.ts
 * PURPOSE: Pure mapper for the user Home active challenge card.
 */

type UnknownRecord = Record<string, unknown>;

export interface HomeChallengeSummary {
  id: string;
  title: string;
  progress: number;
  daysLeft: number;
  participants: number;
  reward: string;
  joined: boolean;
  progressLabel?: string;
  checkInsCount?: number;
  nextAction?: string;
  impactLabel?: string;
}

const NO_DEADLINE_SORT_VALUE = Number.MAX_SAFE_INTEGER;

const asRecord = (value: unknown): UnknownRecord => (
  value && typeof value === 'object' ? value as UnknownRecord : {}
);

const readString = (record: UnknownRecord, keys: string[]): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};

const readOptionalNumber = (record: UnknownRecord, keys: string[]): number | null => {
  for (const key of keys) {
    const raw = record[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return null;
};

const clampPercentValue = (value: number): number => Math.min(Math.max(Math.round(value), 0), 100);
const formatChallengeMetric = (value: number): string => Number.isInteger(value) ? String(value) : value.toFixed(1);
const positiveMetric = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const ASSIGNED_SESSION_UNITS = new Set([
  'assigned_session',
  'assigned_sessions',
  'assigned_sessions_completed',
  'team_assigned_sessions_completed',
]);

const ASSIGNED_SESSION_TAGS = new Set([
  'assigned_session',
  'assigned_sessions',
  'planned_assignment',
  'planned_session',
  'assigned_workout',
]);

const normalizeRuleToken = (value?: string) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[\s-]+/g, '_');

const readStringArray = (record: UnknownRecord, keys: string[]): string[] => {
  for (const key of keys) {
    const value = record[key];
    const values = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',')
        : [];
    const strings = values
      .map((entry) => String(entry ?? '').trim())
      .filter(Boolean);
    if (strings.length > 0) return strings;
  }
  return [];
};

const isAssignedSessionChallenge = (challenge: UnknownRecord, dashboardSummary: UnknownRecord): boolean => {
  const unit = normalizeRuleToken(
    readString(dashboardSummary, ['progressUnit']) || readString(challenge, ['progressUnit'])
  );
  if (ASSIGNED_SESSION_UNITS.has(unit)) return true;

  return readStringArray(challenge, ['tags'])
    .some((tag) => ASSIGNED_SESSION_TAGS.has(normalizeRuleToken(tag)));
};

const readChallengeProgress = (challenge: UnknownRecord): number => {
  const dashboardSummary = asRecord(challenge.dashboardSummary);
  return readOptionalNumber(dashboardSummary, ['progressPercentage', 'progress'])
    ?? readOptionalNumber(challenge, ['progress', 'progressPercentage'])
    ?? 0;
};

const readChallengeDaysLeft = (challenge: UnknownRecord): number => {
  const dashboardSummary = asRecord(challenge.dashboardSummary);
  return readOptionalNumber(dashboardSummary, ['daysLeft', 'daysRemaining'])
    ?? readOptionalNumber(challenge, ['daysLeft', 'daysRemaining'])
    ?? NO_DEADLINE_SORT_VALUE;
};

const readChallengeParticipants = (challenge: UnknownRecord): number => (
  readOptionalNumber(challenge, ['participants', 'currentParticipants']) ?? 0
);

const challengePriorityScore = (challenge: UnknownRecord): number => {
  const joined = challenge.joined === true;
  const participantStatus = readString(challenge, ['participantStatus']);
  const progress = clampPercentValue(readChallengeProgress(challenge));
  if (joined && participantStatus !== 'completed' && progress > 0 && progress < 100) return 0;
  if (joined && participantStatus !== 'completed' && progress < 100) return 1;
  if (joined) return 2;
  return 3;
};

const compareActiveChallenges = (a: UnknownRecord, b: UnknownRecord): number => {
  const scoreDelta = challengePriorityScore(a) - challengePriorityScore(b);
  if (scoreDelta !== 0) return scoreDelta;

  const progressDelta = clampPercentValue(readChallengeProgress(b)) - clampPercentValue(readChallengeProgress(a));
  if (progressDelta !== 0) return progressDelta;

  const urgencyDelta = readChallengeDaysLeft(a) - readChallengeDaysLeft(b);
  if (urgencyDelta !== 0) return urgencyDelta;

  const crowdDelta = readChallengeParticipants(b) - readChallengeParticipants(a);
  if (crowdDelta !== 0) return crowdDelta;

  return readString(a, ['title', 'name']).localeCompare(readString(b, ['title', 'name']));
};

const challengeUnitLabel = (unit: string, amount: number): string => {
  const normalized = unit.toLowerCase();
  if (normalized === 'completion') return amount === 1 ? 'completion' : 'completions';
  if (normalized === 'sessions') return amount === 1 ? 'session' : 'sessions';
  if (normalized === 'workouts') return amount === 1 ? 'workout' : 'workouts';
  if (normalized === 'minutes') return amount === 1 ? 'minute' : 'minutes';
  if (normalized === 'days') return amount === 1 ? 'day' : 'days';
  if (normalized === 'points') return amount === 1 ? 'point' : 'points';
  return normalized || 'progress';
};

const formatChallengeImpactLabel = (challenge: UnknownRecord): string => {
  const dashboardSummary = asRecord(challenge.dashboardSummary);
  const impact = asRecord(dashboardSummary.lastWorkoutImpact || challenge.lastWorkoutImpact);
  const delta = positiveMetric(impact.delta);
  if (delta === null) return '';

  const unit = readString(impact, ['progressUnit']) || readString(challenge, ['progressUnit']) || readString(dashboardSummary, ['progressUnit']) || 'progress';
  const details = [`Last workout added ${formatChallengeMetric(delta)} ${challengeUnitLabel(unit, delta)}`];
  const activeMinutes = positiveMetric(impact.activeMinutes);
  const exercisesCompleted = positiveMetric(impact.exercisesCompleted);
  const personalRecordCount = positiveMetric(impact.personalRecordCount);
  const roundedPersonalRecordCount = personalRecordCount === null ? null : Math.round(personalRecordCount);

  if (activeMinutes !== null) details.push(`${formatChallengeMetric(activeMinutes)} active min`);
  if (exercisesCompleted !== null) details.push(`${formatChallengeMetric(exercisesCompleted)} ${exercisesCompleted === 1 ? 'exercise' : 'exercises'}`);
  if (roundedPersonalRecordCount !== null && roundedPersonalRecordCount > 0) details.push(`${roundedPersonalRecordCount} PR${roundedPersonalRecordCount === 1 ? '' : 's'}`);
  if (impact.assignedSession === true) details.push('assigned session');

  return details.join(' | ');
};

const readChallengeNextAction = (challenge: UnknownRecord, dashboardSummary: UnknownRecord): string => {
  const unit = normalizeRuleToken(
    readString(dashboardSummary, ['progressUnit']) || readString(challenge, ['progressUnit'])
  );
  const assignedSession = isAssignedSessionChallenge(challenge, dashboardSummary);
  const explicit = readString(dashboardSummary, ['nextAction']) || readString(challenge, ['nextAction']);

  if (explicit) {
    if (assignedSession && /^complete your next (planned )?workout\.?$/i.test(explicit)) {
      return 'Complete your next assigned workout.';
    }
    return explicit;
  }

  if (challenge.joined !== true) return 'Open Challenges to join this campaign.';

  const participantStatus = readString(challenge, ['participantStatus']);
  const progress = clampPercentValue(readChallengeProgress(challenge));
  if (participantStatus === 'completed' || progress >= 100) return 'Review your challenge result on the board.';

  if (assignedSession || ['session', 'sessions', 'workout', 'workouts', 'completion', 'completions'].includes(unit)) {
    return assignedSession
      ? 'Complete your next assigned workout to keep this challenge moving.'
      : 'Complete your next planned workout to keep this challenge moving.';
  }
  if (['minute', 'minutes', 'active_minutes'].includes(unit)) return 'Log workout minutes from your next session.';
  if (['day', 'days'].includes(unit)) return 'Check in after your next training day.';
  if (['point', 'points'].includes(unit)) return 'Log your next workout to add challenge points.';
  return '';
};

export function selectActiveChallengeSummary({ challenges, isDemoData }: {
  challenges?: unknown[] | null;
  isDemoData?: boolean;
}): HomeChallengeSummary | null {
  if (isDemoData) return null;
  const active = (challenges || []).map(asRecord).filter((challenge) => readString(challenge, ['status']) === 'active');
  const selected = [...active].sort(compareActiveChallenges)[0];
  if (!selected) return null;

  const dashboardSummary = asRecord(selected.dashboardSummary);
  const progressValue = readOptionalNumber(dashboardSummary, ['progressPercentage', 'progress']) ?? readOptionalNumber(selected, ['progress', 'progressPercentage']) ?? 0;
  const daysLeftValue = readOptionalNumber(dashboardSummary, ['daysLeft', 'daysRemaining']) ?? readOptionalNumber(selected, ['daysLeft', 'daysRemaining']) ?? 0;
  const checkInsCount = readOptionalNumber(dashboardSummary, ['checkInsCount']) ?? readOptionalNumber(selected, ['checkInsCount']);
  const summary: HomeChallengeSummary = {
    id: readString(selected, ['id', '_id', 'challengeId']),
    title: readString(selected, ['title', 'name']) || 'Active Challenge',
    progress: clampPercentValue(progressValue),
    daysLeft: Math.max(0, Math.round(daysLeftValue)),
    participants: Math.max(0, Math.round(readChallengeParticipants(selected))),
    reward: readString(selected, ['reward', 'rewardText']) || 'XP Reward',
    joined: selected.joined === true,
  };
  const progressLabel = readString(dashboardSummary, ['progressLabel']) || readString(selected, ['progressLabel']);
  const nextAction = readChallengeNextAction(selected, dashboardSummary);
  const impactLabel = formatChallengeImpactLabel(selected);
  if (progressLabel) summary.progressLabel = progressLabel;
  if (checkInsCount !== null) summary.checkInsCount = Math.max(0, Math.round(checkInsCount));
  if (nextAction) summary.nextAction = nextAction;
  if (impactLabel) summary.impactLabel = impactLabel;
  return summary;
}
