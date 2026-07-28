/**
 * Challenge result rule insights.
 * Converts persisted workout-event evidence into trainer/admin rule-impact signals.
 */

import { challengeRequiresAssignedSessionEvidence } from './challengeProgressRuleService.mjs';

const WORKOUT_EVENT_TYPE = 'workout_completed';

const getJsonArray = (value) => (Array.isArray(value) ? [...value] : []);
const roundOne = (value) => Math.round(Number(value || 0) * 10) / 10;
const isTrue = (value) => value === true || String(value).trim().toLowerCase() === 'true';
const plural = (count, singular, pluralLabel = singular + 's') => `${count} ${count === 1 ? singular : pluralLabel}`;

const isWorkoutProgressEvent = (entry) =>
  String(entry?.sourceType || entry?.source || '').trim() === WORKOUT_EVENT_TYPE;

const isAssignedSessionEvent = (entry) =>
  isTrue(entry?.assignedSession) || isTrue(entry?.isAssignedSession);

const collectWorkoutEvents = (participants = []) => {
  const events = [];

  for (const participant of getJsonArray(participants)) {
    const participantId = String(participant?.id ?? '').trim();
    for (const entry of getJsonArray(participant?.progressHistory).filter(isWorkoutProgressEvent)) {
      events.push({ entry, participantId });
    }
  }

  return events;
};

const verdictForAssignedRule = ({ ruleRequired, totalEvents, offRuleEvents, matchingEvents }) => {
  if (totalEvents === 0) return 'not_enough_data';
  if (ruleRequired && offRuleEvents > 0) return 'hurting';
  if (matchingEvents > 0) return 'helping';
  return 'not_enough_data';
};

const summaryForAssignedRule = ({ totalEvents, matchingEvents, ruleRequired }) => {
  if (totalEvents === 0) {
    return ruleRequired
      ? 'Assigned-session rule has no workout-event evidence yet.'
      : 'No assigned-session workout evidence yet.';
  }

  return `${matchingEvents} of ${plural(totalEvents, 'workout event')} came from assigned sessions.`;
};

const recommendationForAssignedRule = ({ verdict, ruleRequired }) => {
  if (verdict === 'helping') return 'Keep nudging trainer-assigned sessions; the current evidence supports this rule.';
  if (verdict === 'hurting') return 'Review challenge setup or workout assignment mapping before using this rule for coaching decisions.';
  return ruleRequired
    ? 'Wait for workout-log evidence before judging this assigned-session rule.'
    : 'Assigned-session impact is not measurable yet for this challenge.';
};

export const buildChallengeResultRuleInsights = ({ challenge = {}, participants = [] } = {}) => {
  const workoutEvents = collectWorkoutEvents(participants);
  const ruleRequired = challengeRequiresAssignedSessionEvidence(challenge);
  const assignedEvents = workoutEvents.filter(({ entry }) => isAssignedSessionEvent(entry));

  if (!ruleRequired && assignedEvents.length === 0) return [];

  const totalWorkoutEvents = workoutEvents.length;
  const matchingWorkoutEvents = assignedEvents.length;
  const offRuleWorkoutEvents = Math.max(0, totalWorkoutEvents - matchingWorkoutEvents);
  const participantIds = new Set(workoutEvents.map(({ participantId }) => participantId).filter(Boolean));
  const matchingParticipantIds = new Set(assignedEvents.map(({ participantId }) => participantId).filter(Boolean));
  const offRuleParticipantIds = new Set(workoutEvents
    .filter(({ entry }) => !isAssignedSessionEvent(entry))
    .map(({ participantId }) => participantId)
    .filter(Boolean));
  const verdict = verdictForAssignedRule({
    ruleRequired,
    totalEvents: totalWorkoutEvents,
    offRuleEvents: offRuleWorkoutEvents,
    matchingEvents: matchingWorkoutEvents,
  });

  return [{
    id: 'assigned-session-rule',
    label: ruleRequired ? 'Assigned sessions only' : 'Assigned session lift',
    ruleRequired,
    verdict,
    totalWorkoutEvents,
    matchingWorkoutEvents,
    offRuleWorkoutEvents,
    participantCount: participantIds.size,
    matchingParticipantCount: matchingParticipantIds.size,
    offRuleParticipantCount: offRuleParticipantIds.size,
    evidenceRate: totalWorkoutEvents > 0 ? roundOne((matchingWorkoutEvents / totalWorkoutEvents) * 100) : 0,
    summary: summaryForAssignedRule({ totalEvents: totalWorkoutEvents, matchingEvents: matchingWorkoutEvents, ruleRequired }),
    recommendation: recommendationForAssignedRule({ verdict, ruleRequired }),
  }];
};