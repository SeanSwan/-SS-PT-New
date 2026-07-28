/**
 * Regression coverage for staff-visible challenge needs-attention rows.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChallengeResultsPanel from './ChallengeResultsPanel';
import type { ChallengeResultsState } from './useChallengeResults';
import type { ManagedChallenge } from './useManagedChallenges';

const managedChallenge: ManagedChallenge = {
  id: 'challenge-1',
  title: 'July Squad Spark',
  description: 'Trainer-created challenge.',
  challengeType: 'community',
  category: 'fitness',
  difficulty: 3,
  xpReward: 140,
  maxProgress: 12,
  progressUnit: 'sessions',
  startDate: '2026-07-06T12:00:00.000Z',
  endDate: '2026-07-13T12:00:00.000Z',
  status: 'active',
  currentParticipants: 2,
  maxParticipants: 16,
  completionRate: 25,
  participants: [],
};

const resultState: ChallengeResultsState = {
  selectedChallengeId: 'challenge-1',
  loading: false,
  error: null,
  reload: vi.fn(() => Promise.resolve()),
  selectChallenge: vi.fn(),
  result: {
    success: true,
    challenge: {
      id: 'challenge-1',
      title: 'July Squad Spark',
      status: 'active',
      progressUnit: 'sessions',
      viewCount: 8,
    },
    summary: {
      participantCount: 2,
      activeParticipantCount: 2,
      completedParticipantCount: 0,
      droppedParticipantCount: 0,
      completionRate: 0,
      averageProgressPercentage: 35,
      totalCurrentProgress: 8,
      checkInsCount: 3,
      daysLeft: 12,
      maxProgress: 12,
      progressUnit: 'sessions',
      statusBreakdown: { active: 1, joined: 1 },
    },
    topParticipants: [],
    topImprovers: [],
    recentJoinedParticipants: [
      {
        id: 'participant-3',
        userId: 13,
        displayName: 'Blair Reed',
        avatarUrl: null,
        status: 'active',
        currentProgress: 3,
        progressPercentage: 25,
        progressDelta: 0,
        score: 30,
        rank: null,
        xpEarned: 25,
        checkInsCount: 1,
        joinedAt: '2026-07-10T12:00:00.000Z',
        completedAt: null,
        lastProgressUpdate: '2026-07-10T12:00:00.000Z',
      },
      {
        id: 'participant-4',
        userId: 14,
        displayName: 'Jordan Pike',
        avatarUrl: null,
        status: 'joined',
        currentProgress: 5,
        progressPercentage: 42,
        progressDelta: 0,
        score: 40,
        rank: null,
        xpEarned: 35,
        checkInsCount: 2,
        joinedAt: '2026-07-08T12:00:00.000Z',
        completedAt: null,
        lastProgressUpdate: '2026-07-08T12:00:00.000Z',
      },
    ],
    needsAttentionParticipants: [
      {
        id: 'participant-1',
        userId: 11,
        displayName: 'Blair Reed',
        avatarUrl: null,
        status: 'active',
        currentProgress: 3,
        progressPercentage: 25,
        progressDelta: 0,
        score: 30,
        rank: null,
        xpEarned: 25,
        checkInsCount: 1,
        joinedAt: '2026-07-01T00:00:00.000Z',
        completedAt: null,
        lastProgressUpdate: '2026-07-09T12:00:00.000Z',
      },
      {
        id: 'participant-2',
        userId: 12,
        displayName: 'Jordan Pike',
        avatarUrl: null,
        status: 'joined',
        currentProgress: 5,
        progressPercentage: 42,
        progressDelta: 0,
        score: 40,
        rank: null,
        xpEarned: 35,
        checkInsCount: 2,
        joinedAt: '2026-07-01T00:00:00.000Z',
        completedAt: null,
        lastProgressUpdate: '2026-07-10T12:00:00.000Z',
      },
    ],
    analytics: {
      viewCount: 8,
      enrollmentConversionRate: 25,
      participationRate: 50,
      activeParticipantRate: 100,
      completedParticipantCount: 0,
      completionRate: 0,
      teamCount: 0,
      completedTeamCount: 0,
      teamCompletionRate: 0,
      retentionRate: 100,
      midpointParticipantCount: 0,
      midpointRetentionRate: 0,
      needsAttentionParticipantCount: 2,
      rewardedParticipantCount: 0,
      eventCounts: { challenge_viewed: 8, challenge_joined: 2 },
    },
    lifecycleEvents: [],
    workoutImpact: {
      completedWorkoutEvents: 0,
      totalDelta: 0,
      latestWorkoutImpact: null,
    },
  },
};

describe('ChallengeResultsPanel needs-attention details', () => {
  it('renders named participants who need staff follow-up', () => {
    render(
      <ChallengeResultsPanel
        challenges={[managedChallenge]}
        loading={false}
        error={null}
        reload={vi.fn(() => Promise.resolve())}
        resultState={resultState}
      />,
    );

    const joinedRow = screen.getByLabelText('July Squad Spark recent joined participants');
    const attentionRow = screen.getByLabelText('July Squad Spark needs attention participants');

    expect(within(joinedRow).getByText('Recently Joined')).toBeTruthy();
    expect(within(joinedRow).getByText('Blair Reed Jul 10')).toBeTruthy();
    expect(within(joinedRow).getByText('Jordan Pike Jul 8')).toBeTruthy();
    expect(within(attentionRow).getByText('Needs Attention')).toBeTruthy();
    expect(within(attentionRow).getByText('Blair Reed 25%')).toBeTruthy();
    expect(within(attentionRow).getByText('Jordan Pike 42%')).toBeTruthy();
  });
});