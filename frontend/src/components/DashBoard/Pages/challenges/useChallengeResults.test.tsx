import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManagedChallenge } from './useManagedChallenges';

const mocks = vi.hoisted(() => {
  const authGet = vi.fn();
  return {
    authGet,
    authAxios: { get: authGet },
  };
});

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mocks.authAxios }),
}));

import { useChallengeResults } from './useChallengeResults';

const makeChallenge = (id: string, title: string): ManagedChallenge => ({
  id,
  title,
  description: `${title} description`,
  challengeType: 'weekly',
  category: 'fitness',
  difficulty: 3,
  xpReward: 120,
  maxProgress: 12,
  progressUnit: 'sessions',
  startDate: '2026-07-01T00:00:00.000Z',
  endDate: '2026-07-31T23:59:59.000Z',
  status: 'active',
  currentParticipants: 3,
});

const resultPayload = (id: string) => ({
  data: {
    success: true,
    challenge: {
      id,
      title: id === 'challenge-2' ? 'Sprint Surge' : 'July Squad Spark',
      status: 'active',
      progressUnit: 'sessions',
      viewCount: 9,
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
    topParticipants: [],
    analytics: {
      viewCount: 9,
      enrollmentConversionRate: 33.3,
      participationRate: 25,
      activeParticipantRate: 33.3,
      retentionRate: 66.7,
      rewardedParticipantCount: 1,
      challengeDerivedCompletedSessions: 2,
      challengeDerivedActiveMinutes: 75,
      challengeDerivedExercisesCompleted: 12,
      challengeDerivedPersonalRecordCount: 1,
      eventCounts: { challenge_viewed: 9, challenge_joined: 3 },
    },
    workoutImpact: {
      completedWorkoutEvents: 2,
      challengeDerivedActiveMinutes: 75,
      challengeDerivedExercisesCompleted: 12,
      challengeDerivedPersonalRecordCount: 1,
      totalDelta: 2,
      latestWorkoutImpact: null,
    },
  },
});

describe('useChallengeResults', () => {
  beforeEach(() => {
    mocks.authGet.mockReset();
    mocks.authGet.mockImplementation((url: string) => {
      const id = url.includes('challenge-2') ? 'challenge-2' : 'challenge-1';
      return Promise.resolve(resultPayload(id));
    });
  });

  it('loads the first managed challenge results from the dedicated backend endpoint', async () => {
    const challenges = [makeChallenge('challenge-1', 'July Squad Spark')];

    const { result } = renderHook(() => useChallengeResults(challenges));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mocks.authGet).toHaveBeenCalledWith('/api/v1/gamification/challenges/challenge-1/results');
    expect(result.current.selectedChallengeId).toBe('challenge-1');
    expect(result.current.result?.summary.participantCount).toBe(3);
    expect(result.current.result?.challenge.viewCount).toBe(9);
    expect(result.current.result?.analytics?.enrollmentConversionRate).toBe(33.3);
    expect(result.current.result?.workoutImpact.challengeDerivedActiveMinutes).toBe(75);
  });

  it('switches focused campaign results when a trainer selects another challenge', async () => {
    const challenges = [
      makeChallenge('challenge-1', 'July Squad Spark'),
      makeChallenge('challenge-2', 'Sprint Surge'),
    ];

    const { result } = renderHook(() => useChallengeResults(challenges));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.selectChallenge('challenge-2');
    });

    await waitFor(() => expect(result.current.selectedChallengeId).toBe('challenge-2'));
    await waitFor(() => expect(result.current.result?.challenge.id).toBe('challenge-2'));
    expect(mocks.authGet).toHaveBeenLastCalledWith('/api/v1/gamification/challenges/challenge-2/results');
  });

  it('clears stale focused results while a newly selected campaign is loading', async () => {
    const challenges = [
      makeChallenge('challenge-1', 'July Squad Spark'),
      makeChallenge('challenge-2', 'Sprint Surge'),
    ];
    let resolveSecond: ((value: ReturnType<typeof resultPayload>) => void) | null = null;

    mocks.authGet.mockImplementation((url: string) => {
      if (url.includes('challenge-2')) {
        return new Promise((resolve) => {
          resolveSecond = resolve;
        });
      }
      return Promise.resolve(resultPayload('challenge-1'));
    });

    const { result } = renderHook(() => useChallengeResults(challenges));
    await waitFor(() => expect(result.current.result?.challenge.id).toBe('challenge-1'));

    await act(async () => {
      result.current.selectChallenge('challenge-2');
    });

    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(result.current.result).toBeNull();

    await act(async () => {
      resolveSecond?.(resultPayload('challenge-2'));
    });

    await waitFor(() => expect(result.current.result?.challenge.id).toBe('challenge-2'));
  });
  it('rejects malformed lifecycle event arrays before the results panel renders them', async () => {
    mocks.authGet.mockResolvedValue({
      data: {
        ...resultPayload('challenge-1').data,
        lifecycleEvents: 'challenge_joined',
      },
    });

    const { result } = renderHook(() => useChallengeResults([makeChallenge('challenge-1', 'July Squad Spark')]));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe('Unexpected challenge results response');
  });
  it('rejects malformed rule insight arrays before the results panel renders them', async () => {
    mocks.authGet.mockResolvedValue({
      data: {
        ...resultPayload('challenge-1').data,
        ruleInsights: 'assigned-session-rule',
      },
    });

    const { result } = renderHook(() => useChallengeResults([makeChallenge('challenge-1', 'July Squad Spark')]));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe('Unexpected challenge results response');
  });

  it('stays idle without calling the backend when no managed challenges exist', async () => {
    const { result } = renderHook(() => useChallengeResults([]));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mocks.authGet).not.toHaveBeenCalled();
    expect(result.current.selectedChallengeId).toBeNull();
    expect(result.current.result).toBeNull();
  });
});
