/**
 * TEST: progressProofSummary
 * PURPOSE: Locks truthful proof levels and share-safe chart summary copy.
 */

import { describe, expect, it } from 'vitest';
import { isProgressChartVisible } from './progressChartLens';
import {
  buildProgressProofSocialDraft,
  buildProgressProofSummary,
} from './progressProofSummary';

describe('progressProofSummary', () => {
  it('derives gamified proof levels from populated real chart count', () => {
    expect(buildProgressProofSummary({ nonEmptyChartCount: 0 }).proofLevel).toBe('Locked');
    expect(buildProgressProofSummary({ nonEmptyChartCount: 1 }).proofLevel).toBe('Spark');
    expect(buildProgressProofSummary({ nonEmptyChartCount: 4 }).proofLevel).toBe('Momentum');
    expect(buildProgressProofSummary({ nonEmptyChartCount: 8 }).proofLevel).toBe('Apex');
    expect(buildProgressProofSummary({ nonEmptyChartCount: 12 }).proofLevel).toBe('Legendary');
  });

  it('keeps share copy truthful about logged workouts and AI-estimated imports', () => {
    const summary = buildProgressProofSummary({
      audience: 'admin',
      nonEmptyChartCount: 6,
      unavailableChartCount: 1,
    });

    expect(summary.readinessPercent).toBe(50);
    expect(summary.copyText).toContain('6 of 12 charts populated');
    expect(summary.copyText).toContain('Only verified logged workouts count');
    expect(summary.copyText).toContain('AI-estimated historical imports should be reviewed');
    expect(summary.nextUnlock).toBe('6 charts to full proof');
  });

  it('filters chart lenses by coaching question', () => {
    expect(isProgressChartVisible('strength', 'weeklyVolume')).toBe(true);
    expect(isProgressChartVisible('strength', 'recoverySignal')).toBe(false);
    expect(isProgressChartVisible('recovery', 'recoverySignal')).toBe(true);
    expect(isProgressChartVisible('balance', 'movementPatternBalance')).toBe(true);
  });

  it('builds a social-ready proof draft without inventing results', () => {
    const draft = buildProgressProofSocialDraft(
      buildProgressProofSummary({ nonEmptyChartCount: 8 }),
    );

    expect(draft).toContain('Progress proof level: Apex');
    expect(draft).toContain('8/12 SwanStudios charts are populated');
    expect(draft).toContain('verified logged workouts');
    expect(draft).toContain('#ProgressProof');
  });
});
