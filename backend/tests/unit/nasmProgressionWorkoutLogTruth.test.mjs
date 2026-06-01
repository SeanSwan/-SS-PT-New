import { beforeEach, describe, expect, it, vi } from 'vitest';

const { querySpy, userFindByPk } = vi.hoisted(() => ({
  querySpy: vi.fn(),
  userFindByPk: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({
  default: { query: querySpy },
}));

vi.mock('../../models/index.mjs', () => ({
  getUser: vi.fn(() => ({ findByPk: userFindByPk })),
  getWorkoutSession: vi.fn(() => null),
  getModel: vi.fn(() => null),
  Op: { gte: Symbol('gte') },
}));

import { updateClientProgress } from '../../services/nasmProgressionService.mjs';

const currentWorkoutRows = [
  {
    sessionId: 'session-1',
    date: '2026-05-22T00:00:00.000Z',
    intensity: 4,
    exerciseName: 'Squat',
    setNumber: 1,
    reps: 15,
    weight: 100,
  },
  {
    sessionId: 'session-1',
    date: '2026-05-22T00:00:00.000Z',
    intensity: 4,
    exerciseName: 'Squat',
    setNumber: 2,
    reps: 15,
    weight: 100,
  },
];

const recentWorkoutRows = [
  ...currentWorkoutRows,
  { sessionId: 'session-2', date: '2026-05-15T00:00:00.000Z', intensity: 4, exerciseName: 'Plank', setNumber: 1, reps: 20, weight: 0 },
  { sessionId: 'session-3', date: '2026-05-08T00:00:00.000Z', intensity: 4, exerciseName: 'Row', setNumber: 1, reps: 12, weight: 80 },
  { sessionId: 'session-4', date: '2026-05-01T00:00:00.000Z', intensity: 4, exerciseName: 'Lunge', setNumber: 1, reps: 12, weight: 40 },
];

describe('nasmProgressionService workout-log truth path', () => {
  beforeEach(() => {
    querySpy.mockReset();
    userFindByPk.mockReset();
  });

  it('analyzes NASM progression from workout_logs instead of empty WorkoutExercise/Set associations', async () => {
    userFindByPk.mockResolvedValue({ id: 42, nasmLevel: 'stabilization' });
    querySpy
      .mockResolvedValueOnce([currentWorkoutRows])
      .mockResolvedValueOnce([recentWorkoutRows]);

    const result = await updateClientProgress(42, 'session-1');

    expect(querySpy).toHaveBeenCalledTimes(2);
    const executedSql = querySpy.mock.calls.map(([sql]) => sql).join('\n');
    expect(executedSql).toMatch(/FROM\s+workout_sessions\s+ws/i);
    expect(executedSql).toMatch(/JOIN\s+workout_logs\s+wl/i);
    expect(executedSql).toMatch(/wl\."sessionId"\s*=\s*ws\.id/);
    expect(executedSql).toMatch(/ORDER BY\s+ws\.date\s+DESC/i);
    expect(executedSql).not.toMatch(/WorkoutExercise/i);
    expect(executedSql).not.toMatch(/"WorkoutExercises"/);
    expect(executedSql).not.toMatch(/"Sets"/);

    expect(result.performanceAnalysis).toMatchObject({
      totalSets: 2,
      totalReps: 30,
      exerciseBreakdown: expect.objectContaining({ compound: 1 }),
    });
    expect(result.performanceAnalysis.adherence.reps).toBe(100);
    expect(result.performanceAnalysis.adherence.sets).toBe(100);
    expect(result.recommendations).not.toContain('No exercise data to analyze');
  });
});
