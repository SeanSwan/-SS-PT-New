import { describe, expect, it } from 'vitest';
import { calculateLevel, getLevelProgress, getTier, pointsForLevel } from './gamification';

describe('frontend gamification level contract', () => {
  it('matches the backend Level 1 starting contract', () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(10)).toBe(1);
    expect(getTier(calculateLevel(0))).toBe('bronze_forge');
  });

  it('keeps the visible next-level progress non-negative for empty profiles', () => {
    const progress = getLevelProgress(0);

    expect(pointsForLevel(1)).toBe(0);
    expect(progress.level).toBe(1);
    expect(progress.pointsIntoLevel).toBe(0);
    expect(progress.pointsNeededForNext).toBe(400);
    expect(progress.progressPercent).toBe(0);
  });
});
