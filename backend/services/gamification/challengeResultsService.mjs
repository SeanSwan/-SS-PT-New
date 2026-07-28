/**
 * Managed challenge results read model.
 *
 * Builds trainer/admin rollups from persisted ChallengeParticipant rows so the
 * challenge command deck can show campaign results without demo placeholders.
 */

import { buildChallengeLifecycleAnalytics } from './challengeLifecycleAnalyticsService.mjs';
import { buildChallengeResultRuleInsights } from './challengeResultRuleInsights.mjs';
import { buildNeedsAttentionParticipants, buildRecentJoinedParticipants, buildTopImprovers, buildTopParticipants } from './challengeResultParticipantLists.mjs';

const WORKOUT_EVENT_TYPE = 'workout_completed';
const ACTIVE_STATUSES = new Set(['joined', 'active']);
const DROPPED_STATUSES = new Set(['failed', 'quit', 'disqualified', 'cancelled']);

export class ChallengeResultsReadError extends Error {
  constructor(publicMessage, statusCode = 400) {
    super(publicMessage);
    this.name = 'ChallengeResultsReadError';
    this.publicMessage = publicMessage;
    this.statusCode = statusCode;
  }
}

const fail = (message, statusCode = 400) => {
  throw new ChallengeResultsReadError(message, statusCode);
};

const normalizeChallengeId = (value) => {
  const id = String(value ?? '').trim();
  if (!id) fail('Challenge id is required');
  return id;
};

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
const roundOne = (value) => Math.round(toFiniteNumber(value) * 10) / 10;
const clampPercent = (value) => Math.min(100, Math.max(0, roundOne(value)));
const getJsonArray = (value) => (Array.isArray(value) ? [...value] : []);
const isWorkoutProgressEvent = (entry) =>
  String(entry?.sourceType || entry?.source || '').trim() === WORKOUT_EVENT_TYPE;

const progressDeltaForEntry = (entry) => {
  if (entry?.delta !== undefined && entry?.delta !== null && entry?.delta !== '') return nonNegative(entry.delta);
  const currentProgress = Number(entry?.currentProgress);
  const previousProgress = Number(entry?.previousProgress);
  return Number.isFinite(currentProgress) && Number.isFinite(previousProgress)
    ? Math.max(0, currentProgress - previousProgress)
    : 0;
};

const parseTime = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const isoOrNull = (value) => {
  const time = parseTime(value);
  return time === null ? null : new Date(time).toISOString();
};

const computeDaysLeft = ({ endDate, now }) => {
  const endTime = parseTime(endDate);
  if (endTime === null) return null;
  return Math.max(0, Math.ceil((endTime - now.getTime()) / (1000 * 60 * 60 * 24)));
};

const canManageChallenge = (challenge, viewer) => {
  if (!viewer) return false;
  if (viewer.role === 'admin') return true;
  if (viewer.role === 'trainer') return String(challenge.createdBy) === String(viewer.id);
  return false;
};

const displayNameForUser = (user, userId) => {
  const firstLast = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  if (firstLast) return firstLast;
  if (user?.username) return user.username;
  return `Client #${userId}`;
};

const getParticipants = (challenge) => {
  const plainChallenge = toPlainObject(challenge);
  const participants = plainChallenge.participants || plainChallenge.ChallengeParticipants || [];
  return Array.isArray(participants) ? participants.map(toPlainObject) : [];
};

const getLinkedSubmissions = async ({ models, challengeId }) => {
  const ChallengeSubmission = models?.ChallengeSubmission;
  if (typeof ChallengeSubmission?.findAll !== 'function') return [];
  try {
    return await ChallengeSubmission.findAll({
      attributes: ['id', 'submittedByUserId', 'submittedAt', 'reviewedAt'],
      where: { approvedChallengeId: challengeId },
    });
  } catch {
    return [];
  }
};
const progressPercentFor = (participant, maxProgress) => {
  const explicit = Number(participant.progressPercentage);
  if (Number.isFinite(explicit)) return clampPercent(explicit);
  const currentProgress = nonNegative(participant.currentProgress);
  return clampPercent(maxProgress > 0 ? (currentProgress / maxProgress) * 100 : 0);
};
const progressDeltaForParticipant = (participant) => roundOne(getJsonArray(participant.progressHistory)
  .filter(isWorkoutProgressEvent)
  .reduce((sum, entry) => sum + progressDeltaForEntry(entry), 0));

const normalizeParticipant = (participant, { maxProgress }) => {
  const user = toPlainObject(participant.user || participant.User);
  const userId = participant.userId ?? user.id ?? null;
  const progressPercentage = progressPercentFor(participant, maxProgress);

  return {
    id: String(participant.id ?? '').trim(),
    userId,
    displayName: displayNameForUser(user, userId),
    avatarUrl: user.photo ?? null,
    status: String(participant.status || 'joined'),
    currentProgress: roundOne(nonNegative(participant.currentProgress)),
    progressPercentage,
    progressDelta: progressDeltaForParticipant(participant),
    score: Math.round(nonNegative(participant.score)),
    rank: participant.rank ?? null,
    xpEarned: Math.round(nonNegative(participant.xpEarned) + nonNegative(participant.bonusXpEarned)),
    checkInsCount: Math.round(nonNegative(participant.checkInsCount)),
    joinedAt: isoOrNull(participant.joinedAt),
    completedAt: isoOrNull(participant.completedAt),
    lastProgressUpdate: isoOrNull(participant.lastProgressUpdate),
  };
};

const activeMinutesForEntry = (entry) => {
  const explicit = entry?.durationMinutes ?? entry?.sessionDurationMinutes ?? entry?.activeMinutes;
  if (explicit !== undefined && explicit !== null && explicit !== '') return roundOne(nonNegative(explicit));
  return String(entry?.progressUnit || '').toLowerCase() === 'minutes' ? roundOne(nonNegative(entry?.delta)) : 0;
};
const exercisesCompletedForEntry = (entry) => roundOne(nonNegative(entry?.exercisesCompleted));
const personalRecordCountForEntry = (entry) => {
  const listCount = Array.isArray(entry?.personalRecords) ? entry.personalRecords.length : null;
  return Math.round(nonNegative(entry?.personalRecordCount ?? entry?.prCount ?? listCount));
};

const normalizeWorkoutImpact = ({ entry, participant }) => ({
  participantId: String(participant.id ?? '').trim(),
  userId: participant.userId,
  sourceId: String(entry?.sourceId ?? '').trim() || null,
  occurredAt: isoOrNull(entry?.occurredAt),
  progressUnit: String(entry?.progressUnit ?? '').trim() || null,
  delta: roundOne(nonNegative(entry?.delta)),
  activeMinutes: activeMinutesForEntry(entry),
  exercisesCompleted: exercisesCompletedForEntry(entry),
  personalRecordCount: personalRecordCountForEntry(entry),
  assignedSession: entry?.assignedSession === true || entry?.isAssignedSession === true,
  previousProgress: roundOne(nonNegative(entry?.previousProgress)),
  currentProgress: roundOne(nonNegative(entry?.currentProgress)),
});

const collectWorkoutImpacts = (participants) => {
  const impacts = [];

  for (const participant of participants) {
    for (const entry of getJsonArray(participant.progressHistory).filter(isWorkoutProgressEvent)) {
      const occurredAt = parseTime(entry?.occurredAt);
      if (occurredAt === null) continue;
      impacts.push({
        occurredAt,
        impact: normalizeWorkoutImpact({ entry, participant }),
      });
    }
  }

  impacts.sort((a, b) => b.occurredAt - a.occurredAt);
  return impacts;
};

const buildStatusBreakdown = (participants) => participants.reduce((breakdown, participant) => {
  const status = String(participant.status || 'joined');
  breakdown[status] = (breakdown[status] ?? 0) + 1;
  return breakdown;
}, {});

const buildChallengeSummary = ({ challenge, participants, now }) => {
  const maxProgress = Math.max(1, nonNegative(challenge.maxProgress, 1));
  const participantCount = participants.length;
  const completedParticipantCount = participants.filter((participant) => participant.status === 'completed').length;
  const activeParticipantCount = participants.filter((participant) => ACTIVE_STATUSES.has(participant.status)).length;
  const droppedParticipantCount = participants.filter((participant) => DROPPED_STATUSES.has(participant.status)).length;
  const totalCurrentProgress = participants.reduce((sum, participant) => sum + nonNegative(participant.currentProgress), 0);
  const totalProgressPercentage = participants.reduce((sum, participant) => sum + progressPercentFor(participant, maxProgress), 0);
  const checkInsCount = participants.reduce((sum, participant) => sum + Math.round(nonNegative(participant.checkInsCount)), 0);

  return {
    participantCount,
    activeParticipantCount,
    completedParticipantCount,
    droppedParticipantCount,
    completionRate: participantCount > 0 ? roundOne((completedParticipantCount / participantCount) * 100) : 0,
    averageProgressPercentage: participantCount > 0 ? roundOne(totalProgressPercentage / participantCount) : 0,
    totalCurrentProgress: roundOne(totalCurrentProgress),
    checkInsCount,
    daysLeft: computeDaysLeft({ endDate: challenge.endDate, now }),
    maxProgress,
    progressUnit: String(challenge.progressUnit || 'completion').trim().toLowerCase() || 'completion',
    statusBreakdown: buildStatusBreakdown(participants),
  };
};

const buildChallengeEnvelope = (challenge) => ({
  id: String(challenge.id ?? '').trim(),
  title: String(challenge.title || 'Challenge').trim(),
  description: String(challenge.description || '').trim(),
  challengeType: String(challenge.challengeType || 'custom'),
  category: String(challenge.category || 'fitness'),
  difficulty: Math.round(nonNegative(challenge.difficulty, 1)),
  xpReward: Math.round(nonNegative(challenge.xpReward)),
  startDate: isoOrNull(challenge.startDate),
  endDate: isoOrNull(challenge.endDate),
  status: String(challenge.status || 'draft'),
  isPublic: challenge.isPublic === true,
  viewCount: Math.round(nonNegative(challenge.viewCount)),
  createdBy: challenge.createdBy ?? null,
});

const getChallengeInclude = ({ ChallengeParticipant, User }) => ([{
  model: ChallengeParticipant,
  as: 'participants',
  attributes: [
    'id', 'userId', 'status', 'teamId', 'currentProgress', 'progressPercentage', 'score', 'rank', 'xpEarned',
    'bonusXpEarned', 'checkInsCount', 'joinedAt', 'startedAt', 'completedAt', 'lastProgressUpdate', 'updatedAt', 'progressHistory',
  ],
  include: [{
    model: User,
    as: 'user',
    attributes: ['id', 'firstName', 'lastName', 'username', 'photo'],
  }],
}]);

export const getManagedChallengeResults = async ({ models, challengeId, viewer, now = new Date() } = {}) => {
  const { Challenge, ChallengeParticipant, User } = models ?? {};
  if (typeof Challenge?.findByPk !== 'function') fail('Challenge model unavailable', 500);
  if (!ChallengeParticipant || !User) fail('Challenge result models unavailable', 500);

  const id = normalizeChallengeId(challengeId);
  const challengeRow = await Challenge.findByPk(id, {
    include: getChallengeInclude({ ChallengeParticipant, User }),
  });

  if (!challengeRow) fail('Challenge not found', 404);

  const challenge = toPlainObject(challengeRow);
  if (!canManageChallenge(challenge, viewer)) fail('You cannot manage this challenge', 403);

  const participants = getParticipants(challengeRow);
  const linkedSubmissions = await getLinkedSubmissions({ models, challengeId: id });
  const maxProgress = Math.max(1, nonNegative(challenge.maxProgress, 1));
  const workoutImpacts = collectWorkoutImpacts(participants);
  const normalizedParticipants = participants.map((participant) => normalizeParticipant(participant, { maxProgress }));
  const lifecycle = buildChallengeLifecycleAnalytics({ challenge, participants, submissions: linkedSubmissions });

  return {
    challenge: buildChallengeEnvelope(challenge),
    summary: buildChallengeSummary({ challenge, participants, now }),
    topParticipants: buildTopParticipants({ participants: normalizedParticipants }),
    topImprovers: buildTopImprovers({ participants: normalizedParticipants }),
    needsAttentionParticipants: buildNeedsAttentionParticipants({ participants: normalizedParticipants, activeStatuses: ACTIVE_STATUSES }),
    recentJoinedParticipants: buildRecentJoinedParticipants({ participants: normalizedParticipants }),
    analytics: lifecycle.analytics,
    lifecycleEvents: lifecycle.lifecycleEvents,
    ruleInsights: buildChallengeResultRuleInsights({ challenge, participants }),
    workoutImpact: {
      completedWorkoutEvents: workoutImpacts.length,
      challengeDerivedActiveMinutes: roundOne(workoutImpacts.reduce((sum, entry) => sum + nonNegative(entry.impact.activeMinutes), 0)),
      challengeDerivedExercisesCompleted: roundOne(workoutImpacts.reduce((sum, entry) => sum + nonNegative(entry.impact.exercisesCompleted), 0)),
      challengeDerivedPersonalRecordCount: Math.round(workoutImpacts.reduce((sum, entry) => sum + nonNegative(entry.impact.personalRecordCount), 0)),
      totalDelta: roundOne(workoutImpacts.reduce((sum, entry) => sum + nonNegative(entry.impact.delta), 0)),
      latestWorkoutImpact: workoutImpacts[0]?.impact ?? null,
    },
  };
};
