/**
 * useClientProgressChartsResponseMapping tests
 * ============================================
 *
 * Locks the shared response mapper used by client, trainer, and admin
 * progress hooks so partial feed outages do not masquerade as no progress.
 */
import { describe, expect, it } from 'vitest';

import {
  buildCanonicalProgressChartsFromResponses,
  countNonEmptyCharts,
  countUnavailableChartResponses,
  EMPTY_CANONICAL_PROGRESS_CHARTS,
} from './useClientProgressChartsResponseMapping';

describe('useClientProgressChartsResponseMapping', () => {
  it('builds sanitized canonical chart bundles from mixed chart responses', () => {
    const charts = buildCanonicalProgressChartsFromResponses([
      { success: true, data: [{ x: 'Week 1', y: '3' }] },
      { success: true, data: [{ x: 'completed', y: '2' }], reliabilityPercent: 100, totals: { completed: 2 } },
      { success: false, data: [{ x: 'ignored', y: 99 }] },
      { success: true, data: { sets: [{ x: 'Week 1', y: '6' }], reps: [] } },
      null,
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: { Squat: [{ x: 'Week 1', y: '225', reps: '5' }] }, exercises: ['Squat'] },
      { success: true, data: [{ x: 'Push Up', y: '8', sets: '24' }] },
      { success: true, data: [] },
      { success: true, data: [] },
      { success: true, data: [] },
    ]);

    expect(charts.workoutFrequency).toEqual([{ x: 'Week 1', y: 3 }]);
    expect(charts.weeklyVolume).toEqual([]);
    expect(charts.setsRepsTrend.sets).toEqual([{ x: 'Week 1', y: 6 }]);
    expect(charts.anchorLifts.exercises).toEqual(['Squat']);
    expect(charts.exerciseFrequency).toEqual([{ x: 'Push Up', y: 8, sets: 24 }]);
    expect(countNonEmptyCharts(charts)).toBe(5);
  });

  it('drops malformed array members before chart point property access', () => {
    const charts = buildCanonicalProgressChartsFromResponses([
      { success: true, data: [null, 'broken', 42, { x: 'Week 1', y: '3' }] },
    ]);

    expect(charts.workoutFrequency).toEqual([{ x: 'Week 1', y: 3 }]);
  });

  it('counts failed and malformed chart responses without marking honest empty data unavailable', () => {
    expect(countUnavailableChartResponses([
      { success: true, data: [] },
      { success: false, data: [] },
      null,
    ])).toBe(2);
  });

  it('exports a complete empty bundle for idle hook state', () => {
    expect(EMPTY_CANONICAL_PROGRESS_CHARTS.recoverySignal).toEqual([]);
    expect(countNonEmptyCharts(EMPTY_CANONICAL_PROGRESS_CHARTS)).toBe(0);
  });
});
