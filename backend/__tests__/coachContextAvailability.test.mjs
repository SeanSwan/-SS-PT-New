import { beforeEach, describe, expect, it, vi } from 'vitest';

const access = vi.hoisted(() => vi.fn());

vi.mock('../services/ai/contextEngine/clientAccess.mjs', () => ({
  checkClientAccess: access,
  CLIENT_ACCESS_DENIED_MESSAGE: 'denied',
  parseContextClientId: (value) => (
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
  ),
}));

const { buildCoachContext, buildTrainerDayContext } =
  await import('../services/ai/contextEngine/coachContextEngine.mjs');
const { dispatchBriefMyDay } = await import('../services/ai/dispatchers/dayBriefDispatcher.mjs');

function database({ fail = null, malformed = null, empty = false } = {}) {
  return {
    QueryTypes: { SELECT: 'SELECT' },
    query: vi.fn(async (sql) => {
      const domain = /client_pain_entries/.test(sql)
        ? 'pain'
        : /workout_sessions/.test(sql)
          ? 'workouts'
          : /daily_macro_logs/.test(sql)
            ? 'nutrition'
            : /FROM goals/.test(sql)
              ? 'goals'
              : /FROM sessions/.test(sql)
                ? 'schedule'
                : /FROM "Users"/.test(sql)
                  ? 'profile'
                  : /UserBadges/.test(sql) ? 'badges' : null;
      if (domain === fail) throw new Error('synthetic ' + domain + ' outage');
      if (domain === malformed) return { malformed: true };
      if (empty) return [];
      if (domain === 'profile') return [{ id: 7, firstName: 'Synthetic', lastName: 'Client' }];
      return [];
    }),
  };
}

beforeEach(() => {
  access.mockReset();
  access.mockResolvedValue({ allowed: true, via: 'assignment', reason: null });
});

describe('coach context availability contract', () => {
  it('returns unavailable when a required health query fails', async () => {
    const result = await buildCoachContext({
      user: { id: 2, role: 'trainer' },
      targetClientId: 7,
      sequelize: database({ fail: 'pain' }),
    });

    expect(result).toMatchObject({
      ok: false,
      deniedReason: 'data_unavailable',
    });
    expect(result.message).toContain('temporarily unavailable');
    expect(result.dataQuality.find((item) => item.domain === 'pain')?.status).toBe('unavailable');
  });

  it('returns unavailable for malformed required query rows', async () => {
    const result = await buildCoachContext({
      user: { id: 2, role: 'trainer' },
      targetClientId: 7,
      sequelize: database({ malformed: 'nutrition' }),
    });

    expect(result.ok).toBe(false);
    expect(result.deniedReason).toBe('data_unavailable');
  });

  it('preserves a true empty health result as a successful context', async () => {
    const result = await buildCoachContext({
      user: { id: 2, role: 'trainer' },
      targetClientId: 7,
      sequelize: database({ empty: true }),
    });

    expect(result.ok).toBe(true);
    expect(result.context.clientAlias).toBe('Client-7');
    expect(result.context.painEntries).toEqual([]);
    expect(result.dataQuality.every((item) => item.status === 'ok')).toBe(true);
  });

  it('fails the day brief before all-clear formatting when health enrichment fails', async () => {
    const sequelize = {
      QueryTypes: { SELECT: 'SELECT' },
      query: vi.fn(async (sql) => {
        if (/FROM sessions/.test(sql)) {
          return [{ id: 31, sessionDate: '2026-06-10T17:00:00.000Z', duration: 60, status: 'scheduled', userId: 7 }];
        }
        return Promise.reject(new Error('synthetic health outage'));
      }),
    };

    const result = await buildTrainerDayContext({
      user: { id: 2, role: 'trainer' },
      sequelize,
    });
    const dispatched = await dispatchBriefMyDay({}, {
      user: { id: 2, role: 'trainer' },
      options: { sequelize },
    });

    expect(result).toMatchObject({ ok: false, code: 'DAY_BRIEF_UNAVAILABLE' });
    expect(dispatched.type).toBe('day_brief_unavailable');
    expect(dispatched.message).toContain('temporarily unavailable');
  });
});
