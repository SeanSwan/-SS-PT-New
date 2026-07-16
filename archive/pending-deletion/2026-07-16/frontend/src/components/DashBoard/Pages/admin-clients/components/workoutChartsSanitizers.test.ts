import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AnalyticsData } from '../../../../../hooks/analytics/useWorkoutAnalytics';
import {
  sanitizeNASMChartsData,
  sanitizeWorkoutChartsData,
} from './workoutChartsSanitizers';

const baseData = {
  sessions: [],
  personalRecords: [],
  summary: {
    totalWorkouts: 0,
    totalExercises: 0,
    totalVolume: 0,
    avgIntensity: 0,
    avgRPE: 0,
    longestStreak: 0,
  },
};

describe('workout chart sanitizers', () => {
  it('drops sparse workout chart points before they reach Victory', () => {
    const data = {
      ...baseData,
      weeklyVolume: [
        { week: '2026-W20', volume: '1200', workoutCount: '2' },
        { week: '', volume: Number.NaN, workoutCount: 1 },
      ],
      exerciseFrequency: [
        { name: 'Squat', count: '3', totalVolume: '900' },
        { name: '   ', count: 4, totalVolume: 100 },
        { name: 'Push-up', count: Number.NaN, totalVolume: 100 },
      ],
      intensityTrend: [
        { date: '2026-05-24', intensity: 12 },
        { date: 'bad-date', intensity: 7 },
      ],
      workoutCalendar: [
        { date: '2026-05-24', count: '2' },
        { date: null, count: 1 },
      ],
      oneRMProgression: [],
      muscleGroupVolume: [],
      rpeTrend: [],
    } as unknown as AnalyticsData;

    const sanitized = sanitizeWorkoutChartsData(data);

    expect(sanitized.weeklyVolume).toEqual([{ week: '2026-W20', volume: 1200, workoutCount: 2 }]);
    expect(sanitized.exerciseFrequency).toEqual([{ name: 'Squat', count: 3, totalVolume: 900 }]);
    expect(sanitized.intensityTrend).toEqual([{ date: '2026-05-24', intensity: 10 }]);
    expect(sanitized.workoutCalendar).toEqual([{ date: '2026-05-24', count: 2 }]);
  });

  it('drops sparse NASM chart points and clamps RPE before Victory renders', () => {
    const data = {
      ...baseData,
      weeklyVolume: [],
      exerciseFrequency: [],
      intensityTrend: [],
      workoutCalendar: [],
      oneRMProgression: [
        { exercise: 'Bench Press', date: '2026-05-24', estimated1RM: '225' },
        { exercise: 'Deadlift', date: 'bad-date', estimated1RM: 315 },
        { exercise: 'Squat', date: '2026-05-24', estimated1RM: Number.NaN },
      ],
      muscleGroupVolume: [
        { group: 'Legs', volume: '1200' },
        { group: '', volume: 500 },
        { group: 'Other', volume: Number.NaN },
      ],
      rpeTrend: [
        { date: '2026-05-24', avgRPE: 13 },
        { date: 'bad-date', avgRPE: 7 },
        { date: '2026-05-25', avgRPE: Number.NaN },
      ],
    } as unknown as AnalyticsData;

    const sanitized = sanitizeNASMChartsData(data);

    expect(sanitized.oneRMProgression).toEqual([
      { exercise: 'Bench Press', date: '2026-05-24', estimated1RM: 225 },
    ]);
    expect(sanitized.muscleGroupVolume).toEqual([{ group: 'Legs', volume: 1200 }]);
    expect(sanitized.rpeTrend).toEqual([{ date: '2026-05-24', avgRPE: 10 }]);
  });

  it('keeps RPE-only NASM chart data from collapsing the tab into empty state', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutChartsTab.tsx'),
      'utf8',
    );

    expect(source).toMatch(/nasmData\.rpeTrend\.length\s*>\s*1/);
  });
});
