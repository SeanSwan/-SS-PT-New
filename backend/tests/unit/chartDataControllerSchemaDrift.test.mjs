/**
 * chartDataController — schema-drift regression tests
 * =====================================================
 * Locks the SQL table-name contract for the default-visible charts on the
 * canonical /dashboard/client/progress surface.
 *
 * Regression intent (canonical-surface-audit 2026-04-13, chart chain):
 *   The prior chart SQL referenced `"WorkoutSessions"`, `"WorkoutExercises"`,
 *   `"Exercises"`, `"Sets"` — all PascalCase quoted. Live DB introspection
 *   (information_schema.tables WHERE name ~ '^[A-Z]') returns ZERO PascalCase
 *   tables. The real names are snake_case: workout_sessions, workout_exercises,
 *   exercises, sets. Postgres quoted identifiers are case-sensitive, so every
 *   such query errored with `relation "..." does not exist`.
 *
 *   The safeQuery helper (chartDataController.mjs:22-33) catches the error
 *   silently and returns [], so the frontend showed "No data yet" on canonical
 *   /progress for every user with real data. Sean has 11 completed sessions
 *   in workout_sessions — none of them ever reached the WorkoutFrequencyBar.
 *
 * Mocking strategy: pass a fake sequelize with a spyable `.query()` into
 * req.app.get('sequelize'), call the controller handler, and assert the SQL
 * string contains the correct snake_case table name (unquoted).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getWorkoutFrequencyChart } from '../../controllers/chartDataController.mjs';

const makeReqRes = ({ sql = [] } = {}) => {
  const querySpy = vi.fn(async (s) => {
    sql.push(s);
    return [[]]; // [rows, metadata]
  });
  const fakeSequelize = { query: querySpy };
  const req = {
    params: { userId: '42' },
    app: { get: vi.fn((k) => (k === 'sequelize' ? fakeSequelize : undefined)) },
  };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return { req, res, querySpy, sql };
};

describe('chartDataController — canonical /progress default-visible charts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWorkoutFrequencyChart — SQL table-name lock', () => {
    it('queries the real `workout_sessions` snake_case table (not "WorkoutSessions")', async () => {
      const { req, res, querySpy, sql } = makeReqRes();

      await getWorkoutFrequencyChart(req, res);

      expect(querySpy).toHaveBeenCalledTimes(1);
      const executedSql = sql[0];

      // HARD ASSERTIONS — the real prod table is snake_case, no quotes needed.
      // Postgres quoted identifiers are case-sensitive; "WorkoutSessions" does
      // NOT exist as a relation and would error → safeQuery would swallow it.
      expect(executedSql).toMatch(/FROM\s+workout_sessions/i);
      expect(executedSql).not.toMatch(/FROM\s+"WorkoutSessions"/);
      expect(executedSql).not.toMatch(/"WorkoutSessions"/);
    });

    it('returns a 200 with success + data array even on empty result', async () => {
      const { req, res } = makeReqRes();

      await getWorkoutFrequencyChart(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Array) }),
      );
    });

    it('rejects invalid userId with 400', async () => {
      const { req, res } = makeReqRes();
      req.params.userId = 'not-a-number';

      await getWorkoutFrequencyChart(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it('references status, date, and userId columns that actually exist on workout_sessions', async () => {
      // Schema cross-check: the real workout_sessions table has these columns
      // (verified via live information_schema.columns query). Locking the SQL
      // to reference them keeps the chart aligned with prod schema.
      const { req, res, sql } = makeReqRes();

      await getWorkoutFrequencyChart(req, res);
      const executedSql = sql[0];

      expect(executedSql).toMatch(/ws\.?"?userId"?/);
      expect(executedSql).toMatch(/ws\.?"?date"?/);
      expect(executedSql).toMatch(/ws\.?"?status"?/);
      expect(executedSql).toMatch(/'completed'/);
    });
  });
});
