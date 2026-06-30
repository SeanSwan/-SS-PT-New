/**
 * Challenge results funnel metrics.
 * Separates aggregate impressions from participant lifecycle activity so
 * admin/trainer result review does not double-count challenge views.
 */

import React from 'react';
import { Activity } from 'lucide-react';
import type { ChallengeLifecycleAnalytics, ChallengeLifecycleEvent } from './useChallengeResults';
import * as S from './ChallengeCommandWorkspace.styles';

interface ChallengeResultsFunnelProps {
  challengeTitle: string;
  analytics: ChallengeLifecycleAnalytics;
  lifecycleEvents?: ChallengeLifecycleEvent[];
}

const toNumber = (value: number | string | null | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundedCount = (value: number | string | null | undefined): number => Math.round(Math.max(0, toNumber(value)));
const clampPercent = (value: number): number => Math.min(100, Math.max(0, Math.round(value)));
const formatPercent = (value: number | string | null | undefined): string => `${clampPercent(toNumber(value))}%`;
const formatDecimal = (value: number | string | null | undefined): string => String(Math.max(0, Math.round(toNumber(value) * 10) / 10));
const GOVERNANCE_EVENT_TYPES = new Set(['submission_flagged', 'moderation_action_taken']);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatEventDate = (value: string | null): string | null => {
  const date = new Date(value ?? '');
  return Number.isFinite(date.getTime()) ? `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}` : null;
};
const formatEventDelta = (event: ChallengeLifecycleEvent): string | null => {
  if (!event.delta) return null;
  const deltaText = `+${event.delta}`;
  return event.type === 'reward_earned' ? `${deltaText} XP` : deltaText;
};
const eventText = (event: ChallengeLifecycleEvent): string => [
  event.label,
  event.displayName,
  formatEventDate(event.occurredAt),
  formatEventDelta(event),
].filter(Boolean).join(' ');

const eventCount = (analytics: ChallengeLifecycleAnalytics, type: string): number => (
  roundedCount(analytics.eventCounts?.[type])
);

const participantEventTotal = (analytics: ChallengeLifecycleAnalytics): number => Object.entries(analytics.eventCounts ?? {})
  .filter(([type]) => type !== 'challenge_viewed' && !GOVERNANCE_EVENT_TYPES.has(type))
  .reduce((sum, [, count]) => sum + roundedCount(count), 0);

const viewCountFor = (analytics: ChallengeLifecycleAnalytics): number => roundedCount(
  analytics.viewCount ?? analytics.eventCounts?.challenge_viewed,
);

const ChallengeResultsFunnel: React.FC<ChallengeResultsFunnelProps> = ({
  challengeTitle,
  analytics,
  lifecycleEvents = [],
}) => {
  const metrics = [
    { label: 'Views', value: String(viewCountFor(analytics)) },
    { label: 'Joins', value: String(eventCount(analytics, 'challenge_joined')) },
    { label: 'View-to-Join', value: formatPercent(analytics.enrollmentConversionRate) },
    { label: 'Participation Rate', value: formatPercent(analytics.participationRate) },
    { label: 'Active Rate', value: formatPercent(analytics.activeParticipantRate) },
    { label: 'Completion Rate', value: formatPercent(analytics.completionRate) },
    { label: 'Team Completion', value: formatPercent(analytics.teamCompletionRate) },
    { label: 'Midpoint Retention', value: formatPercent(analytics.midpointRetentionRate) },
    { label: 'Needs Attention', value: String(roundedCount(analytics.needsAttentionParticipantCount)) },
    { label: 'Improved', value: String(roundedCount(analytics.improvedParticipantCount)) },
    { label: 'Avg Lift', value: formatDecimal(analytics.averageProgressDelta) },
    { label: 'Starts', value: String(eventCount(analytics, 'challenge_started')) },
    { label: 'Completions', value: String(eventCount(analytics, 'challenge_completed')) },
    { label: 'Declines', value: String(eventCount(analytics, 'challenge_declined')) },
    { label: 'Drops', value: String(eventCount(analytics, 'challenge_dropped')) },
    { label: 'Participant Events', value: String(participantEventTotal(analytics)) },
    { label: 'Submissions Flagged', value: String(eventCount(analytics, 'submission_flagged')) },
    { label: 'Moderation Actions', value: String(eventCount(analytics, 'moderation_action_taken')) },
    { label: 'Challenge Minutes', value: String(roundedCount(analytics.challengeDerivedActiveMinutes)) },
    { label: 'Challenge Exercises', value: String(roundedCount(analytics.challengeDerivedExercisesCompleted)) },
    { label: 'Challenge PRs', value: String(roundedCount(analytics.challengeDerivedPersonalRecordCount)) },
    { label: 'Retention Rate', value: formatPercent(analytics.retentionRate) },
    { label: 'Rewards Earned', value: String(roundedCount(analytics.rewardedParticipantCount)) },
    { label: 'Reward XP', value: String(roundedCount(analytics.totalRewardXp)) },
  ];

  return (
    <section aria-label={`${challengeTitle} challenge funnel analytics`}>
      <S.ChallengeFactGrid>
        {metrics.map((metric) => (
          <S.ChallengeFact key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </S.ChallengeFact>
        ))}
      </S.ChallengeFactGrid>
      <S.BadgeRow aria-label={`${challengeTitle} recent lifecycle events`}>
        {lifecycleEvents.length > 0 ? lifecycleEvents.slice(0, 4).map((event, index) => (
          <S.Badge key={`${event.type}-${event.participantId}-${event.occurredAt ?? index}`}>
            <Activity size={14} aria-hidden="true" />
            {eventText(event)}
          </S.Badge>
        )) : (
          <S.Badge><Activity size={14} aria-hidden="true" />Participant lifecycle rows pending</S.Badge>
        )}
      </S.BadgeRow>
    </section>
  );
};

export default ChallengeResultsFunnel;
