import { beforeEach, describe, expect, it, vi } from 'vitest';

const { querySpy } = vi.hoisted(() => ({
  querySpy: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({
  default: { query: querySpy },
}));

import {
  getExerciseHistoryFromLogs,
  getExerciseVarietyFromLogs,
} from '../../services/analyticsExerciseHistoryService.mjs';

describe('analytics exercise history truth path', () => {
  beforeEach(() => {
    querySpy.mockReset();
  });

  it('builds exercise history from workout_logs and workout_sessions instead of stale materialized/PascalCase tables', async () => {
    querySpy
      .mockResolvedValueOnce([
        [
          {
            exerciseId: 7,
            exerciseName: 'Goblet Squat',
            primaryMuscles: '["quads","glutes"]',
            category: 'legs',
            timesPerformed: 3,
            maxWeight: 70,
            maxReps: 14,
            totalVolume: 2800,
            lastPerformedDate: '2026-05-22T00:00:00.000Z',
            firstPerformedDate: '2026-05-01T00:00:00.000Z',
          },
        ],
      ])
      .mockResolvedValueOnce([[{ total: 4 }]])
      .mockResolvedValueOnce([[{ total: 200 }]]);

    const result = await getExerciseHistoryFromLogs(42, {
      muscleGroup: 'legs',
      sort: 'totalVolume',
      limit: 20,
    });

    expect(querySpy).toHaveBeenCalledTimes(3);
    const [historySql, historyOptions] = querySpy.mock.calls[0];
    expect(historySql).toMatch(/FROM\s+workout_logs\s+wl/i);
    expect(historySql).toMatch(/JOIN\s+workout_sessions\s+ws/i);
    expect(historySql).toMatch(/wl\."sessionId"\s*=\s*ws\.id/);
    expect(historySql).toMatch(/LOWER\(e\.name\)\s*=\s*LOWER\(wl\."exerciseName"\)/);
    expect(historySql).toMatch(/ws\."userId"\s*=\s*:userId/);
    expect(historySql).toMatch(/ws\.status\s*=\s*'completed'/);
    expect(historySql).toMatch(/ORDER BY\s+"totalVolume"\s+DESC/i);
    expect(historySql).not.toMatch(/UserExerciseStats_MV/i);
    expect(historySql).not.toMatch(/"WorkoutExercises"/);
    expect(historySql).not.toMatch(/"WorkoutSessions"/);
    expect(historySql).not.toMatch(/"Sets"/);
    expect(historyOptions.replacements).toMatchObject({
      userId: 42,
      muscleGroup: '%legs%',
      limit: 20,
    });
    expect(result).toMatchObject({
      exercises: [
        {
          exerciseId: 7,
          exerciseName: 'Goblet Squat',
          timesPerformed: 3,
          totalVolume: 2800,
        },
      ],
      totalUniqueExercises: 4,
      totalAvailableExercises: 200,
      varietyScore: 2,
      usedMaterializedView: false,
    });
  });

  it('returns empty exercise history without querying when userId is invalid', async () => {
    const result = await getExerciseHistoryFromLogs('admin-library');

    expect(querySpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      exercises: [],
      totalUniqueExercises: 0,
      totalAvailableExercises: 0,
      varietyScore: 0,
      usedMaterializedView: false,
    });
  });

  it('calculates exercise variety from workout_logs and excludes stale PascalCase joins', async () => {
    querySpy
      .mockResolvedValueOnce([[{ count: 2 }]])
      .mockResolvedValueOnce([[{ count: 5 }]]);

    const result = await getExerciseVarietyFromLogs(42);

    expect(querySpy).toHaveBeenCalledTimes(2);
    const sqlText = querySpy.mock.calls.map(([sql]) => sql).join('\n');
    expect(sqlText).toMatch(/FROM\s+workout_logs\s+wl/i);
    expect(sqlText).toMatch(/JOIN\s+workout_sessions\s+ws/i);
    expect(sqlText).toMatch(/NOT EXISTS/i);
    expect(sqlText).not.toMatch(/"WorkoutExercises"/);
    expect(sqlText).not.toMatch(/"WorkoutSessions"/);
    expect(sqlText).not.toMatch(/"Sets"/);
    expect(querySpy.mock.calls[0][1].replacements).toMatchObject({ userId: 42 });
    expect(result).toEqual({
      newExercisesThisMonth: 2,
      muscleGroupsHitThisMonth: 5,
    });
  });
});
