import { beforeEach, describe, expect, it, vi } from 'vitest';

const { querySpy } = vi.hoisted(() => ({
  querySpy: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({
  default: { query: querySpy },
}));

import GhostModeService from '../../services/gamification/GhostModeService.mjs';

describe('GhostModeService workout-log truth path', () => {
  beforeEach(() => {
    querySpy.mockReset();
  });

  it('loads the ghost from workout_logs joined to workout_sessions, not stale PascalCase workout tables', async () => {
    querySpy.mockResolvedValueOnce([
      [
        {
          id: 'session-1',
          date: '2026-05-20T12:00:00.000Z',
          category: 'full_body',
          totalVolume: '3200',
          totalSets: '4',
          totalReps: '32',
          exercises: [
            {
              exerciseName: 'Bench Press',
              exerciseId: 11,
              sets: 4,
              reps: 32,
              weight: 100,
              volume: 3200,
            },
          ],
        },
      ],
    ]);

    const result = await GhostModeService.getGhost(42, { category: 'full_body' });

    expect(querySpy).toHaveBeenCalledTimes(1);
    const [sql, options] = querySpy.mock.calls[0];
    expect(sql).toMatch(/FROM\s+workout_sessions\s+ws/i);
    expect(sql).toMatch(/JOIN\s+workout_logs\s+wl/i);
    expect(sql).toMatch(/wl\."sessionId"\s*=\s*ws\.id/i);
    expect(sql).toMatch(/ws\."userId"\s*=\s*:userId/i);
    expect(sql).toMatch(/ws\.status\s*=\s*'completed'/i);
    expect(sql).toMatch(/ORDER\s+BY\s+st\."totalVolume"\s+DESC/i);
    expect(sql).not.toMatch(/"WorkoutSessions"/);
    expect(sql).not.toMatch(/"WorkoutExercises"/);
    expect(sql).not.toMatch(/"Sets"/);
    expect(sql).not.toMatch(/sessionDate/);
    expect(sql).not.toMatch(/ws\.category/);
    expect(options.replacements).toEqual({ userId: 42 });
    expect(result).toMatchObject({
      hasGhost: true,
      ghost: {
        ghostId: 'ghost_42_session-1',
        sourceSessionId: 'session-1',
        sourceDate: '2026-05-20T12:00:00.000Z',
        category: 'full_body',
        totalVolume: 3200,
        totalSets: 4,
        totalReps: 32,
        exercises: [
          {
            name: 'Bench Press',
            exerciseId: 11,
            sets: 4,
            reps: 32,
            weight: 100,
            volume: 3200,
          },
        ],
        comparison: {
          metric: 'volume',
          target: 3200,
        },
      },
    });
  });

  it('filters non-full-body category requests through exercise metadata instead of a nonexistent session category', async () => {
    querySpy.mockResolvedValueOnce([[]]);

    await GhostModeService.getGhost(42, { category: 'legs' });

    const [sql, options] = querySpy.mock.calls[0];
    expect(sql).toMatch(/LEFT\s+JOIN\s+"Exercises"\s+e/i);
    expect(sql).toMatch(/e\."bodyPartCategory"\s*=\s*:category/i);
    expect(sql).not.toMatch(/ws\.category/);
    expect(options.replacements).toMatchObject({
      userId: 42,
      category: 'legs',
      categoryLike: '%legs%',
    });
  });
});
