/**
 * Challenge lifecycle analytics builder.
 *
 * Derives the first managed challenge analytics timeline from existing
 * ChallengeParticipant fields and workout history; later this can move to append-only ChallengeEvent rows.
 */

const WORKOUT_EVENT_TYPE = 'workout_completed';
const CHALLENGE_LEFT_EVENT_TYPE = 'challenge_left';
const DROPPED_STATUSES = new Set(['failed', 'quit', 'disqualified', 'cancelled']);
const RETAINED_STATUSES = new Set(['joined', 'active', 'completed']);
const ACTIVE_STATUSES = new Set(['joined', 'active']);
const RECENT_LIFECYCLE_EVENT_LIMIT = 12;

const EVENT_ORDER = {
  challenge_completed: 0,
  reward_earned: 1,
  progress_updated: 2,
  challenge_declined: 3,
  moderation_action_taken: 4,
  submission_flagged: 5,
  challenge_joined: 6,
  challenge_started: 7,
  challenge_dropped: 8,
  challenge_viewed: 9,
};

const EVENT_LABELS = {
  challenge_viewed: 'Challenge viewed',
  challenge_joined: 'Challenge joined',
  challenge_started: 'Challenge started',
  progress_updated: 'Progress updated',
  challenge_completed: 'Challenge completed',
  challenge_dropped: 'Challenge dropped',
  challenge_declined: 'Challenge declined',
  reward_earned: 'Reward earned',
  submission_flagged: 'Submission flagged for review',
  moderation_action_taken: 'Moderation action taken',
};

const toFiniteNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const nonNegative = (value, fallback = 0) => Math.max(0, toFiniteNumber(value, fallback));
const roundOne = (value) => Math.round(toFiniteNumber(value) * 10) / 10;
const percent = (count, total) => (total > 0 ? roundOne((count / total) * 100) : 0);
const getJsonArray = (value) => (Array.isArray(value) ? [...value] : []);
const toPlainObject = (value) => {
  if (!value) return {};
  if (typeof value.toJSON === 'function') return value.toJSON();
  if (typeof value.get === 'function') return value.get({ plain: true });
  return value && typeof value === 'object' ? { ...value } : {};
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

const eventTypeFor = (entry) => String(entry?.sourceType || entry?.source || '').trim();

const isWorkoutProgressEvent = (entry) => eventTypeFor(entry) === WORKOUT_EVENT_TYPE;
const isChallengeLeftEvent = (entry) => eventTypeFor(entry) === CHALLENGE_LEFT_EVENT_TYPE;

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
const collectWorkoutEntries = (participants) => participants.flatMap((participant) =>
  getJsonArray(participant.progressHistory).filter(isWorkoutProgressEvent));
const progressDeltaForEntry = (entry) => {
  const explicit = Number(entry?.delta);
  if (Number.isFinite(explicit)) return roundOne(nonNegative(explicit));
  const currentProgress = Number(entry?.currentProgress);
  const previousProgress = Number(entry?.previousProgress);
  if (Number.isFinite(currentProgress) && Number.isFinite(previousProgress)) {
    return roundOne(nonNegative(currentProgress - previousProgress));
  }
  return 0;
};
const progressDeltaForParticipant = (participant) => roundOne(getJsonArray(participant.progressHistory)
  .filter(isWorkoutProgressEvent)
  .reduce((sum, entry) => sum + progressDeltaForEntry(entry), 0));
const buildImprovementStats = (participants) => {
  const progressDeltas = participants.map(progressDeltaForParticipant).filter((delta) => delta > 0);
  return {
    improvedParticipantCount: progressDeltas.length,
    averageProgressDelta: progressDeltas.length > 0
      ? roundOne(progressDeltas.reduce((sum, delta) => sum + delta, 0) / progressDeltas.length)
      : 0,
  };
};
const progressPercentForParticipant = (participant, maxProgress) => {
  const explicit = Number(participant.progressPercentage);
  if (Number.isFinite(explicit)) return Math.min(100, Math.max(0, roundOne(explicit)));
  const currentProgress = nonNegative(participant.currentProgress);
  return maxProgress > 0 ? Math.min(100, roundOne((currentProgress / maxProgress) * 100)) : 0;
};

const teamIdForParticipant = (participant) => String(participant.teamId ?? '').trim();
const buildTeamCompletionStats = (participants) => {
  const teams = new Map();

  for (const participant of participants) {
    const teamId = teamIdForParticipant(participant);
    if (!teamId) continue;
    teams.set(teamId, [...(teams.get(teamId) ?? []), participant]);
  }

  const teamCount = teams.size;
  const completedTeamCount = Array.from(teams.values()).filter((teamParticipants) => (
    teamParticipants.length > 0
      && teamParticipants.every((participant) => String(participant.status || '') === 'completed')
  )).length;

  return {
    teamCount,
    completedTeamCount,
    teamCompletionRate: percent(completedTeamCount, teamCount),
  };
};

const hasStartedChallenge = (participant) => Boolean(isoOrNull(participant.startedAt))
  || getJsonArray(participant.progressHistory).some(isWorkoutProgressEvent);

const challengeLeftEventTypeFor = (participant, entry) => (
  String(entry?.previousStatus || '').trim().toLowerCase() === 'joined' && !hasStartedChallenge(participant)
    ? 'challenge_declined'
    : 'challenge_dropped'
);
const displayNameForParticipant = (participant) => {
  const user = participant.user || participant.User || {}, firstLast = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return firstLast || user.username || `Client #${participant.userId ?? 'Unknown'}`;
};
const makeEvent = ({ type, participant, occurredAt, sourceId = null, delta = null }) => ({
  type,
  label: EVENT_LABELS[type] ?? type,
  participantId: String(participant.id ?? '').trim(),
  userId: participant.userId ?? null,
  displayName: displayNameForParticipant(participant),
  occurredAt: isoOrNull(occurredAt),
  sourceId: sourceId ? String(sourceId).trim() : null,
  delta: delta === null ? null : roundOne(nonNegative(delta)),
});

const participantRewardTotal = (participant) => nonNegative(participant.xpEarned) + nonNegative(participant.bonusXpEarned);
const hasRewardEarnedEvent = (participant) => (
  String(participant.status || '') === 'completed'
    && isoOrNull(participant.completedAt)
    && participantRewardTotal(participant) > 0
);

const makeSubmissionEvent = ({ type, submission, occurredAt }) => ({
  type,
  label: EVENT_LABELS[type] ?? type,
  participantId: '',
  userId: submission.submittedByUserId ?? null,
  occurredAt: isoOrNull(occurredAt),
  sourceId: submission.id ? String(submission.id).trim() : null,
  delta: null,
});

const collectSubmissionEvents = (submissionRow) => {
  const submission = toPlainObject(submissionRow);
  const events = [];

  if (isoOrNull(submission.submittedAt)) {
    events.push(makeSubmissionEvent({ type: 'submission_flagged', submission, occurredAt: submission.submittedAt }));
  }

  if (isoOrNull(submission.reviewedAt)) {
    events.push(makeSubmissionEvent({ type: 'moderation_action_taken', submission, occurredAt: submission.reviewedAt }));
  }

  return events.filter((event) => event.occurredAt);
};
const collectParticipantEvents = (participant) => {
  const events = [];

  if (isoOrNull(participant.joinedAt)) {
    events.push(makeEvent({ type: 'challenge_joined', participant, occurredAt: participant.joinedAt }));
  }

  if (isoOrNull(participant.startedAt)) {
    events.push(makeEvent({ type: 'challenge_started', participant, occurredAt: participant.startedAt }));
  }

  const progressHistory = getJsonArray(participant.progressHistory);
  const challengeLeftEvents = progressHistory.filter(isChallengeLeftEvent);

  for (const entry of progressHistory.filter(isWorkoutProgressEvent)) {
    events.push(makeEvent({
      type: 'progress_updated',
      participant,
      occurredAt: entry?.occurredAt,
      sourceId: entry?.sourceId,
      delta: entry?.delta,
    }));
  }

  for (const entry of challengeLeftEvents) {
    events.push(makeEvent({
      type: challengeLeftEventTypeFor(participant, entry),
      participant,
      occurredAt: entry?.occurredAt,
      sourceId: entry?.sourceId,
    }));
  }

  if (String(participant.status || '') === 'completed' && isoOrNull(participant.completedAt)) {
    events.push(makeEvent({ type: 'challenge_completed', participant, occurredAt: participant.completedAt }));
    if (hasRewardEarnedEvent(participant)) {
      events.push(makeEvent({ type: 'reward_earned', participant, occurredAt: participant.completedAt, delta: participantRewardTotal(participant) }));
    }
  }

  if (challengeLeftEvents.length === 0 && DROPPED_STATUSES.has(String(participant.status || '')) && isoOrNull(participant.updatedAt || participant.lastProgressUpdate)) {
    events.push(makeEvent({
      type: 'challenge_dropped',
      participant,
      occurredAt: participant.updatedAt || participant.lastProgressUpdate,
    }));
  }

  return events.filter((event) => event.occurredAt);
};

const sortLifecycleEvents = (events) => events.sort((a, b) => {
  const timeDelta = parseTime(b.occurredAt) - parseTime(a.occurredAt);
  if (timeDelta !== 0) return timeDelta;
  return (EVENT_ORDER[a.type] ?? 99) - (EVENT_ORDER[b.type] ?? 99);
});

const countEvents = (events, extraCounts = {}) => Object.keys(EVENT_LABELS).reduce((counts, type) => {
  counts[type] = Math.round(nonNegative(extraCounts[type])) + events.filter((event) => event.type === type).length;
  return counts;
}, {});

export const buildChallengeLifecycleAnalytics = ({ challenge = {}, participants = [], submissions = [] } = {}) => {
  const participantCount = participants.length;
  const activeParticipantCount = participants.filter((participant) => ACTIVE_STATUSES.has(String(participant.status || ''))).length;
  const completedParticipantCount = participants.filter((participant) => String(participant.status || '') === 'completed').length;
  const retainedParticipantCount = participants.filter((participant) => RETAINED_STATUSES.has(String(participant.status || ''))).length;
  const rewardedParticipants = participants.filter(hasRewardEarnedEvent);
  const maxParticipants = Math.max(0, toFiniteNumber(challenge.maxParticipants));
  const maxProgress = Math.max(1, nonNegative(challenge.maxProgress, 1));
  const midpointParticipantCount = participants.filter((participant) => progressPercentForParticipant(participant, maxProgress) >= 50).length;
  const needsAttentionParticipantCount = participants.filter((participant) => (
    ACTIVE_STATUSES.has(String(participant.status || ''))
      && progressPercentForParticipant(participant, maxProgress) < 50
  )).length;
  const teamCompletion = buildTeamCompletionStats(participants);
  const improvementStats = buildImprovementStats(participants);
  const lifecycleEvents = sortLifecycleEvents([
    ...participants.flatMap(collectParticipantEvents),
    ...submissions.flatMap(collectSubmissionEvents),
  ]);
  const workoutEntries = collectWorkoutEntries(participants);
  const viewCount = Math.round(nonNegative(challenge.viewCount));

  return {
    analytics: {
      viewCount,
      enrollmentConversionRate: viewCount > 0 ? Math.min(100, percent(participantCount, viewCount)) : 0,
      participationRate: maxParticipants > 0 ? percent(participantCount, maxParticipants) : 0,
      activeParticipantRate: percent(activeParticipantCount, participantCount),
      completedParticipantCount,
      completionRate: percent(completedParticipantCount, participantCount),
      ...teamCompletion,
      retentionRate: percent(retainedParticipantCount, participantCount),
      midpointParticipantCount,
      midpointRetentionRate: percent(midpointParticipantCount, participantCount),
      needsAttentionParticipantCount,
      ...improvementStats,
      rewardedParticipantCount: rewardedParticipants.length,
      totalRewardXp: roundOne(rewardedParticipants
        .reduce((sum, participant) => sum + participantRewardTotal(participant), 0)),
      challengeDerivedCompletedSessions: workoutEntries.length,
      challengeDerivedActiveMinutes: roundOne(workoutEntries.reduce((sum, entry) => sum + activeMinutesForEntry(entry), 0)),
      challengeDerivedExercisesCompleted: roundOne(workoutEntries.reduce((sum, entry) => sum + exercisesCompletedForEntry(entry), 0)),
      challengeDerivedPersonalRecordCount: Math.round(workoutEntries.reduce((sum, entry) => sum + personalRecordCountForEntry(entry), 0)),
      eventCounts: countEvents(lifecycleEvents, { challenge_viewed: viewCount }),
    },
    lifecycleEvents: lifecycleEvents.slice(0, RECENT_LIFECYCLE_EVENT_LIMIT),
  };
};
