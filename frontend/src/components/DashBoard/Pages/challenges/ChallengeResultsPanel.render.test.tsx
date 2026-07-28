import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChallengeResultsPanel from './ChallengeResultsPanel';
import type { ChallengeResultsState } from './useChallengeResults';
import type { ManagedChallenge } from './useManagedChallenges';

const makeChallenge = (overrides: Partial<ManagedChallenge>): ManagedChallenge => ({
  id: 'challenge-1',
  title: 'July Squad Spark',
  description: 'Trainer-created draft challenge.',
  challengeType: 'community',
  category: 'community_meetup',
  difficulty: 3,
  xpReward: 140,
  maxProgress: 12,
  progressUnit: 'sessions',
  startDate: '2026-07-06T12:00:00.000Z',
  endDate: '2026-07-13T12:00:00.000Z',
  status: 'draft',
  currentParticipants: 4,
  maxParticipants: 16,
  completionRate: 50,
  participants: [
    {
      id: 'participant-1',
      userId: '11',
      currentProgress: 12,
      progressPercentage: 100,
      status: 'completed',
      joinedAt: '2026-07-06T12:00:00.000Z',
      user: { id: '11', firstName: 'Avery', lastName: 'Stone' },
    },
    {
      id: 'participant-2',
      userId: '12',
      currentProgress: 6,
      progressPercentage: 50,
      status: 'active',
      joinedAt: '2026-07-06T12:00:00.000Z',
      user: { id: '12', firstName: 'Mika', lastName: 'Rivera' },
    },
  ],
  ...overrides,
});

const activeChallenge = makeChallenge({
  id: 'challenge-2',
  title: 'Active Sprint Surge',
  status: 'active',
  currentParticipants: 3,
  completionRate: 67,
  participants: [
    {
      id: 'participant-3',
      userId: '13',
      currentProgress: 8,
      progressPercentage: 80,
      status: 'active',
      joinedAt: '2026-07-07T12:00:00.000Z',
      user: { id: '13', firstName: 'Noah', lastName: 'Vale' },
    },
  ],
});

const renderResults = (
  challenges: ManagedChallenge[] = [makeChallenge({}), activeChallenge],
  resultState?: ChallengeResultsState,
) => render(
  <ChallengeResultsPanel
    challenges={challenges}
    loading={false}
    error={null}
    reload={vi.fn(() => Promise.resolve())}
    resultState={resultState}
  />,
);

describe('ChallengeResultsPanel', () => {
  it('filters result snapshots by campaign status and updates summary totals', () => {
    renderResults();

    const summary = screen.getByLabelText('Challenge result summary');
    expect(within(summary).getByText('Campaigns').parentElement?.textContent).toBe('Campaigns2');
    expect(screen.getByText('July Squad Spark')).toBeTruthy();
    expect(screen.getByText('Active Sprint Surge')).toBeTruthy();
    expect(screen.getByText('Live Results')).toBeTruthy();
    expect(screen.queryByText('Active Results')).toBeNull();

    const activeFilter = screen.getByRole('button', { name: /Live 1/i });
    fireEvent.click(activeFilter);

    expect(activeFilter.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText('July Squad Spark')).toBeNull();
    expect(screen.getByText('Active Sprint Surge')).toBeTruthy();
    expect(within(summary).getByText('Campaigns').parentElement?.textContent).toBe('Campaigns1');
    expect(within(summary).getByText('Participants').parentElement?.textContent).toBe('Participants3');

    fireEvent.click(screen.getByRole('button', { name: /All 2/i }));
    expect(screen.getByText('July Squad Spark')).toBeTruthy();
    expect(screen.getByText('Active Sprint Surge')).toBeTruthy();
  });

  it('falls back to all snapshots when the selected status disappears after refresh', () => {
    const { rerender } = renderResults();

    fireEvent.click(screen.getByRole('button', { name: /Live 1/i }));
    expect(screen.queryByText('July Squad Spark')).toBeNull();

    rerender(
      <ChallengeResultsPanel
        challenges={[makeChallenge({})]}
        loading={false}
        error={null}
        reload={vi.fn(() => Promise.resolve())}
      />,
    );

    expect(screen.getByRole('button', { name: /All 1/i }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('July Squad Spark')).toBeTruthy();
  });

  it('renders focused endpoint-backed result details and selection controls', () => {
    const selectChallenge = vi.fn();
    const resultState: ChallengeResultsState = {
      selectedChallengeId: 'challenge-1',
      loading: false,
      error: null,
      reload: vi.fn(() => Promise.resolve()),
      selectChallenge,
      result: {
        challenge: {
          id: 'challenge-1',
          title: 'July Squad Spark',
          status: 'active',
          progressUnit: 'sessions',
          viewCount: 12,
        },
        summary: {
          participantCount: 3,
          activeParticipantCount: 1,
          completedParticipantCount: 1,
          droppedParticipantCount: 1,
          completionRate: 33.3,
          averageProgressPercentage: 55.6,
          totalCurrentProgress: 20,
          checkInsCount: 7,
          daysLeft: 21,
          maxProgress: 12,
          progressUnit: 'sessions',
          statusBreakdown: { active: 1, completed: 1, quit: 1 },
        },
        topParticipants: [
          {
            id: 'participant-1',
            userId: 11,
            displayName: 'Avery Stone',
            avatarUrl: null,
            status: 'completed',
            currentProgress: 12,
            progressPercentage: 100,
            progressDelta: 2,
            score: 120,
            rank: null,
            xpEarned: 250,
            checkInsCount: 4,
            joinedAt: '2026-07-01T00:00:00.000Z',
            completedAt: '2026-07-09T12:00:00.000Z',
            lastProgressUpdate: '2026-07-09T12:00:00.000Z',
          },
        ],
        topImprovers: [
          {
            id: 'participant-2',
            userId: 12,
            displayName: 'Blair Reed',
            avatarUrl: null,
            status: 'active',
            currentProgress: 6,
            progressPercentage: 50,
            progressDelta: 2,
            score: 60,
            rank: null,
            xpEarned: 80,
            checkInsCount: 2,
            joinedAt: '2026-07-01T00:00:00.000Z',
            completedAt: null,
            lastProgressUpdate: '2026-07-10T12:00:00.000Z',
          },
        ],
        workoutImpact: {
          completedWorkoutEvents: 2,
          challengeDerivedActiveMinutes: 75,
          challengeDerivedExercisesCompleted: 12,
          challengeDerivedPersonalRecordCount: 1,
          totalDelta: 2,
          latestWorkoutImpact: {
            participantId: 'participant-1',
            userId: 11,
            sourceId: 'session-1',
            occurredAt: '2026-07-09T12:00:00.000Z',
            progressUnit: 'sessions',
            delta: 1,
            activeMinutes: 45,
            exercisesCompleted: 6,
            personalRecordCount: 1,
            assignedSession: true,
            previousProgress: 11,
            currentProgress: 12,
          },
        },
        analytics: {
          viewCount: 12,
          enrollmentConversionRate: 25,
          participationRate: 50,
          activeParticipantRate: 33.3,
          completedParticipantCount: 1,
          completionRate: 33.3,
          teamCount: 2,
          completedTeamCount: 1,
          teamCompletionRate: 50,
          retentionRate: 66.7,
          midpointParticipantCount: 2,
          midpointRetentionRate: 66.7,
          needsAttentionParticipantCount: 1,
          rewardedParticipantCount: 1,
          challengeDerivedCompletedSessions: 2,
          challengeDerivedActiveMinutes: 90,
          challengeDerivedExercisesCompleted: 11,
          challengeDerivedPersonalRecordCount: 1,
          eventCounts: {
            challenge_viewed: 12,
            challenge_joined: 3,
            challenge_started: 3,
            progress_updated: 2,
            challenge_completed: 1,
            challenge_dropped: 1,
            reward_earned: 1,
            challenge_declined: 2,
            submission_flagged: 1,
            moderation_action_taken: 1,
          },
        },
        lifecycleEvents: [
          { type: 'challenge_completed', participantId: 'participant-1', userId: 11, occurredAt: '2026-07-09T12:00:00.000Z', label: 'Challenge completed', sourceId: null, delta: null },
          { type: 'reward_earned', participantId: 'participant-1', userId: 11, occurredAt: '2026-07-09T12:00:00.000Z', label: 'Reward earned', sourceId: null, delta: 275 },
        ],
      },
    };

    renderResults(undefined, resultState);

    expect(screen.getByText('Focused Result')).toBeTruthy();
    expect(screen.getByText('Actual Participants')).toBeTruthy();
    expect(screen.getByText('Workout Events')).toBeTruthy();
    const focusedResult = screen.getByLabelText('Focused challenge result');
    expect(within(focusedResult).getByText('Active Minutes').parentElement?.textContent).toBe('Active Minutes75');
    expect(within(focusedResult).getByText('Exercises').parentElement?.textContent).toBe('Exercises12');
    expect(within(focusedResult).getByText('PR Count').parentElement?.textContent).toBe('PR Count1');
    const improvers = screen.getByLabelText('July Squad Spark most improved participants');
    expect(within(improvers).getByText('Most Improved')).toBeTruthy();
    expect(within(improvers).getByText('Blair Reed +2 sessions')).toBeTruthy();
    const impact = screen.getByLabelText('July Squad Spark workout impact');
    expect(within(impact).getByText('75 active minutes')).toBeTruthy();
    expect(within(impact).getByText('12 exercises')).toBeTruthy();
    expect(within(impact).getByText('1 PR')).toBeTruthy();
    expect(within(impact).getByText('Latest 45 active minutes')).toBeTruthy();
    expect(within(impact).getByText('Assigned session verified')).toBeTruthy();
    const funnel = screen.getByLabelText('July Squad Spark challenge funnel analytics');
    expect(within(funnel).getByText('Views').parentElement?.textContent).toBe('Views12');
    expect(within(funnel).getByText('Joins').parentElement?.textContent).toBe('Joins3');
    expect(within(funnel).getByText('View-to-Join').parentElement?.textContent).toBe('View-to-Join25%');
    expect(within(funnel).getByText('Participation Rate').parentElement?.textContent).toBe('Participation Rate50%');
    expect(within(funnel).getByText('Active Rate').parentElement?.textContent).toBe('Active Rate33%');
    expect(within(funnel).getByText('Completion Rate').parentElement?.textContent).toBe('Completion Rate33%');
    expect(within(funnel).getByText('Team Completion').parentElement?.textContent).toBe('Team Completion50%');
    expect(within(funnel).getByText('Midpoint Retention').parentElement?.textContent).toBe('Midpoint Retention67%');
    expect(within(funnel).getByText('Needs Attention').parentElement?.textContent).toBe('Needs Attention1');
    expect(within(funnel).getByText('Starts').parentElement?.textContent).toBe('Starts3');
    expect(within(funnel).getByText('Declines').parentElement?.textContent).toBe('Declines2');
    expect(within(funnel).getByText('Participant Events').parentElement?.textContent).toBe('Participant Events13');
    expect(within(funnel).getByText('Submissions Flagged').parentElement?.textContent).toBe('Submissions Flagged1');
    expect(within(funnel).getByText('Moderation Actions').parentElement?.textContent).toBe('Moderation Actions1');
    expect(within(funnel).getByText('Challenge Minutes').parentElement?.textContent).toBe('Challenge Minutes90');
    expect(within(funnel).getByText('Challenge Exercises').parentElement?.textContent).toBe('Challenge Exercises11');
    expect(within(funnel).getByText('Challenge PRs').parentElement?.textContent).toBe('Challenge PRs1');
    expect(within(funnel).queryByText('Lifecycle Events')).toBeNull();
    expect(within(funnel).getByText('Challenge completed Jul 9')).toBeTruthy();
    expect(within(funnel).getByText('Reward earned Jul 9 +275 XP')).toBeTruthy();
    const endpointLeaders = screen.getByLabelText('July Squad Spark endpoint participant leaders');
    expect(within(endpointLeaders).getByText('Avery Stone 100% +2 sessions')).toBeTruthy();

    const activeInspect = screen.getByRole('button', { name: /Inspect Active Sprint Surge/i });
    fireEvent.click(activeInspect);

    expect(selectChallenge).toHaveBeenCalledWith('challenge-2');
    expect(screen.getByRole('button', { name: /Inspect July Squad Spark/i }).getAttribute('aria-pressed')).toBe('true');
  });
});
