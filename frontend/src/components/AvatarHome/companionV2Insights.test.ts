import { describe, expect, it } from 'vitest';
import {
  clampCompanionPercent,
  getCompanionBondPercent,
  getCompanionV2Insight,
} from './companionV2Insights';

describe('companionV2Insights', () => {
  it('clamps companion percentages into a display-safe range', () => {
    expect(clampCompanionPercent(-10)).toBe(0);
    expect(clampCompanionPercent(42.4)).toBe(42);
    expect(clampCompanionPercent(140)).toBe(100);
    expect(clampCompanionPercent(Number.NaN)).toBe(0);
  });

  it('derives bond from stage, wellbeing, and interaction history', () => {
    expect(getCompanionBondPercent({ stage: 0, health: 0, happiness: 0, moodLabel: 'content' })).toBe(0);
    expect(getCompanionBondPercent({ stage: 5, health: 100, happiness: 100, moodLabel: 'happy', totalInteractions: 99 })).toBe(100);
    expect(getCompanionBondPercent({ stage: 2, health: 80, happiness: 60, moodLabel: 'content', totalInteractions: 4 })).toBeGreaterThan(40);
  });

  it('prioritizes recovery when vitality is low', () => {
    const insight = getCompanionV2Insight({ stage: 3, health: 22, happiness: 90, moodLabel: 'happy' });
    expect(insight.title).toBe('Recovery rhythm');
    expect(insight.nextActionLabel).toBe('Choose recovery');
  });

  it('surfaces momentum when the companion is happy and healthy', () => {
    const insight = getCompanionV2Insight({ stage: 4, health: 92, happiness: 88, moodLabel: 'ecstatic' });
    expect(insight.title).toBe('Momentum is glowing');
    expect(insight.nextActionLabel).toBe('Keep momentum');
  });
});
