import { describe, expect, it } from 'vitest';
import {
  buildRewardsViewModel,
  clampPercent,
  calculateNextLevelTarget,
  formatNumber,
  formatTransactionPoints,
  toFiniteNumber,
} from './ClientRewardsPage.logic';

describe('ClientRewardsPage display-number helpers', () => {
  it('rejects array, object, and non-decimal numeric tokens before rendering XP truth', () => {
    expect(toFiniteNumber([500], 0)).toBe(0);
    expect(toFiniteNumber({ valueOf: () => 500 }, 0)).toBe(0);
    expect(toFiniteNumber('0x10', 0)).toBe(0);
    expect(toFiniteNumber('1e2', 0)).toBe(0);

    expect(formatNumber([500])).toBe('0');
    expect(clampPercent({ valueOf: () => 88 })).toBe(0);
    expect(calculateNextLevelTarget(5, 2500, '0x1000')).toBe(3600);
    expect(formatTransactionPoints({ transactionType: 'earn', points: [30] as unknown as number })).toBe('0 XP');
  });

  it('keeps valid primitive decimal numbers compatible with the rewards view model', () => {
    const view = buildRewardsViewModel({
      points: '2500',
      level: '5',
      streakDays: '7',
      totalWorkouts: '18',
      leaderboardPosition: '3',
      nextLevelProgress: '65',
      nextLevelPoints: '3000',
    });

    expect(view.pointsLabel).toBe('2,500 XP');
    expect(view.streakLabel).toBe('7-day streak');
    expect(view.workoutLabel).toBe('18 workouts');
    expect(view.leaderboardLabel).toBe('#3');
    expect(view.progress).toBe(65);
    expect(view.tier.name).toBe('First Flight');
    expect(view.tier.shortName).toBe('Lv 1-10');
  });

  it('uses the 100-rank Swan ladder for higher client levels', () => {
    const view = buildRewardsViewModel({ level: 105, points: 1102500 });

    expect(view.tier.name).toBe('Riverwing');
    expect(view.tier.shortName).toBe('Lv 101-110');
  });
});
