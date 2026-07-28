import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChallengeResultsFunnel from './ChallengeResultsFunnel';

const analytics = {
  viewCount: 10,
  enrollmentConversionRate: 30,
  participationRate: 50,
  activeParticipantRate: 33.3,
  completedParticipantCount: 1,
  completionRate: 33.3,
  teamCount: 0,
  completedTeamCount: 0,
  teamCompletionRate: 0,
  retentionRate: 66.7,
  midpointParticipantCount: 2,
  midpointRetentionRate: 66.7,
  needsAttentionParticipantCount: 1,
  rewardedParticipantCount: 1,
  totalRewardXp: 275,
  improvedParticipantCount: 2,
  averageProgressDelta: 1.5,
  challengeDerivedCompletedSessions: 2,
  challengeDerivedActiveMinutes: 90,
  challengeDerivedExercisesCompleted: 11,
  challengeDerivedPersonalRecordCount: 1,
  eventCounts: {
    challenge_viewed: 10,
    challenge_joined: 3,
    challenge_started: 2,
    progress_updated: 2,
    challenge_completed: 1,
    challenge_dropped: 1,
    challenge_declined: 0,
    reward_earned: 1,
    submission_flagged: 0,
    moderation_action_taken: 0,
  },
};

describe('ChallengeResultsFunnel', () => {
  it('surfaces aggregate participant improvement lift and named lifecycle events', () => {
    render(
      <ChallengeResultsFunnel
        challengeTitle="July Squad Spark"
        analytics={analytics}
        lifecycleEvents={[{
          type: 'challenge_joined',
          label: 'Challenge joined',
          participantId: 'p1',
          userId: 1,
          displayName: 'Client1 Training',
          occurredAt: '2026-07-10T12:00:00.000Z',
          sourceId: null,
          delta: null,
        }, {
          type: 'reward_earned',
          label: 'Reward earned',
          participantId: 'p1',
          userId: 1,
          displayName: 'Client1 Training',
          occurredAt: '2026-07-11T12:00:00.000Z',
          sourceId: null,
          delta: 275,
        }]}
      />,
    );

    const funnel = screen.getByLabelText('July Squad Spark challenge funnel analytics');
    const events = screen.getByLabelText('July Squad Spark recent lifecycle events');
    expect(within(funnel).getByText('Improved').parentElement?.textContent).toBe('Improved2');
    expect(within(funnel).getByText('Avg Lift').parentElement?.textContent).toBe('Avg Lift1.5');
    expect(within(funnel).getByText('Reward XP').parentElement?.textContent).toBe('Reward XP275');
    expect(within(events).getByText('Challenge joined Client1 Training Jul 10')).toBeTruthy();
    expect(within(events).getByText('Reward earned Client1 Training Jul 11 +275 XP')).toBeTruthy();
  });
});