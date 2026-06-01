import { beforeEach, describe, expect, it, vi } from 'vitest';

const { querySpy } = vi.hoisted(() => ({
  querySpy: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({
  default: { query: querySpy },
}));

vi.mock('../../models/index.mjs', () => ({
  getWorkoutSession: vi.fn(() => null),
  getModel: vi.fn(() => null),
  Op: {
    gte: Symbol('gte'),
    lte: Symbol('lte'),
  },
}));

import { calculateExerciseTotals } from '../../services/analyticsService.mjs';

describe('analyticsService.calculateExerciseTotals truth path', () => {
  beforeEach(() => {
    querySpy.mockReset();
  });

  it('aggregates category totals from workout_logs, not the empty WorkoutExercise/Set chain', async () => {
    querySpy.mockResolvedValue([
      [
        {
          category: 'chest',
          total_volume: 1200,
          total_reps: 40,
          total_exercises: 2,
          sessions_count: 2,
          overall_sessions: 2,
          overall_exercises: 3,
          overall_volume: 2100,
          overall_reps: 70,
        },
        {
          category: 'legs',
          total_volume: 900,
          total_reps: 30,
          total_exercises: 1,
          sessions_count: 1,
          overall_sessions: 2,
          overall_exercises: 3,
          overall_volume: 2100,
          overall_reps: 70,
        },
      ],
    ]);

    const totals = await calculateExerciseTotals(42);

    expect(querySpy).toHaveBeenCalledTimes(1);
    const [sql, options] = querySpy.mock.calls[0];
    expect(sql).toMatch(/FROM\s+workout_logs/i);
    expect(sql).toMatch(/JOIN\s+workout_sessions/i);
    expect(sql).toMatch(/wl\."sessionId"\s*=\s*ws\.id/);
    expect(sql).toMatch(/ws\."userId"\s*=\s*:userId/);
    expect(sql).toMatch(/ws\.status\s*=\s*'completed'/);
    expect(sql).not.toMatch(/WorkoutExercise/i);
    expect(sql).not.toMatch(/FROM\s+sets\b/i);
    expect(options).toMatchObject({ replacements: { userId: 42 } });
    expect(totals.totalSessions).toBe(2);
    expect(totals.totalExercises).toBe(3);
    expect(totals.totalVolume).toBe(2100);
    expect(totals.totalReps).toBe(70);
    expect(totals.categories.chest).toMatchObject({
      totalVolume: 1200,
      totalReps: 40,
      totalExercises: 2,
      sessionsCount: 2,
      avgVolumePerSession: 600,
      avgRepsPerSession: 20,
    });
    expect(totals.categories.legs).toMatchObject({
      totalVolume: 900,
      totalReps: 30,
      totalExercises: 1,
      sessionsCount: 1,
      avgVolumePerSession: 900,
      avgRepsPerSession: 30,
    });
  });

  it('keeps date filtering parameterized', async () => {
    querySpy.mockResolvedValue([[]]);

    await calculateExerciseTotals(42, {
      startDate: new Date('2026-05-01T00:00:00Z'),
      endDate: new Date('2026-05-31T00:00:00Z'),
    });

    const [sql, options] = querySpy.mock.calls[0];
    expect(sql).toContain('ws.date >= :startDate');
    expect(sql).toContain('ws.date <= :endDate');
    expect(options.replacements.startDate).toEqual(new Date('2026-05-01T00:00:00Z'));
    expect(options.replacements.endDate).toEqual(new Date('2026-05-31T00:00:00Z'));
  });
});
