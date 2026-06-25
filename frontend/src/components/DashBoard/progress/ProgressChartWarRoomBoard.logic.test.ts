import { describe, expect, it } from 'vitest';

import { buildWarRoomTiles, normalizeWarRoomLayout } from './ProgressChartWarRoomBoard.logic';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts.types';

const charts: CanonicalProgressCharts = {
  workoutFrequency: [{ x: 'Mon', y: 1 }],
  attendanceReliability: {
    data: [],
    reliabilityPercent: 75,
    totals: { completed: 6, skipped: 1, cancelled: 1, resolved: 8 },
  },
  weeklyVolume: [{ x: 'W1', y: 1200, workouts: 3 }],
  setsRepsTrend: { sets: [{ x: 'W1', y: 20 }], reps: [{ x: 'W1', y: 150 }] },
  durationTrend: [{ x: 'W1', y: 55 }],
  intensityRpeTrend: [{ x: 'W1', y: 8, source: 'rpe' }],
  prTimeline: [{ x: '2026-06-01', y: 225, exercise: 'Bench Press', reps: 3 }],
  anchorLifts: { data: {}, exercises: [] },
  exerciseFrequency: [{ x: 'Push Up', y: 12, sets: 36 }],
  movementPatternBalance: [{ x: 'push', y: 12, sets: 36 }],
  muscleGroupBalance: [{ x: 'Chest', y: 12, sets: 36 }],
  recoverySignal: [{ x: 'W1', y: 2, painFlags: 1, highRpeFlags: 1, totalSets: 20 }],
};

describe('ProgressChartWarRoomBoard logic', () => {
  it('builds dense board tiles from canonical chart data', () => {
    const tiles = buildWarRoomTiles(charts);

    expect(tiles.map((tile) => tile.id)).toContain('exercise-codex');
    expect(tiles.find((tile) => tile.id === 'exercise-codex')).toMatchObject({ value: '1', detail: '36 sets logged' });
    expect(tiles.find((tile) => tile.id === 'weekly-load')).toMatchObject({ value: '1.2K' });
    expect(tiles.find((tile) => tile.id === 'recovery-watch')).toMatchObject({ value: '2' });
    expect(tiles.find((tile) => tile.id === 'attendance')).toMatchObject({ value: '75%' });
  });

  it('normalizes a saved layout against available chart tiles', () => {
    const tiles = buildWarRoomTiles(charts);

    expect(normalizeWarRoomLayout(['recovery-watch', 'missing', 'exercise-codex'], tiles))
      .toEqual(['recovery-watch', 'exercise-codex']);
    expect(normalizeWarRoomLayout([], tiles))
      .toEqual(['exercise-codex', 'weekly-load', 'recovery-watch', 'pr-archive']);
  });
});
