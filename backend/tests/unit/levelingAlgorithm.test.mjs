import { describe, expect, it } from 'vitest';
import {
  calculateLevel,
  getLevelProgress,
  getTier,
  pointsForLevel,
} from '../../utils/levelingAlgorithm.mjs';

describe('levelingAlgorithm authoritative contract', () => {
  it('starts SwanStudios users at Level 1 to match the User model default', () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(10)).toBe(1);
    expect(getTier(calculateLevel(0))).toBe('bronze_forge');
  });

  it('keeps the existing logarithmic thresholds above the starting level', () => {
    expect(pointsForLevel(1)).toBe(0);
    expect(calculateLevel(100)).toBe(1);
    expect(calculateLevel(400)).toBe(2);
  });

  it('builds non-negative progress for new users', () => {
    const progress = getLevelProgress(0);

    expect(progress.level).toBe(1);
    expect(progress.pointsIntoLevel).toBe(0);
    expect(progress.pointsNeededForNext).toBe(400);
    expect(progress.progressPercent).toBe(0);
    expect(progress.nextLevelAt).toBe(400);
  });
});
