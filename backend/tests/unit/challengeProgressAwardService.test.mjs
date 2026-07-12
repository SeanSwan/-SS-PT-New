import { describe, expect, it } from 'vitest';
import { calculateChallengeProgressAward } from '../../services/gamification/challengeProgressAwardService.mjs';

describe('challenge progress award calculation', () => {
  const challenge = { goal: 10, pointsPerUnit: 3, bonusPoints: 20 };

  it('awards only the delta between prior and new cumulative challenge points', () => {
    expect(calculateChallengeProgressAward({
      currentProgress: 2,
      priorPointsEarned: 6,
      requestedProgress: 3,
      overwrite: false,
      challenge,
    })).toEqual({
      newProgress: 5,
      cumulativePoints: 15,
      pointsToAward: 9,
      justCompleted: false,
    });
  });

  it('does not create farmable negative points when progress is overwritten downward', () => {
    expect(calculateChallengeProgressAward({
      currentProgress: 8,
      priorPointsEarned: 24,
      requestedProgress: 2,
      overwrite: true,
      challenge,
    })).toEqual({
      newProgress: 2,
      cumulativePoints: 24,
      pointsToAward: 0,
      justCompleted: false,
    });
  });

  it('awards the completion bonus once and caps progress at the goal', () => {
    expect(calculateChallengeProgressAward({
      currentProgress: 8,
      priorPointsEarned: 24,
      requestedProgress: 99,
      overwrite: false,
      challenge,
    })).toEqual({
      newProgress: 10,
      cumulativePoints: 50,
      pointsToAward: 26,
      justCompleted: true,
    });
  });

  it('caps total legacy challenge awards at the canonical single-award ceiling', () => {
    expect(calculateChallengeProgressAward({
      currentProgress: 0,
      priorPointsEarned: 0,
      requestedProgress: 100000,
      overwrite: true,
      challenge: { goal: 100000, pointsPerUnit: 10000, bonusPoints: 50000 },
    })).toMatchObject({
      cumulativePoints: 500,
      pointsToAward: 500,
      justCompleted: true,
    });
  });
  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 'oops'])(
    'rejects invalid requested progress %s',
    (requestedProgress) => {
      expect(() => calculateChallengeProgressAward({
        currentProgress: 0,
        priorPointsEarned: 0,
        requestedProgress,
        overwrite: false,
        challenge,
      })).toThrow('Progress must be a finite non-negative number');
    },
  );
});
