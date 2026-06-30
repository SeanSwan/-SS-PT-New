import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChallengeResultsPanel from './ChallengeResultsPanel';
import type { ChallengeResultsState } from './useChallengeResults';
import type { ManagedChallenge } from './useManagedChallenges';

const challenge: ManagedChallenge = {
  id: 'challenge-1',
  title: 'July Squad Spark',
  description: 'Complete assigned sessions together.',
  challengeType: 'weekly',
  category: 'fitness',
  difficulty: 3,
  xpReward: 120,
  maxProgress: 3,
  progressUnit: 'sessions',
  startDate: '2026-07-01T00:00:00.000Z',
  endDate: '2026-07-31T23:59:59.000Z',
  status: 'active',
  currentParticipants: 2,
  completionRate: 50,
};

const resultState: ChallengeResultsState = {
  selectedChallengeId: 'challenge-1',
  loading: false,
  error: null,
  reload: vi.fn(() => Promise.resolve()),
  selectChallenge: vi.fn(),
  result: {
    success: true,
    challenge: { id: 'challenge-1', title: 'July Squad Spark', status: 'active', progressUnit: 'sessions', viewCount: 5 },
    summary: {
      participantCount: 2,
      activeParticipantCount: 2,
      completedParticipantCount: 0,
      droppedParticipantCount: 0,
      completionRate: 0,
      averageProgressPercentage: 33.3,
      totalCurrentProgress: 2,
      checkInsCount: 2,
      daysLeft: 20,
      maxProgress: 3,
      progressUnit: 'sessions',
      statusBreakdown: { active: 2 },
    },
    topParticipants: [],
    ruleInsights: [{
      id: 'assigned-session-rule',
      label: 'Assigned sessions only',
      ruleRequired: true,
      verdict: 'hurting',
      totalWorkoutEvents: 2,
      matchingWorkoutEvents: 1,
      offRuleWorkoutEvents: 1,
      participantCount: 2,
      matchingParticipantCount: 1,
      offRuleParticipantCount: 1,
      evidenceRate: 50,
      summary: '1 of 2 workout events came from assigned sessions.',
      recommendation: 'Review challenge setup or workout assignment mapping before using this rule for coaching decisions.',
    }],
    workoutImpact: {
      completedWorkoutEvents: 2,
      challengeDerivedActiveMinutes: 0,
      challengeDerivedExercisesCompleted: 0,
      challengeDerivedPersonalRecordCount: 0,
      totalDelta: 2,
      latestWorkoutImpact: null,
    },
  } as ChallengeResultsState['result'],
};

describe('ChallengeResults rule impact signals', () => {
  it('renders assigned-session rule helped or hurt evidence in the focused result', () => {
    render(
      <ChallengeResultsPanel
        challenges={[challenge]}
        loading={false}
        error={null}
        reload={vi.fn(() => Promise.resolve())}
        resultState={resultState}
      />,
    );

    const signals = screen.getByLabelText('July Squad Spark rule impact signals');
    expect(within(signals).getByText('Assigned sessions only')).toBeTruthy();
    expect(within(signals).getByText('Hurting')).toBeTruthy();
    expect(within(signals).getByText('1 of 2 workout events came from assigned sessions.')).toBeTruthy();
    expect(within(signals).getByText('50% evidence')).toBeTruthy();
    expect(within(signals).getByText('1 off-rule')).toBeTruthy();
  });
});