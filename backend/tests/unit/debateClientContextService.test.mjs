import { describe, expect, it, vi } from 'vitest';

import { buildDebateClientContext } from '../../services/ai/debate/debateClientContextService.mjs';

describe('debateClientContextService', () => {
  it('builds de-identified debate context with recent exercises from workout_logs', async () => {
    const sequelize = {
      QueryTypes: { SELECT: 'SELECT' },
      query: vi.fn()
        .mockResolvedValueOnce([{
          id: 42,
          firstName: 'Private',
          lastName: 'Client',
          age: 34,
          gender: 'female',
          nasmPhase: 'Phase 2',
          trainingExperience: 'intermediate',
          fitnessGoals: ['strength'],
          clientSource: 'swanstudios',
          isActive: true,
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{
          exercises: [
            { exerciseName: 'Bench Press' },
            { exerciseName: 'Goblet Squat' },
          ],
        }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
    };

    const { deIdentified } = await buildDebateClientContext(42, sequelize);

    const workoutSql = sequelize.query.mock.calls[2][0];
    expect(workoutSql).toMatch(/FROM\s+workout_sessions\s+ws/i);
    expect(workoutSql).toMatch(/JOIN\s+workout_logs\s+wl/i);
    expect(workoutSql).toMatch(/wl\."sessionId"\s*=\s*ws\.id/i);
    expect(workoutSql).toMatch(/ws\."userId"\s*=\s*:clientId/i);
    expect(workoutSql).not.toMatch(/"WorkoutSessions"/);
    expect(workoutSql).not.toMatch(/sessionDate/);
    expect(deIdentified).toMatchObject({
      clientAlias: 'Client-42',
      recentExercises: ['Bench Press', 'Goblet Squat'],
      nasmPhase: 'Phase 2',
      clientSource: 'swanstudios',
    });
    expect(JSON.stringify(deIdentified)).not.toContain('Private');
  });

  it('propagates required health query failure instead of substituting empty enrichment', async () => {
    const sequelize = {
      QueryTypes: { SELECT: 'SELECT' },
      query: vi.fn()
        .mockResolvedValueOnce([{ id: 42, firstName: 'Synthetic', isActive: true }])
        .mockRejectedValueOnce(new Error('pain table unavailable')),
    };

    await expect(buildDebateClientContext(42, sequelize)).rejects.toMatchObject({
      code: 'AI_CONTEXT_UNAVAILABLE',
    });
  });

  it('preserves legitimate empty enrichment arrays', async () => {
    const sequelize = {
      QueryTypes: { SELECT: 'SELECT' },
      query: vi.fn()
        .mockResolvedValueOnce([{ id: 42, firstName: 'Synthetic', isActive: true }])
        .mockResolvedValue([]),
    };

    const result = await buildDebateClientContext(42, sequelize);

    expect(result.deIdentified.clientAlias).toBe('Client-42');
    expect(sequelize.query).toHaveBeenCalledTimes(5);
  });
});
