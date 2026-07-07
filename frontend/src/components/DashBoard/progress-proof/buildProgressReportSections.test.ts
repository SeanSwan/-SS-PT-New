import { describe, expect, it } from 'vitest';
import { buildProgressReportSections } from './buildProgressReportSections';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts';

const emptyCharts: CanonicalProgressCharts = {
  workoutFrequency: [],
  attendanceReliability: {
    data: [],
    reliabilityPercent: 0,
    totals: { completed: 0, skipped: 0, cancelled: 0, resolved: 0 },
  },
  weeklyVolume: [],
  setsRepsTrend: { sets: [], reps: [] },
  durationTrend: [],
  intensityRpeTrend: [],
  prTimeline: [],
  anchorLifts: { data: {}, exercises: [] },
  exerciseFrequency: [],
  movementPatternBalance: [],
  muscleGroupBalance: [],
  recoverySignal: [],
} as CanonicalProgressCharts;

describe('buildProgressReportSections', () => {
  it('maps all twelve canonical charts to sections, empty rows for empty charts', () => {
    const sections = buildProgressReportSections(emptyCharts);
    expect(sections).toHaveLength(12);
    expect(sections.map((s) => s.title)).toContain('Workout Frequency');
    expect(sections.map((s) => s.title)).toContain('Recovery Signals');
    expect(sections.every((s) => s.rows.length === 0)).toBe(true);
  });

  it('zips sets/reps by period and guards the attendance section on empty data', () => {
    const sections = buildProgressReportSections({
      ...emptyCharts,
      setsRepsTrend: {
        sets: [{ x: 'Wk 1', y: 24 }, { x: 'Wk 2', y: 30 }],
        reps: [{ x: 'Wk 1', y: 210 }],
      },
      attendanceReliability: {
        data: [{ x: 'completed', y: 9 }],
        reliabilityPercent: 90,
        totals: { completed: 9, skipped: 1, cancelled: 0, resolved: 0 },
      },
    } as CanonicalProgressCharts);

    const setsReps = sections.find((s) => s.title === 'Sets & Reps Trend');
    expect(setsReps?.rows).toEqual([
      { label: 'Wk 1', value: '24 sets / 210 reps' },
      { label: 'Wk 2', value: '30 sets / 0 reps' },
    ]);

    const attendance = sections.find((s) => s.title === 'Attendance Reliability');
    expect(attendance?.rows.find((r) => r.label === 'Show-rate')?.value).toBe('90%');
  });

  it('caps the exercise-frequency section at the top 12', () => {
    const sections = buildProgressReportSections({
      ...emptyCharts,
      exerciseFrequency: Array.from({ length: 20 }, (_, i) => ({
        x: `Exercise ${i + 1}`,
        y: 20 - i,
        sets: 3,
      })),
    } as CanonicalProgressCharts);

    const frequency = sections.find((s) => s.title === 'Exercise Frequency');
    expect(frequency?.rows).toHaveLength(12);
    expect(frequency?.rows[0].label).toBe('Exercise 1');
  });
});
