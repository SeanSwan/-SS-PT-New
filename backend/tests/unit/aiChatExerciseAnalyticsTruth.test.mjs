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
  it('Coach evidence mode does not duplicate legacy workout metrics or read other client subjects',async()=>{
    const sequelize=makeSequelize();getExerciseHistoryFromLogsMock.mockResolvedValue({exercises:[]});
    await enrichWithUserData(42,'trainer','coach_assistant',sequelize,null,{coachEvidence:true});
    const sql=sequelize.query.mock.calls.map(([text])=>text).join(' ');
    expect(sql).not.toContain('workout_sessions');
    expect(sql).not.toContain('FROM orders');
    expect(sql).not.toContain('cta.status AS "assignmentStatus"');
    expect(getExerciseHistoryFromLogsMock).not.toHaveBeenCalled();
  });
  it('aborted enrichment does not begin any domain queries',async()=>{
    const sequelize=makeSequelize();const controller=new AbortController();controller.abort();
    await expect(enrichWithUserData(42,'trainer','coach_assistant',sequelize,null,{signal:controller.signal})).rejects.toThrow();
    expect(sequelize.query).not.toHaveBeenCalled();
  });
  it('revoked access during a pending source read discards the entire legacy context',async()=>{
    const sequelize=makeSequelize();let allowed=true;
    sequelize.query.mockImplementation(async()=>{allowed=false;return [];});
    const verifyAccess=async()=>{if(!allowed)throw new Error('CONTEXT_ACCESS_DENIED');};
    await expect(enrichWithUserData(42,'trainer','coach_assistant',sequelize,null,{verifyAccess})).rejects.toThrow('CONTEXT_ACCESS_DENIED');
  });

});
