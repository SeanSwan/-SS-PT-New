import { describe, expect, it } from 'vitest';
import {
  normalizeChallengeForDashboard,
  normalizeChallengeRecords,
} from './useChallenges';

describe('useChallenges normalization', () => {
  it('merges authenticated participation progress into public challenge cards', () => {
    const challenge = normalizeChallengeForDashboard({
      id: 'challenge-1',
      title: 'Session Streak',
      description: 'Complete your planned sessions this week',
      category: 'streak',
      status: 'active',
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2099-06-30T00:00:00.000Z',
      currentParticipants: 8,
      maxProgress: 12,
      progressUnit: 'sessions',
      xpReward: 150,
      bonusXpReward: 25,
    }, {
      id: 'participant-1',
      challengeId: 'challenge-1',
      status: 'active',
      currentProgress: 5,
      progressPercentage: 42,
      checkInsCount: 3,
      joinedAt: '2026-06-02T00:00:00.000Z',
      lastProgressUpdate: '2026-06-20T12:00:00.000Z',
    });

    expect(challenge).toMatchObject({
      id: 'challenge-1',
      category: 'consistency',
      joined: true,
      progress: 42,
      currentProgress: 5,
      maxProgress: 12,
      progressUnit: 'sessions',
      progressLabel: '5 of 12 sessions',
      targetLabel: '12 sessions target',
      participantStatus: 'active',
      reward: '150 XP + 25 bonus XP',
      checkInsCount: 3,
    });
  });

  it('prefers backend dashboard summaries for joined progress and workout impact', () => {
    const challenge = normalizeChallengeForDashboard({
      id: 'challenge-1',
      title: 'Three Planned Sessions',
      description: 'Complete three planned sessions',
      category: 'streak',
      status: 'active',
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2099-06-30T00:00:00.000Z',
      currentParticipants: 4,
      maxProgress: 3,
      progressUnit: 'sessions',
    }, {
      id: 'participant-1',
      challengeId: 'challenge-1',
      status: 'active',
      currentProgress: 1,
      progressPercentage: 33,
      dashboardSummary: {
        currentProgress: 2,
        maxProgress: 5,
        progressPercentage: 40,
        progressUnit: 'sessions',
        progressLabel: '2 of 5 sessions',
        nextAction: 'Complete your next planned workout',
        lastWorkoutImpact: {
          sourceId: 'workout-session:99',
          occurredAt: '2026-06-29T15:30:00.000Z',
          progressUnit: 'sessions',
          delta: 1,
          previousProgress: 1,
          currentProgress: 2,
        },
      },
    });

    expect(challenge).toMatchObject({
      joined: true,
      progress: 40,
      currentProgress: 2,
      maxProgress: 5,
      progressUnit: 'sessions',
      progressLabel: '2 of 5 sessions',
      nextAction: 'Complete your next planned workout',
      lastWorkoutImpact: {
        sourceId: 'workout-session:99',
        occurredAt: '2026-06-29T15:30:00.000Z',
        progressUnit: 'sessions',
        delta: 1,
        previousProgress: 1,
        currentProgress: 2,
      },
    });
  });
  it('keeps user-only joined challenges visible when the public list omits them', () => {
    const records = normalizeChallengeRecords([], [{
      id: 'participant-2',
      challengeId: 'private-challenge',
      status: 'joined',
      currentProgress: 2,
      progressPercentage: 20,
      challenge: {
        id: 'private-challenge',
        title: 'Trainer Team Push',
        description: 'Assigned by your trainer',
        category: 'social',
        status: 'active',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2099-06-30T00:00:00.000Z',
        currentParticipants: 4,
        maxProgress: 10,
        progressUnit: 'workouts',
      },
    }]);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: 'private-challenge',
      title: 'Trainer Team Push',
      joined: true,
      progressLabel: '2 of 10 workouts',
    });
  });

  it('preserves backend nutrition challenge category instead of relabeling it as cardio', () => {
    const challenge = normalizeChallengeForDashboard({
      id: 'nutrition-challenge',
      title: 'Protein Consistency',
      description: 'Hit the planned protein target this week',
      category: 'nutrition',
      status: 'active',
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2099-06-30T00:00:00.000Z',
      currentParticipants: 5,
      maxProgress: 7,
      progressUnit: 'days',
    });

    expect(challenge.category).toBe('nutrition');
  });
  it('maps legacy mindfulness challenge records to consistency without rendering the forbidden label', () => {
    const challenge = normalizeChallengeForDashboard({
      id: 'legacy-flexibility-challenge',
      title: 'Daily Flexibility Reset',
      description: 'Complete the planned flexibility reset',
      category: 'mindfulness',
      status: 'active',
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2099-06-30T00:00:00.000Z',
      currentParticipants: 3,
      maxProgress: 5,
      progressUnit: 'days',
    });

    expect(challenge.category).toBe('consistency');
  });
});
