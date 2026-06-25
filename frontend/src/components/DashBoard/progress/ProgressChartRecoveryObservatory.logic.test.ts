import { describe, expect, it } from 'vitest';

import { buildRecoveryObservatoryModel } from './ProgressChartRecoveryObservatory.logic';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts.types';

const baseCharts: CanonicalProgressCharts = {
  workoutFrequency: [],
  attendanceReliability: {
    data: [],
    reliabilityPercent: 90,
    totals: { completed: 9, skipped: 0, cancelled: 1, resolved: 10 },
  },
  weeklyVolume: [],
  setsRepsTrend: { sets: [], reps: [] },
  durationTrend: [],
  intensityRpeTrend: [{ x: 'W1', y: 6, source: 'rpe' }],
  prTimeline: [],
  anchorLifts: { data: {}, exercises: [] },
  exerciseFrequency: [],
  movementPatternBalance: [],
  muscleGroupBalance: [],
  recoverySignal: [{ x: 'W1', y: 0, painFlags: 0, highRpeFlags: 0, totalSets: 30 }],
};

const emptyCharts: CanonicalProgressCharts = {
  ...baseCharts,
  attendanceReliability: {
    data: [],
    reliabilityPercent: 0,
    totals: { completed: 0, skipped: 0, cancelled: 0, resolved: 0 },
  },
  intensityRpeTrend: [],
  recoverySignal: [],
};

describe('ProgressChartRecoveryObservatory logic', () => {
  it('keeps empty recovery data in a building state instead of alarming the client', () => {
    const model = buildRecoveryObservatoryModel(emptyCharts);

    expect(model.status).toBe('empty');
    expect(model.statusCopy).toBe('Log workouts to build recovery signal');
    expect(model.readinessScore).toBe(0);
    expect(model.totalFlags).toBe(0);
  });

  it('keeps clear recovery status when reliability is high and flags are absent', () => {
    const model = buildRecoveryObservatoryModel(baseCharts);

    expect(model.status).toBe('clear');
    expect(model.statusCopy).toBe('Recovery signal is clear');
    expect(model.readinessScore).toBe(90);
    expect(model.bars.find((bar) => bar.label === 'Readiness')).toMatchObject({ value: 90, pct: 90 });
  });

  it('escalates to coach attention when logged pain flags exist', () => {
    const model = buildRecoveryObservatoryModel({
      ...baseCharts,
      intensityRpeTrend: [{ x: 'W1', y: 9, source: 'rpe' }],
      recoverySignal: [{ x: 'W1', y: 3, painFlags: 2, highRpeFlags: 1, totalSets: 20 }],
    });

    expect(model.status).toBe('intervene');
    expect(model.totalFlags).toBe(3);
    expect(model.painFlags).toBe(2);
    expect(model.highRpeFlags).toBe(1);
    expect(model.readinessScore).toBeLessThan(75);
  });
});