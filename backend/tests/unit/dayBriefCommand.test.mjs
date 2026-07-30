/**
 * dayBriefCommand.test.mjs
 * ========================
 * Slice A2 — trainer day-sheet:
 *   - trainer sees OWN sessions only; admin sees all (SQL scoping)
 *   - per-client flags (active pain, low credits) are de-identified
 *   - gamification block now rides the engine profile domain
 *   - wiring guards for brief_my_day
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkClientAccess } from '../../services/ai/contextEngine/clientAccess.mjs';
import {
  buildTrainerDayContext,
  buildCoachContext,
} from '../../services/ai/contextEngine/coachContextEngine.mjs';
import { dispatchBriefMyDay } from '../../services/ai/dispatchers/dayBriefDispatcher.mjs';

vi.mock('../../services/ai/contextEngine/clientAccess.mjs', () => ({
  checkClientAccess: vi.fn(),
  CLIENT_ACCESS_DENIED_MESSAGE: 'denied',
  parseContextClientId: (targetClientId) => {
    if (typeof targetClientId === 'number') {
      return Number.isSafeInteger(targetClientId) && targetClientId > 0 ? targetClientId : null;
    }

    if (typeof targetClientId !== 'string' || !/^[1-9]\d*$/.test(targetClientId)) {
      return null;
    }

    const parsed = Number(targetClientId);
    return Number.isSafeInteger(parsed) ? parsed : null;
  },
}));

const accessMock = vi.mocked(checkClientAccess);
const __dirname = dirname(fileURLToPath(import.meta.url));

const TRAINER = { id: 2, role: 'trainer' };
const ADMIN = { id: 1, role: 'admin' };

function fakeDaySequelize() {
  return {
    QueryTypes: { SELECT: 'SELECT' },
    query: vi.fn(async (sql, opts) => {
      if (/FROM sessions/.test(sql)) {
        return [
          { id: 31, sessionDate: '2026-06-10T17:00:00.000Z', duration: 60, status: 'scheduled', userId: 7, trainerId: 2 },
          { id: 32, sessionDate: '2026-06-10T18:30:00.000Z', duration: 30, status: 'confirmed', userId: 8, trainerId: 2 },
        ];
      }
      if (/FROM "Users" WHERE id IN/.test(sql)) {
        return [
          { id: 7, availableSessions: 1, streakDays: 4 },
          { id: 8, availableSessions: 10, streakDays: 0 },
        ];
      }
      // Must match the table the implementation ACTUALLY queries:
      // client_pain_entries (verified present in the live DB, with userId +
      // isActive columns). SWA-71 commit 093072b11 corrected 7 coach queries that
      // were hitting tables which do not exist — pain and goals never loaded — but
      // this fixture kept matching the old phantom /PainEntries/. It therefore
      // returned [] for every pain lookup, the "active pain" flag was never set,
      // and both assertions below broke and were written off as baseline noise.
      if (/client_pain_entries/.test(sql)) {
        return [{ userId: 7, activePain: 2 }];
      }
      return [];
    }),
  };
}

beforeEach(() => accessMock.mockReset());

describe('buildTrainerDayContext', () => {
  it('scopes trainers to their OWN sessions in SQL', async () => {
    const sequelize = fakeDaySequelize();
    await buildTrainerDayContext({ user: TRAINER, sequelize });
    const sessionCall = sequelize.query.mock.calls.find(([sql]) => /FROM sessions/.test(sql));
    expect(sessionCall[0]).toMatch(/"trainerId" = :trainerId/);
    expect(sessionCall[1].replacements.trainerId).toBe(2);
  });

  it('admins see all of today (no trainer filter)', async () => {
    const sequelize = fakeDaySequelize();
    await buildTrainerDayContext({ user: ADMIN, sequelize });
    const sessionCall = sequelize.query.mock.calls.find(([sql]) => /FROM sessions/.test(sql));
    expect(sessionCall[0]).not.toMatch(/"trainerId" = :trainerId/);
  });

  it('attaches de-identified per-client flags (pain, low credits)', async () => {
    const r = await buildTrainerDayContext({ user: TRAINER, sequelize: fakeDaySequelize() });
    expect(r.ok).toBe(true);
    expect(r.day.sessionCount).toBe(2);
    const flagged = r.day.sessions.find((s) => s.clientAlias === 'Client-7');
    expect(flagged.flags).toContain('active pain');
    expect(flagged.flags).toContain('credits low (1)');
    const clear = r.day.sessions.find((s) => s.clientAlias === 'Client-8');
    expect(clear.flags).toEqual([]);
    expect(JSON.stringify(r.day)).not.toMatch(/firstName|lastName|email/);
  });

  it('rejects client/user roles', async () => {
    const r = await buildTrainerDayContext({ user: { id: 9, role: 'client' }, sequelize: fakeDaySequelize() });
    expect(r.ok).toBe(false);
  });

  it('fails soft when the sessions query throws', async () => {
    const sequelize = { QueryTypes: { SELECT: 'SELECT' }, query: vi.fn(async () => { throw new Error('down'); }) };
    const r = await buildTrainerDayContext({ user: TRAINER, sequelize });
    expect(r.ok).toBe(false);
    expect(r.message).toContain('No data was changed');
  });
});

describe('gamification in buildCoachContext (A2)', () => {
  it('surfaces points/level/tier/streak from the profile row', async () => {
    accessMock.mockResolvedValue({ allowed: true, via: 'admin', reason: null });
    const sequelize = {
      QueryTypes: { SELECT: 'SELECT' },
      query: vi.fn(async (sql) => {
        if (/FROM "Users"/.test(sql)) {
          return [{ id: 7, firstName: 'Maria', availableSessions: 3, points: 1200, level: 5, tier: 'Rare', streakDays: 6, totalWorkouts: 42 }];
        }
        return [];
      }),
    };
    const r = await buildCoachContext({ user: ADMIN, targetClientId: 7, sequelize });
    expect(r.ok).toBe(true);
    expect(r.context.gamification).toEqual({
      points: 1200,
      level: 5,
      tier: 'Rare',
      rankTitle: 'First Flight',
      streakDays: 6,
      totalWorkouts: 42,
      badges: { displayedCount: 0, recent: [] },
    });
    expect(r.dataQuality.find((d) => d.domain === 'gamification')?.status).toBe('ok');
  });
});

describe('dispatchBriefMyDay', () => {
  it('formats the day sheet with flags and attention count', async () => {
    const r = await dispatchBriefMyDay({}, { user: TRAINER, options: { sequelize: fakeDaySequelize() } });
    expect(r.type).toBe('day_brief');
    expect(r.message).toContain('2 sessions');
    expect(r.message).toContain('Client-7');
    expect(r.message).toContain('active pain');
    expect(r.message).toContain('1 client needs attention');
  });

  it('returns a friendly empty-day message', async () => {
    const sequelize = { QueryTypes: { SELECT: 'SELECT' }, query: vi.fn(async () => []) };
    const r = await dispatchBriefMyDay({}, { user: TRAINER, options: { sequelize } });
    expect(r.type).toBe('day_brief');
    expect(r.message).toContain('No sessions on the books today');
  });
});

describe('wiring regression (source guards)', () => {
  const REGISTRY_SRC = readFileSync(resolve(__dirname, '../../services/ai/commandRegistry/dashboardCommands.mjs'), 'utf8');
  const DISPATCHER_SRC = readFileSync(resolve(__dirname, '../../services/ai/commandDispatcher.mjs'), 'utf8');

  it('brief_my_day registered read-only for admin+trainer, no client ref', () => {
    expect(REGISTRY_SRC).toMatch(/type: 'brief_my_day'/);
    const entry = REGISTRY_SRC.slice(REGISTRY_SRC.indexOf("type: 'brief_my_day'"), REGISTRY_SRC.indexOf("type: 'brief_client'"));
    expect(entry).toMatch(/destructive: false/);
    expect(entry).toMatch(/roleRequired: \['admin', 'trainer'\]/);
    expect(entry).toMatch(/requiresClientRef: false/);
  });

  it('brief_my_day has a dispatcher map entry', () => {
    expect(DISPATCHER_SRC).toMatch(/\['brief_my_day', dispatchBriefMyDay\]/);
  });
});
