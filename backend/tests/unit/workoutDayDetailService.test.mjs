/**
 * workoutDayDetailService — Slice 8.4 chart drill-down tests
 * ==========================================================
 * Locks: MM/DD label validation, snake_case SQL contract, ownership scoping
 * (sessions by userId; logs only via owned session ids), grouping math,
 * null-honesty on unknown labels, and the controller's error shapes.
 */
import { describe, it, expect, vi } from 'vitest';

import {
  getWorkoutDayDetail,
  groupDayLogs,
  MD_LABEL_REGEX,
  RESOLVE_MD_SQL,
  DAY_SESSIONS_SQL,
  DAY_LOGS_SQL,
} from '../../services/workoutDayDetailService.mjs';
import { getWorkoutDayHandler } from '../../controllers/progressPulseController.mjs';

describe('SQL contract', () => {
  it('uses only canonical snake_case tables, parameterized', () => {
    for (const sql of [RESOLVE_MD_SQL, DAY_SESSIONS_SQL]) {
      expect(sql).toContain('workout_sessions');
      expect(sql).toContain(':userId');
      expect(sql).toContain("status = 'completed'");
      expect(sql).not.toMatch(/"WorkoutSessions"|"WorkoutExercises"|"Exercises"|"Sets"/);
    }
    expect(DAY_LOGS_SQL).toContain('workout_logs');
    expect(DAY_LOGS_SQL).toContain(':sessionIds');
    // Ownership: logs are NOT filtered by userId directly — they must come
    // only from session ids already scoped to the owner.
    expect(DAY_LOGS_SQL).not.toContain(':userId');
  });

  it('label regex accepts MM/DD only', () => {
    expect(MD_LABEL_REGEX.test('07/01')).toBe(true);
    expect(MD_LABEL_REGEX.test('7/1')).toBe(false);
    expect(MD_LABEL_REGEX.test('2026-07-01')).toBe(false);
    expect(MD_LABEL_REGEX.test("07/01'; DROP TABLE x;--")).toBe(false);
  });
});

describe('groupDayLogs', () => {
  it('groups set rows under exercises per session, null-honest numbers', () => {
    const sessions = [{ id: 9, duration: 45, start_time: '10:00' }];
    const logs = [
      { session_id: 9, exercise: 'Bench Press', reps: 8, weight: 135, rpe: 7 },
      { session_id: 9, exercise: 'Bench Press', reps: 8, weight: 140, rpe: null },
      { session_id: 9, exercise: 'TRX Row', reps: 12, weight: null, rpe: 6 },
      { session_id: 777, exercise: 'Ghost', reps: 1, weight: 1, rpe: 1 }, // foreign row dropped
    ];
    const grouped = groupDayLogs(sessions, logs);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({ id: 9, duration: 45, startTime: '10:00' });
    expect(grouped[0].exercises).toHaveLength(2);
    expect(grouped[0].exercises[0].sets).toEqual([
      { reps: 8, weight: 135, rpe: 7 },
      { reps: 8, weight: 140, rpe: null },
    ]);
    expect(grouped[0].exercises[1].sets[0].weight).toBeNull();
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

describe('getWorkoutDayDetail', () => {
  it('rejects malformed labels without touching the DB', async () => {
    const sequelize = mockSequelize([]);
    const out = await getWorkoutDayDetail(sequelize, 42, 'DROP TABLE');
    expect(out).toMatchObject({ date: null, sessions: [], invalidLabel: true });
    expect(sequelize.query).not.toHaveBeenCalled();
  });

  it('returns null date + empty sessions for an unmatched label', async () => {
    const out = await getWorkoutDayDetail(mockSequelize([]), 42, '01/01');
    expect(out).toEqual({ date: null, sessions: [] });
  });

  it('resolves label -> date -> sessions -> grouped logs', async () => {
    const sequelize = mockSequelize([
      ['iso_date', [{ iso_date: '2026-07-01' }]],
      ['start_time', [{ id: 9, duration: 45, start_time: '10:00' }]],
      ['session_id', [
        { session_id: 9, exercise: 'Goblet Squat', reps: 10, weight: 50, rpe: 8 },
      ]],
    ]);
    const out = await getWorkoutDayDetail(sequelize, 42, '07/01');
    expect(out.date).toBe('2026-07-01');
    expect(out.sessions[0].exercises[0]).toMatchObject({ name: 'Goblet Squat' });
  });
});

describe('getWorkoutDayHandler', () => {
  const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() });

  it('400s on invalid label; falls back to JWT user id (Rule 55)', async () => {
    const res = makeRes();
    await getWorkoutDayHandler(
      { params: {}, user: { id: 42 }, query: { md: 'bogus' }, app: { get: () => mockSequelize([]) } },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toBe('Invalid date label');
  });

  it('500s safely without leaking the raw error', async () => {
    const res = makeRes();
    const app = { get: () => ({ query: vi.fn(async () => { throw new Error('dsn secret'); }) }) };
    await getWorkoutDayHandler({ params: { userId: '42' }, query: { md: '07/01' }, app }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('dsn secret');
  });

  it('returns grouped day detail on success', async () => {
    const res = makeRes();
    const app = {
      get: () => mockSequelize([
        ['iso_date', [{ iso_date: '2026-07-01' }]],
        ['start_time', [{ id: 9, duration: 45, start_time: '10:00' }]],
      ]),
    };
    await getWorkoutDayHandler({ params: { userId: '42' }, query: { md: '07/01' }, app }, res);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.date).toBe('2026-07-01');
  });
});
