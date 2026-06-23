import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getExerciseHistoryFromLogsMock } = vi.hoisted(() => ({
  getExerciseHistoryFromLogsMock: vi.fn(),
}));

vi.mock('../../services/analyticsExerciseHistoryService.mjs', () => ({
  getExerciseHistoryFromLogs: getExerciseHistoryFromLogsMock,
}));

import { enrichWithUserData } from '../../services/aiChatService.mjs';

function createPainAwareSequelize() {
  return {
    QueryTypes: { SELECT: 'SELECT' },
    query: vi.fn(async (sql) => {
      if (
        sql.includes('SELECT "firstName", "lastName", email, phone FROM "Users"')
        && sql.includes('WHERE id = :userId LIMIT 1')
      ) {
        return [{
          firstName: 'Test',
          lastName: 'Client',
          email: 'client@example.invalid',
          phone: '555-0100',
        }];
      }

      if (
        sql.includes('FROM client_pain_entries WHERE "userId" = :userId AND "isActive" = true')
        && sql.includes('"bodyRegion" AS region')
        && sql.includes('"painLevel" AS pain_level')
        && sql.includes('"painType" AS pain_type')
      ) {
        return [{
          region: 'lower_back',
          side: 'center',
          pain_level: 8,
          pain_type: 'aching',
          description: 'worse after squats',
        }];
      }

      if (
        sql.includes('FROM client_pain_entries cpe')
        && sql.includes('cpe."bodyRegion" AS body_region')
        && sql.includes('cpe."painLevel" AS pain_level')
        && sql.includes('cpe."painType" AS pain_type')
        && sql.includes('cpe."isActive" = true')
      ) {
        return [{
          body_region: 'right_shoulder',
          side: 'right',
          pain_level: 7,
          pain_type: 'sharp',
          user_id: 42,
        }];
      }

      return [];
    }),
  };
}

describe('AI chat pain context source', () => {
  beforeEach(() => {
    getExerciseHistoryFromLogsMock.mockReset();
    getExerciseHistoryFromLogsMock.mockResolvedValue({ exercises: [] });
  });

  it('injects selected-client pain context from the real ClientPainEntry columns', async () => {
    const sequelize = createPainAwareSequelize();

    const context = await enrichWithUserData(42, 'trainer', 'coach_assistant', sequelize);

    expect(context).toContain('--- PAIN/INJURY ---');
    expect(context).toContain('lower_back(center): 8/10 aching');
    expect(context).toContain('worse after squats');

    const executedSql = sequelize.query.mock.calls.map(([sql]) => sql).join('\n');
    expect(executedSql).toContain('"bodyRegion" AS region');
    expect(executedSql).toContain('"painLevel" AS pain_level');
    expect(executedSql).toContain('"painType" AS pain_type');
    expect(executedSql).toContain('"isActive" = true');
    expect(executedSql).not.toMatch(/SELECT\s+region,\s+pain_level,\s+pain_type/);
    expect(executedSql).not.toContain("status = 'active'\n         ORDER BY pain_level");
  });

  it('injects assigned-client pain constraints from the real ClientPainEntry columns', async () => {
    const sequelize = createPainAwareSequelize();

    const context = await enrichWithUserData(7, 'trainer', 'coach_assistant', sequelize);

    expect(context).toContain('Active Client Pain Entries (severity 5+)');
    expect(context).toContain('Client #42: right_shoulder (right)');
    expect(context).toContain('7/10 sharp');

    const executedSql = sequelize.query.mock.calls.map(([sql]) => sql).join('\n');
    expect(executedSql).toContain('cpe."bodyRegion" AS body_region');
    expect(executedSql).toContain('cpe."painLevel" AS pain_level');
    expect(executedSql).toContain('cpe."painType" AS pain_type');
    expect(executedSql).toContain('cpe."userId" AS user_id');
    expect(executedSql).toContain('cpe."isActive" = true');
    expect(executedSql).not.toContain('cpe.body_region');
    expect(executedSql).not.toContain("cpe.status = 'active'");
  });
});
