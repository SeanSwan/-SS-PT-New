/**
 * FILE: nutritionStreakMilestones.test.ts
 * PURPOSE: Locks the Phase 4C streak-milestone detection (CelebrationToast
 *          trigger) and the safe read of the additive currentLogStreak field.
 */
import { describe, expect, it } from 'vitest';
import type { MacroSummary } from '../../hooks/useMacroSummary';
import {
  STREAK_MILESTONES,
  detectStreakMilestone,
  nextStreakMilestone,
  readCurrentLogStreak,
  streakMilestoneMessage,
} from './nutritionStreakMilestones';

const summaryWith = (currentLogStreak: unknown) =>
  ({ currentLogStreak } as unknown as MacroSummary & { currentLogStreak?: unknown });

describe('nutritionStreakMilestones (4C)', () => {
  it('publishes the 3/7/30 milestone ladder', () => {
    expect([...STREAK_MILESTONES]).toEqual([3, 7, 30]);
  });

  it('detects a single milestone crossing', () => {
    expect(detectStreakMilestone(2, 3)).toBe(3);
    expect(detectStreakMilestone(6, 7)).toBe(7);
    expect(detectStreakMilestone(29, 30)).toBe(30);
  });

  it('picks the highest milestone when a jump crosses several', () => {
    expect(detectStreakMilestone(0, 3)).toBe(3);
    expect(detectStreakMilestone(2, 8)).toBe(7);
    expect(detectStreakMilestone(0, 45)).toBe(30);
  });

  it('never fires without an increase — ED-safe, no reset celebration', () => {
    expect(detectStreakMilestone(3, 3)).toBeNull();
    expect(detectStreakMilestone(7, 3)).toBeNull();
    expect(detectStreakMilestone(30, 0)).toBeNull();
    expect(detectStreakMilestone(4, 5)).toBeNull();
    expect(detectStreakMilestone(30, 31)).toBeNull();
    expect(detectStreakMilestone(Number.NaN, 3)).toBeNull();
  });

  it('reads the additive summary field defensively', () => {
    expect(readCurrentLogStreak(null)).toBe(0);
    expect(readCurrentLogStreak(undefined)).toBe(0);
    expect(readCurrentLogStreak(summaryWith(undefined))).toBe(0);
    expect(readCurrentLogStreak(summaryWith('5'))).toBe(0);
    expect(readCurrentLogStreak(summaryWith(-2))).toBe(0);
    expect(readCurrentLogStreak(summaryWith(Number.NaN))).toBe(0);
    expect(readCurrentLogStreak(summaryWith(4.7))).toBe(4);
    expect(readCurrentLogStreak(summaryWith(12))).toBe(12);
  });

  it('reports the next milestone for the StreakRing arc', () => {
    expect(nextStreakMilestone(0)).toBe(3);
    expect(nextStreakMilestone(3)).toBe(7);
    expect(nextStreakMilestone(12)).toBe(30);
    expect(nextStreakMilestone(30)).toBeNull();
  });

  it('has celebration copy for every milestone and a safe fallback', () => {
    STREAK_MILESTONES.forEach((milestone) => {
      const copy = streakMilestoneMessage(milestone);
      expect(copy.length).toBeGreaterThan(0);
      // ED-safe: celebration only — no loss/shame language.
      expect(copy.toLowerCase()).not.toMatch(/lost|broke|broken|fail|shame|behind/);
    });
    expect(streakMilestoneMessage(99)).toContain('99');
  });
});
