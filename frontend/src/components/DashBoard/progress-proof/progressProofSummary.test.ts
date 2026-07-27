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
  // G5 (2026-07-24): the deck is 15 charts (CANONICAL_CHART_IDS), not 12. These
  // expectations were fossilized on the old, wrong count; Legendary now requires
  // the FULL 15-chart deck, so 12 populated is Apex, not Legendary.
  it('derives gamified proof levels from the real 15-chart deck', () => {
    expect(buildProgressProofSummary({ nonEmptyChartCount: 0 }).proofLevel).toBe('Locked');
    expect(buildProgressProofSummary({ nonEmptyChartCount: 1 }).proofLevel).toBe('Spark');
    expect(buildProgressProofSummary({ nonEmptyChartCount: 4 }).proofLevel).toBe('Momentum');
    expect(buildProgressProofSummary({ nonEmptyChartCount: 8 }).proofLevel).toBe('Apex');
    expect(buildProgressProofSummary({ nonEmptyChartCount: 12 }).proofLevel).toBe('Apex');
    expect(buildProgressProofSummary({ nonEmptyChartCount: 15 }).proofLevel).toBe('Legendary');
    expect(buildProgressProofSummary({ nonEmptyChartCount: 15 }).totalCharts).toBe(15);
  });

  it('keeps share copy truthful about logged workouts and AI-estimated imports', () => {
    const summary = buildProgressProofSummary({
      audience: 'admin',
      nonEmptyChartCount: 6,
      unavailableChartCount: 1,
    });

    expect(summary.readinessPercent).toBe(40); // 6 / 15
    expect(summary.copyText).toContain('6 of 15 charts populated');
    expect(summary.copyText).toContain('Only verified logged workouts count');
    expect(summary.copyText).toContain('AI-estimated historical imports should be reviewed');
    expect(summary.nextUnlock).toBe('9 charts to full proof'); // 15 - 6
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
    expect(draft).toContain('8/15 SwanStudios charts are populated');
    expect(draft).toContain('verified logged workouts');
    expect(draft).toContain('#ProgressProof');
  });
});
