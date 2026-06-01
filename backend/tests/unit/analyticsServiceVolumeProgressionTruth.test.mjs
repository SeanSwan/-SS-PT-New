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

import { calculateVolumeOverTime } from '../../services/analyticsService.mjs';

describe('analyticsService.calculateVolumeOverTime truth path', () => {
  beforeEach(() => {
    querySpy.mockReset();
  });

  it('uses workout_logs joined to workout_sessions and returns the week/volume keys the active hook reads', async () => {
    querySpy.mockResolvedValue([
      [
        {
          period: '2026-W20',
          total_volume: 2400.5,
          total_reps: 84,
          total_exercises: 4,
          sessions_count: 3,
          avg_intensity: 7.333,
        },
      ],
    ]);

    const data = await calculateVolumeOverTime(42, { groupBy: 'week' });

    expect(querySpy).toHaveBeenCalledTimes(1);
    const [sql, options] = querySpy.mock.calls[0];

    expect(sql).toMatch(/FROM\s+workout_sessions/i);
    expect(sql).toMatch(/LEFT\s+JOIN\s+workout_logs/i);
    expect(sql).toMatch(/wl\."sessionId"\s*=\s*ws\.id/);
    expect(sql).toMatch(/ws\."userId"\s*=\s*:userId/);
    expect(sql).toMatch(/ws\.status\s*=\s*'completed'/);
    expect(sql).not.toMatch(/WorkoutExercise/i);
    expect(sql).not.toMatch(/FROM\s+sets\b/i);
    expect(options).toMatchObject({ replacements: { userId: 42 } });
    expect(data).toEqual([
      {
        date: '2026-W20',
        week: '2026-W20',
        volume: 2401,
        totalVolume: 2401,
        totalReps: 84,
        totalExercises: 4,
        sessionsCount: 3,
        workoutCount: 3,
        avgVolumePerSession: 800,
        avgIntensity: 7.3,
      },
    ]);
  });

  it('uses bounded date replacements instead of interpolating date filters', async () => {
    querySpy.mockResolvedValue([[]]);

    await calculateVolumeOverTime(42, {
      groupBy: 'day',
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
