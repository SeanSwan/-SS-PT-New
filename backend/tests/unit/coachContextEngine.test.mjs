/**
 * coachContextEngine.test.mjs
 * ===========================
 * Slice A1 — the hive-mind read layer:
 *   - denied access loads ZERO domains
 *   - failing domain degrades, never throws
 *   - output is de-identified (no names leak)
 *   - PII-free extras attach (credits, schedule summary)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkClientAccess } from '../../services/ai/contextEngine/clientAccess.mjs';
import { buildCoachContext, CONTEXT_DOMAINS } from '../../services/ai/contextEngine/coachContextEngine.mjs';

vi.mock('../../services/ai/contextEngine/clientAccess.mjs', () => ({
  checkClientAccess: vi.fn(),
  CLIENT_ACCESS_DENIED_MESSAGE: "You don't have access to that client's data. Ask an admin to assign this client to you.",
}));

const accessMock = vi.mocked(checkClientAccess);
const TRAINER = { id: 2, role: 'trainer' };

function fakeSequelize({ failDomain = null } = {}) {
  return {
    QueryTypes: { SELECT: 'SELECT' },
    query: vi.fn(async (sql) => {
      if (failDomain === 'pain' && /PainEntries/.test(sql)) throw new Error('pain table down');
      if (/FROM "Users"/.test(sql)) {
        return [{
          id: 7, firstName: 'Maria', lastName: 'Lopez', age: 41, gender: 'female',
          nasmPhase: 2, trainingExperience: 'intermediate', fitnessGoals: 'strength',
          clientSource: 'swanstudios', isActive: true, availableSessions: 1,
        }];
      }
      if (/workout_sessions/.test(sql)) {
        return [{ id: 11, title: 'Lower body', createdAt: '2026-06-01', duration: 60, intensity: 7, exercises: [{ exerciseName: 'goblet squat', setNumber: 1, reps: 10, weight: 50 }] }];
      }
      if (/PainEntries/.test(sql)) return [{ bodyPart: 'knee', level: 7, isActive: true }];
      if (/MacroLogs/.test(sql)) return [{ calories: 2000, protein: 150, carbs: 180, fat: 70 }];
      if (/"Goals"/.test(sql)) return [{ title: 'Run 5k', description: '', progress: 40, status: 'active' }];
      if (/FROM sessions/.test(sql)) return [{ id: 31, sessionDate: '2026-06-15T17:00:00.000Z', duration: 60, status: 'scheduled' }];
      return [];
    }),
  };
}

beforeEach(() => {
  accessMock.mockReset();
});

describe('buildCoachContext', () => {
  it('denied access loads ZERO domains', async () => {
    accessMock.mockResolvedValue({ allowed: false, via: null, reason: 'not_assigned' });
    const sequelize = fakeSequelize();
    const r = await buildCoachContext({ user: TRAINER, targetClientId: 7, sequelize });
    expect(r.ok).toBe(false);
    expect(r.deniedReason).toBe('not_assigned');
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it('assembles a de-identified cross-domain context — names never leak', async () => {
    accessMock.mockResolvedValue({ allowed: true, via: 'assignment', reason: null });
    const r = await buildCoachContext({ user: TRAINER, targetClientId: 7, sequelize: fakeSequelize() });

    expect(r.ok).toBe(true);
    const serialized = JSON.stringify(r.context);
    expect(serialized).not.toContain('Maria');
    expect(serialized).not.toContain('Lopez');
    expect(r.context.clientAlias).toBe('Client-7');
    expect(r.context.sessionCredits).toBe(1);
    expect(r.context.schedule.upcomingCount).toBe(1);
    expect(r.context.schedule.nextSessionDate).toContain('2026-06-15');
    expect(r.context.lastWorkoutDate).toBe('2026-06-01');
    // aliasMap retains the real name for SERVER-SIDE re-hydration only
    expect(r.aliasMap['Client-7']).toContain('Maria');
  });

  it('a failing domain degrades instead of throwing', async () => {
    accessMock.mockResolvedValue({ allowed: true, via: 'admin', reason: null });
    const r = await buildCoachContext({ user: { id: 1, role: 'admin' }, targetClientId: 7, sequelize: fakeSequelize({ failDomain: 'pain' }) });

    expect(r.ok).toBe(true);
    const pain = r.dataQuality.find((d) => d.domain === 'pain');
    expect(pain.status).toBe('degraded');
    expect(r.context.painEntries).toEqual([]);
  });

  it('reports gamification status following the profile domain (live since A2)', async () => {
    accessMock.mockResolvedValue({ allowed: true, via: 'admin', reason: null });
    const r = await buildCoachContext({ user: { id: 1, role: 'admin' }, targetClientId: 7, sequelize: fakeSequelize() });
    expect(r.dataQuality.find((d) => d.domain === 'gamification')?.status).toBe('ok');
    expect(r.context.gamification).toBeDefined();
  });

  it('covers all v1 domains', () => {
    expect(CONTEXT_DOMAINS).toEqual(['profile', 'workouts', 'pain', 'macros', 'goals', 'schedule']);
  });
});
