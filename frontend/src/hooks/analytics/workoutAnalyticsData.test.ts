import { describe, expect, it } from 'vitest';
import {
  buildAnalyticsData,
  buildPersonalRecordsFromApi,
  buildWeeklyVolumeFromApi,
  mapWorkoutSessions,
  withEstimatedOneRepMaxes,
} from './workoutAnalyticsData';
import type { WorkoutSession } from './useWorkoutAnalytics.types';

describe('workoutAnalyticsData helpers', () => {
  it('preserves blank or unrated intensity as null', () => {
    expect(mapWorkoutSessions([{ intensity: null }])[0].intensity).toBeNull();
    expect(mapWorkoutSessions([{ intensity: undefined }])[0].intensity).toBeNull();
    expect(mapWorkoutSessions([{ intensity: '' }])[0].intensity).toBeNull();
    expect(mapWorkoutSessions([{ intensity: 0 }])[0].intensity).toBeNull();
    expect(mapWorkoutSessions([{ intensity: '0' }])[0].intensity).toBeNull();
    expect(mapWorkoutSessions([{ intensity: -2 }])[0].intensity).toBeNull();
    expect(mapWorkoutSessions([{ intensity: 'not-a-number' }])[0].intensity).toBeNull();
    expect(mapWorkoutSessions([{ intensity: '7' }])[0].intensity).toBe(7);
  });

  it('maps raw workout rows without fabricating intensity or logs', () => {
    const sessions = mapWorkoutSessions([
      {
        id: 99,
        title: '',
        date: '2026-06-08T12:00:00.000Z',
        duration: 45,
        intensity: null,
        status: '',
        totalSets: 3,
        totalReps: 30,
        totalWeight: 1200,
        WorkoutLogs: [
          {
            id: 5,
            exerciseName: 'Squat',
            setNumber: 1,
            reps: 10,
            weight: 120,
            rpe: 8,
            exerciseNote: 'Solid depth',
          },
        ],
      },
    ]);

    expect(sessions).toEqual([
      {
        id: '99',
        title: 'Workout',
        date: '2026-06-08T12:00:00.000Z',
        duration: 45,
        intensity: null,
        status: 'completed',
        totalSets: 3,
        totalReps: 30,
        totalWeight: 1200,
        notes: undefined,
        logs: [
          {
            id: 5,
            exerciseName: 'Squat',
            setNumber: 1,
            reps: 10,
            weight: 120,
            tempo: undefined,
            rest: undefined,
            rpe: 8,
            notes: undefined,
            exerciseNote: 'Solid depth',
          },
        ],
      },
    ]);
  });

  it('builds intensity trend and summary from rated sessions only', () => {
    const sessions: WorkoutSession[] = [
      makeSession({ id: 'unrated', date: '2026-06-08', intensity: null, totalWeight: 500 }),
      makeSession({ id: 'zero', date: '2026-06-09', intensity: 0, totalWeight: 700 }),
      makeSession({ id: 'rated-late', date: '2026-06-11', intensity: 9, totalWeight: 900 }),
      makeSession({ id: 'rated-early', date: '2026-06-10', intensity: 7, totalWeight: 800 }),
    ];
    const data = buildAnalyticsData(sessions, [], []);

    expect(data.intensityTrend).toEqual([
      { date: '2026-06-10', intensity: 7 },
      { date: '2026-06-11', intensity: 9 },
    ]);
    expect(data.summary).toMatchObject({
      totalWorkouts: 4,
      totalVolume: 2900,
      avgIntensity: 8,
      avgRPE: 8,
      longestStreak: 4,
    });
  });

  it('returns null average intensity when no session has a logged effort rating', () => {
    const sessions: WorkoutSession[] = [
      makeSession({ id: 'unrated-a', intensity: null }),
      makeSession({ id: 'unrated-b', intensity: null }),
    ];
    const data = buildAnalyticsData(sessions, [], []);

    expect(data.summary.avgIntensity).toBeNull();
    expect(data.intensityTrend).toEqual([]);
  });

  it('normalizes fulfilled API arrays for volume and personal records', () => {
    const volumeResponse = {
      status: 'fulfilled',
      value: {
        data: {
          success: true,
          volumeProgression: [{ period: '2026-W23', totalVolume: 2400, count: 2 }],
        },
      },
    } as const;
    const prsResponse = {
      status: 'fulfilled',
      value: {
        data: {
          success: true,
          personalRecords: [{ exerciseName: 'Bench Press', maxWeight: 185, bestReps: 5 }],
        },
      },
    } as const;

    expect(buildWeeklyVolumeFromApi(volumeResponse)).toEqual([
      { week: '2026-W23', volume: 2400, workoutCount: 2 },
    ]);
    expect(withEstimatedOneRepMaxes(buildPersonalRecordsFromApi(prsResponse))[0]).toMatchObject({
      exercise: 'Bench Press',
      weight: 185,
      reps: 5,
      estimated1RM: 208,
    });
  });
});

const makeSession = (overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'session',
  title: 'Workout',
  date: '2026-06-08',
  duration: 45,
  intensity: null,
  status: 'completed',
  totalSets: 3,
  totalReps: 30,
  totalWeight: 600,
  logs: [
    {
      id: 1,
      exerciseName: 'Squat',
      setNumber: 1,
      reps: 10,
      weight: 120,
      rpe: 8,
    },
  ],
  ...overrides,
});
