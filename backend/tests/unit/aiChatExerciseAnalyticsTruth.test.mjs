import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getExerciseHistoryFromLogsMock } = vi.hoisted(() => ({
  getExerciseHistoryFromLogsMock: vi.fn(),
}));

vi.mock('../../services/analyticsExerciseHistoryService.mjs', () => ({
  getExerciseHistoryFromLogs: getExerciseHistoryFromLogsMock,
}));

import { enrichWithUserData } from '../../services/aiChatService.mjs';

const makeSequelize = () => ({
  QueryTypes: { SELECT: 'SELECT' },
  query: vi.fn().mockResolvedValue([]),
});

describe('aiChatService exercise analytics truth path', () => {
  beforeEach(() => {
    getExerciseHistoryFromLogsMock.mockReset();
  });

  it('enriches Swan Coach context from the workout-log exercise history service', async () => {
    const sequelize = makeSequelize();
    getExerciseHistoryFromLogsMock.mockResolvedValue({
      exercises: [
        {
          exerciseName: 'Bench Press',
          timesPerformed: 8,
          maxWeight: 185,
          totalVolume: 12250,
        },
      ],
    });

    const context = await enrichWithUserData(42, 'trainer', 'progress_analysis', sequelize);

    expect(getExerciseHistoryFromLogsMock).toHaveBeenCalledTimes(1);
    expect(getExerciseHistoryFromLogsMock).toHaveBeenCalledWith(42, {
      sequelize,
      sort: 'timesPerformed',
      limit: 10,
    });
    expect(context).toContain('--- EXERCISE ANALYTICS (Top 1) ---');
    expect(context).toContain('Bench Press: 8');
    expect(context).toContain('Max: 185lbs');

    const executedSql = sequelize.query.mock.calls.map(([sql]) => sql).join('\n');
    expect(executedSql).not.toMatch(/UserExerciseStats_MV/i);
    expect(executedSql).not.toMatch(/"WorkoutExercises"/);
    expect(executedSql).not.toMatch(/"WorkoutSessions"/);
    expect(executedSql).not.toMatch(/"Sets"/);
  });

  it('builds Swan Coach workout/compliance context from workout_sessions and workout_logs', async () => {
    const sequelize = makeSequelize();
    getExerciseHistoryFromLogsMock.mockResolvedValue({ exercises: [] });

    await enrichWithUserData(42, 'trainer', 'progress_analysis', sequelize);

    const executedSql = sequelize.query.mock.calls.map(([sql]) => sql).join('\n');
    expect(executedSql).toMatch(/FROM\s+workout_sessions\s+ws/i);
    expect(executedSql).toMatch(/JOIN\s+workout_logs\s+wl/i);
    expect(executedSql).toMatch(/ws\."userId"\s*=\s*:userId/i);
    expect(executedSql).toMatch(/ws\.status\s*=\s*'completed'/i);
    const workoutHistorySql = sequelize.query.mock.calls
      .map(([sql]) => sql)
      .find(sql => /JOIN\s+workout_logs\s+wl/i.test(sql));
    expect(workoutHistorySql).not.toMatch(/daily_workout_forms/i);
  });
});
