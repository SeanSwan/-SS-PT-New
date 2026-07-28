/**
 * FILE: useChallenges.normalization.ts
 * PURPOSE: Pure challenge API normalization for dashboard challenge cards.
 *
 * Keeps the hook focused on fetch lifecycle while this module maps live backend
 * challenge and participation records into UI-safe progress, target, and impact
 * fields. This file never manufactures demo challenge data.
 */
export type ChallengeStatus = 'active' | 'upcoming' | 'completed';
export type ChallengeCategory =
  | 'strength' | 'cardio' | 'nutrition' | 'consistency' | 'social'
  | 'dance' | 'music' | 'singing' | 'art' | 'gaming' | 'comedy' | 'community';
export interface ChallengeWorkoutImpact {
  sourceId?: string;
  occurredAt?: string;
  progressUnit?: string;
  delta?: number;
  activeMinutes?: number;
  exercisesCompleted?: number;
  personalRecordCount?: number;
  assignedSession?: boolean;
  previousProgress?: number;
  currentProgress?: number;
}
export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  status: ChallengeStatus;
  progress: number;
  participants: number;
  daysLeft?: number;
  startsIn?: string;
  reward: string;
  joined: boolean;
  currentProgress: number;
  maxProgress: number;
  progressUnit: string;
  progressLabel: string;
  targetLabel: string;
  tags?: string[];
  participantStatus?: string;
  joinedAt?: string;
  completedAt?: string;
  lastProgressUpdate?: string;
  checkInsCount: number;
  allowTeams?: boolean;
  maxTeamSize?: number;
  teamId?: string;
  nextAction?: string;
  lastWorkoutImpact?: ChallengeWorkoutImpact | null;
}
type UnknownRecord = Record<string, unknown>;
const CATEGORY_MAP: Record<string, ChallengeCategory> = {
  fitness: 'strength',
  nutrition: 'nutrition',
  mindfulness: 'consistency',
  social: 'social',
  streak: 'consistency',
  dance: 'dance',
  music: 'music',
  singing: 'singing',
  art: 'art',
  gaming: 'gaming',
  comedy: 'comedy',
  community_meetup: 'community',
};
const asRecord = (value: unknown): UnknownRecord => (
  value && typeof value === 'object' ? value as UnknownRecord : {}
);
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const readString = (record: UnknownRecord, keys: string[]): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};
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
const readNumber = (record: UnknownRecord, keys: string[], fallback = 0): number => {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
};
const readOptionalNumber = (record: UnknownRecord, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
};
const readBoolean = (record: UnknownRecord, keys: string[]): boolean => {
  const value = keys.map((key) => record[key]).find((entry) => typeof entry === 'boolean' || typeof entry === 'string');
  if (typeof value === 'boolean') return value;
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
};
const clampPercent = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));
const formatMetric = (value: number): string => Number.isInteger(value) ? String(value) : value.toFixed(1);
const mapCategory = (backendCategory: string): ChallengeCategory => (
  CATEGORY_MAP[backendCategory] || 'strength'
);
const validTime = (value: string): number => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};
function deriveStatus(apiStatus: string, startDate: string, endDate: string): ChallengeStatus {
  const now = Date.now();
  const start = validTime(startDate);
  const end = validTime(endDate);
  if (apiStatus === 'completed' || apiStatus === 'archived') return 'completed';
  if (apiStatus === 'draft' || (start > 0 && start > now)) return 'upcoming';
  if (end > 0 && end < now) return 'completed';
  return 'active';
}
function computeDaysLeft(endDate: string): number {
  const end = validTime(endDate);
  if (!end) return 0;
  return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
}
function computeStartsIn(startDate: string): string {
  const start = validTime(startDate);
  if (!start) return 'soon';
  const days = Math.ceil((start - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'soon';
  if (days === 1) return '1 day';
  return `${days} days`;
}
function formatReward(xpReward = 0, bonusXpReward = 0, badgeName = ''): string {
  const parts: string[] = [];
  if (xpReward > 0) parts.push(`${Math.round(xpReward)} XP`);
  if (bonusXpReward > 0) parts.push(`${Math.round(bonusXpReward)} bonus XP`);
  if (badgeName) parts.push(badgeName);
  return parts.length > 0 ? parts.join(' + ') : 'XP Reward';
}
function unitLabel(unit: string, amount: number): string {
  const normalized = unit.toLowerCase();
  if (normalized === 'completion') return amount === 1 ? 'completion' : 'completions';
  if (normalized === 'sessions') return amount === 1 ? 'session' : 'sessions';
  if (normalized === 'workouts') return amount === 1 ? 'workout' : 'workouts';
  if (normalized === 'minutes') return amount === 1 ? 'minute' : 'minutes';
  if (normalized === 'days') return amount === 1 ? 'day' : 'days';
  if (normalized === 'points') return amount === 1 ? 'point' : 'points';
  return normalized || 'progress';
}
function normalizeWorkoutImpact(value: unknown, fallbackUnit: string): ChallengeWorkoutImpact | null {
  const record = asRecord(value);
  const sourceId = readString(record, ['sourceId']);
  const occurredAt = readString(record, ['occurredAt']);
  const progressUnit = readString(record, ['progressUnit']) || fallbackUnit;
  const delta = readOptionalNumber(record, ['delta']);
  const activeMinutes = readOptionalNumber(record, ['activeMinutes', 'durationMinutes', 'sessionDurationMinutes']);
  const exercisesCompleted = readOptionalNumber(record, ['exercisesCompleted']);
  const personalRecordCount = readOptionalNumber(record, ['personalRecordCount', 'prCount']);
  const assignedSession = record.assignedSession;
  const previousProgress = readOptionalNumber(record, ['previousProgress']);
  const currentProgress = readOptionalNumber(record, ['currentProgress']);
  if (!sourceId && !occurredAt && delta === undefined && activeMinutes === undefined && exercisesCompleted === undefined && personalRecordCount === undefined && previousProgress === undefined && currentProgress === undefined) {
    return null;
  }
  const impact: ChallengeWorkoutImpact = {};
  if (sourceId) impact.sourceId = sourceId;
  if (occurredAt) impact.occurredAt = occurredAt;
  if (progressUnit) impact.progressUnit = progressUnit;
  if (delta !== undefined) impact.delta = Math.max(0, delta);
  if (activeMinutes !== undefined) impact.activeMinutes = Math.max(0, activeMinutes);
  if (exercisesCompleted !== undefined) impact.exercisesCompleted = Math.max(0, exercisesCompleted);
  if (personalRecordCount !== undefined) impact.personalRecordCount = Math.round(Math.max(0, personalRecordCount));
  if (typeof assignedSession === 'boolean') impact.assignedSession = assignedSession;
  if (previousProgress !== undefined) impact.previousProgress = Math.max(0, previousProgress);
  if (currentProgress !== undefined) impact.currentProgress = Math.max(0, currentProgress);
  return impact;
}
const getRecordId = (value: unknown): string => String(value ?? '').trim();
const JOINED_PARTICIPANT_STATUSES = new Set(['joined', 'active', 'completed']);
const getParticipationChallengeId = (participation: UnknownRecord): string => {
  const challenge = asRecord(participation.challenge);
  return getRecordId(participation.challengeId || challenge.id);
};
const isJoinedParticipation = (row: UnknownRecord, status: string): boolean => {
  const hasParticipationRow = Boolean(getRecordId(row.id) || getRecordId(row.challengeId));
  if (!hasParticipationRow) return false;
  return status ? JOINED_PARTICIPANT_STATUSES.has(status) : true;
};
export function normalizeChallengeForDashboard(apiChallenge: unknown, participation?: unknown): Challenge {
  const challenge = asRecord(apiChallenge);
  const joinedRow = asRecord(participation);
  const joinedChallenge = asRecord(joinedRow.challenge);
  const dashboardSummary = asRecord(joinedRow.dashboardSummary);
  const merged = { ...joinedChallenge, ...challenge };
  const id = getRecordId(merged.id || joinedRow.challengeId || joinedChallenge.id);
  const participantStatus = readString(joinedRow, ['status']);
  const backendStatus = readString(merged, ['status']) || 'active';
  const startDate = readString(merged, ['startDate']);
  const endDate = readString(merged, ['endDate']);
  const status = participantStatus === 'completed'
    ? 'completed'
    : deriveStatus(backendStatus, startDate, endDate);
  const joined = isJoinedParticipation(joinedRow, participantStatus);
  const summaryMaxProgress = joined ? readOptionalNumber(dashboardSummary, ['maxProgress']) : undefined;
  const maxProgress = Math.max(1, summaryMaxProgress ?? readNumber(merged, ['maxProgress'], 1));
  const summaryCurrentProgress = joined ? readOptionalNumber(dashboardSummary, ['currentProgress']) : undefined;
  const currentProgress = Math.max(0, summaryCurrentProgress ?? (joined
    ? readNumber(joinedRow, ['currentProgress'])
    : readNumber(merged, ['currentProgress'])));
  const summaryProgress = joined ? readOptionalNumber(dashboardSummary, ['progressPercentage', 'progress']) : undefined;
  const explicitProgress = summaryProgress ?? (joined
    ? readNumber(joinedRow, ['progressPercentage', 'progress'])
    : readNumber(merged, ['progressPercentage', 'progress']));
  const derivedProgress = maxProgress > 0 ? (currentProgress / maxProgress) * 100 : 0;
  const progress = clampPercent(explicitProgress || derivedProgress);
  const progressUnit = (joined ? readString(dashboardSummary, ['progressUnit']) : '') || readString(merged, ['progressUnit']) || 'completion';
  const progressLabel = (joined ? readString(dashboardSummary, ['progressLabel']) : '') || `${formatMetric(currentProgress)} of ${formatMetric(maxProgress)} ${unitLabel(progressUnit, maxProgress)}`;
  const targetLabel = `${formatMetric(maxProgress)} ${unitLabel(progressUnit, maxProgress)} target`;
  const nextAction = joined ? readString(dashboardSummary, ['nextAction']) : '';
  const lastWorkoutImpact = joined ? normalizeWorkoutImpact(dashboardSummary.lastWorkoutImpact, progressUnit) : null;
  const tags = readStringArray(merged, ['tags']);
  const allowTeams = readBoolean(merged, ['allowTeams']);
  const maxTeamSize = allowTeams ? readOptionalNumber(merged, ['maxTeamSize']) : undefined;
  const teamId = joined ? readString(joinedRow, ['teamId']) : '';
  const normalized: Challenge = {
    id,
    title: readString(merged, ['title', 'name']) || 'Challenge',
    description: readString(merged, ['description']),
    category: mapCategory(readString(merged, ['category'])),
    status,
    progress,
    participants: Math.max(0, Math.round(readNumber(merged, ['currentParticipants', 'participants']))),
    reward: formatReward(
      readNumber(merged, ['xpReward']),
      readNumber(merged, ['bonusXpReward']),
      readString(merged, ['badgeName'])
    ),
    joined,
    currentProgress,
    maxProgress,
    progressUnit,
    progressLabel,
    targetLabel,
    participantStatus: participantStatus || undefined,
    joinedAt: readString(joinedRow, ['joinedAt']) || undefined,
    completedAt: readString(joinedRow, ['completedAt']) || undefined,
    lastProgressUpdate: readString(joinedRow, ['lastProgressUpdate']) || undefined,
    checkInsCount: joined ? Math.max(0, Math.round(readNumber(dashboardSummary, ['checkInsCount'], readNumber(joinedRow, ['checkInsCount'])))) : 0,
  };
  if (tags.length > 0) normalized.tags = tags;
  if (allowTeams) normalized.allowTeams = true;
  if (maxTeamSize !== undefined) normalized.maxTeamSize = Math.max(2, Math.round(maxTeamSize));
  if (allowTeams && teamId) normalized.teamId = teamId;
  if (nextAction) normalized.nextAction = nextAction;
  if (lastWorkoutImpact) normalized.lastWorkoutImpact = lastWorkoutImpact;
  if (status === 'active') {
    const summaryDaysLeft = readOptionalNumber(dashboardSummary, ['daysLeft']);
    normalized.daysLeft = Math.max(0, Math.round(summaryDaysLeft ?? computeDaysLeft(endDate)));
  }
  if (status === 'upcoming') normalized.startsIn = computeStartsIn(startDate);
  return normalized;
}
export function normalizeChallengeRecords(apiChallenges: unknown[], participations: unknown[] = []): Challenge[] {
  const participationMap = new Map<string, unknown>();
  for (const participation of participations) {
    const id = getParticipationChallengeId(asRecord(participation));
    if (id) participationMap.set(id, participation);
  }
  const mapped = asArray(apiChallenges)
    .filter((challenge) => readString(asRecord(challenge), ['status']) !== 'cancelled')
    .map((challenge) => {
      const id = getRecordId(asRecord(challenge).id);
      return normalizeChallengeForDashboard(challenge, participationMap.get(id));
    });
  const mappedIds = new Set(mapped.map((challenge) => challenge.id));
  for (const participation of participations) {
    const record = asRecord(participation);
    const challenge = asRecord(record.challenge);
    const id = getParticipationChallengeId(record);
    const participantStatus = readString(record, ['status']);
    if (id && !mappedIds.has(id) && isJoinedParticipation(record, participantStatus)) {
      mapped.push(normalizeChallengeForDashboard(challenge, participation));
      mappedIds.add(id);
    }
  }
  return mapped;
}





