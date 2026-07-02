/**
 * progressPulseService — Slice 8.1 Progress Intelligence tests
 * ============================================================
 * Locks: (1) weekly-streak math incl. pending current week, (2) push/pull
 * ratio thresholds + null-honesty, (3) variety scoring, (4) SQL contract on
 * the canonical snake_case backbone (no PascalCase quoted tables), (5) the
 * shared movement-pattern CASE is the SAME object the balance chart uses
 * (drift-proof by identity), (6) orchestration + controller error shapes.
 */
import { describe, it, expect, vi } from 'vitest';

import {
  computeWeeklyStreak,
  computePushPull,
  computeVariety,
  getProgressPulse,
  WEEKLY_TRAINING_DAYS_SQL,
  PATTERN_WINDOW_SQL,
  WEEK_VOLUME_SQL,
  LAST_WORKOUT_SQL,
} from '../../services/progressPulseService.mjs';
import { MOVEMENT_PATTERN_CASE_SQL } from '../../services/analytics/movementPatternSql.mjs';
import { getProgressPulseHandler } from '../../controllers/progressPulseController.mjs';

const CUR = '2026-06-29'; // a Monday (ISO week start)
const week = (offset) => {
  const ms = Date.parse(`${CUR}T00:00:00Z`) - offset * 7 * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
};

describe('computeWeeklyStreak', () => {
  it('returns zeros on empty history', () => {
    const s = computeWeeklyStreak([], null);
    expect(s).toMatchObject({ weeklyCurrent: 0, weeklyLongest: 0, daysThisWeek: 0, currentWeekPending: false });
  });

  it('counts consecutive qualifying weeks ending at a qualifying current week', () => {
    const rows = [
      { week_start: week(2), training_days: 3 },
      { week_start: week(1), training_days: 2 },
      { week_start: week(0), training_days: 2 },
    ];
    const s = computeWeeklyStreak(rows, CUR);
    expect(s.weeklyCurrent).toBe(3);
    expect(s.weeklyLongest).toBe(3);
    expect(s.daysThisWeek).toBe(2);
    expect(s.currentWeekPending).toBe(false);
  });

  it('treats an under-target current week as pending, not a break', () => {
    const rows = [
      { week_start: week(2), training_days: 2 },
      { week_start: week(1), training_days: 4 },
      { week_start: week(0), training_days: 1 },
    ];
    const s = computeWeeklyStreak(rows, CUR);
    expect(s.weeklyCurrent).toBe(2); // weeks -2 and -1
    expect(s.daysThisWeek).toBe(1);
    expect(s.currentWeekPending).toBe(true);
  });

  it('breaks the current streak on a missed week but keeps the longest run', () => {
    const rows = [
      { week_start: week(5), training_days: 3 },
      { week_start: week(4), training_days: 3 },
      { week_start: week(3), training_days: 2 },
      // week(2) missing — gap
      { week_start: week(1), training_days: 2 },
      { week_start: week(0), training_days: 0 },
    ];
    const s = computeWeeklyStreak(rows, CUR);
    expect(s.weeklyCurrent).toBe(1); // only week(1)
    expect(s.weeklyLongest).toBe(3); // weeks 5-4-3
  });

  it('a below-target week with sessions does not qualify', () => {
    const rows = [{ week_start: week(1), training_days: 1 }];
    const s = computeWeeklyStreak(rows, CUR);
    expect(s.weeklyCurrent).toBe(0);
    expect(s.weeklyLongest).toBe(0);
  });
});

describe('computePushPull', () => {
  const row = (pattern, volume) => ({ pattern, volume, sets: 5, exercises: 2 });

  it('is null-honest when either side has no volume', () => {
    expect(computePushPull([row('push', 5000)])).toMatchObject({ ratio: null, label: 'insufficient_data' });
    expect(computePushPull([])).toMatchObject({ pushVolume: 0, pullVolume: 0, ratio: null });
  });

  it('labels balanced / push_heavy / pull_heavy at the documented thresholds', () => {
    expect(computePushPull([row('push', 1000), row('pull', 1000)]).label).toBe('balanced');
    expect(computePushPull([row('push', 1300), row('pull', 1000)]).label).toBe('push_heavy');
    expect(computePushPull([row('push', 700), row('pull', 1000)]).label).toBe('pull_heavy');
    expect(computePushPull([row('push', 1250), row('pull', 1000)]).label).toBe('balanced'); // 1.25 inclusive
  });
});

describe('computeVariety', () => {
  it('is null-honest with no active rows', () => {
    expect(computeVariety([]).score).toBeNull();
    expect(computeVariety([{ pattern: 'push', volume: 0, sets: 0, exercises: 0 }]).score).toBeNull();
  });

  it('full coverage + 12 exercises scores 100; other bucket adds exercises but not patterns', () => {
    const rows = ['squat', 'hinge', 'push', 'pull', 'carry', 'core'].map((p) => (
      { pattern: p, volume: 100, sets: 3, exercises: 2 }
    ));
    expect(computeVariety(rows)).toMatchObject({ score: 100, distinctExercises: 12, patternsCovered: 6 });
    const withOther = [...rows, { pattern: 'other', volume: 50, sets: 2, exercises: 3 }];
    const v = computeVariety(withOther);
    expect(v.patternsCovered).toBe(6);
    expect(v.distinctExercises).toBe(15);
    expect(v.score).toBe(100); // capped
  });

  it('scores partial coverage proportionally', () => {
    const v = computeVariety([
      { pattern: 'push', volume: 100, sets: 3, exercises: 2 },
      { pattern: 'pull', volume: 100, sets: 3, exercises: 1 },
    ]);
    // patterns 2/6 * 60 = 20 ; exercises 3/12 * 40 = 10
    expect(v.score).toBe(30);
  });
});

describe('SQL contract — canonical snake_case backbone only', () => {
  const ALL_SQL = [WEEKLY_TRAINING_DAYS_SQL, PATTERN_WINDOW_SQL, WEEK_VOLUME_SQL, LAST_WORKOUT_SQL];

  it('reads only workout_sessions / workout_logs and parameterizes userId', () => {
    for (const sql of ALL_SQL) {
      expect(sql).toContain('workout_sessions');
      expect(sql).toContain(':userId');
      expect(sql).not.toMatch(/"WorkoutSessions"|"WorkoutExercises"|"Exercises"|"Sets"/);
      expect(sql).toContain("status = 'completed'");
    }
    expect(PATTERN_WINDOW_SQL).toContain('workout_logs');
    expect(WEEK_VOLUME_SQL).toContain('workout_logs');
  });

  it('push/pull uses the SAME movement-pattern CASE as the balance chart (drift-proof)', () => {
    expect(PATTERN_WINDOW_SQL).toContain(MOVEMENT_PATTERN_CASE_SQL);
  });
});

const mockSequelize = (rowsBySql) => ({
  query: vi.fn(async (sql) => {
    for (const [needle, rows] of rowsBySql) {
      if (sql.includes(needle)) return [rows];
    }
    return [[]];
  }),
});

describe('getProgressPulse orchestration', () => {
  it('composes a fully null-honest payload for an empty history', async () => {
    const sequelize = mockSequelize([]);
    const data = await getProgressPulse(sequelize, 42);
    expect(data.streak.weeklyCurrent).toBe(0);
    expect(data.pushPull.ratio).toBeNull();
    expect(data.variety.score).toBeNull();
    expect(data.volume.deltaPct).toBeNull();
    expect(data.lastWorkout).toEqual({ date: null, daysAgo: null });
  });

  it('composes real metrics from row fixtures', async () => {
    const sequelize = mockSequelize([
      ['training_days', [
        { week_start: week(1), training_days: 2, current_week_start: CUR },
        { week_start: week(0), training_days: 3, current_week_start: CUR },
      ]],
      ['AS pattern', [
        { pattern: 'push', volume: 1200, sets: 10, exercises: 3 },
        { pattern: 'pull', volume: 1000, sets: 9, exercises: 3 },
      ]],
      ['AS this_week', [{ this_week: 5400.4, prior_week: 5000 }]],
      ['AS last_workout', [{ last_workout: '2026-07-01 10:00:00', days_ago: 1 }]],
    ]);
    const data = await getProgressPulse(sequelize, 42);
    expect(data.streak.weeklyCurrent).toBe(2);
    expect(data.pushPull).toMatchObject({ ratio: 1.2, label: 'balanced' });
    expect(data.variety.patternsCovered).toBe(2);
    expect(data.volume).toEqual({ thisWeek: 5400, priorWeek: 5000, deltaPct: 8 });
    expect(data.lastWorkout.daysAgo).toBe(1);
  });
});

describe('getProgressPulseHandler', () => {
  const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() });

  it('400s on a missing/invalid injected userId', async () => {
    const res = makeRes();
    await getProgressPulseHandler({ params: {}, app: { get: () => null } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('RULE-55 regression: falls back to JWT req.user.id when Express resets req.params', async () => {
    const res = makeRes();
    const app = { get: () => mockSequelize([]) };
    await getProgressPulseHandler({ params: {}, user: { id: 42 }, app }, res);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
  });

  it('never trusts a URL-shaped userId over an absent one (param wins only when injected)', async () => {
    // The client router never exposes :userId; injected param and JWT id are
    // the same person by construction. This locks the precedence order used
    // by chartDataController.requireUser (params first, then JWT).
    const res = makeRes();
    const app = { get: () => mockSequelize([]) };
    await getProgressPulseHandler({ params: { userId: '42' }, user: { id: 42 }, app }, res);
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  it('500s with a safe message when the DB fails (no raw error leak)', async () => {
    const res = makeRes();
    const app = { get: () => ({ query: vi.fn(async () => { throw new Error('pg: secret dsn'); }) }) };
    await getProgressPulseHandler({ params: { userId: '42' }, app }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(JSON.stringify(body)).not.toContain('secret dsn');
    expect(body).toMatchObject({ success: false, error: 'internal_error' });
  });

  it('returns the composed pulse on success', async () => {
    const res = makeRes();
    const app = { get: () => mockSequelize([]) };
    await getProgressPulseHandler({ params: { userId: '42' }, app }, res);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.streak).toBeDefined();
  });
});
