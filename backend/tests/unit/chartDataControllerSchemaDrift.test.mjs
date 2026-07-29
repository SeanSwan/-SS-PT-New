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
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  // Phase 14 canonical 12
  getWorkoutFrequencyChart,
  getAttendanceReliabilityChart,
  getWeeklyVolumeChart,
  getSetsRepsTrendChart,
  getDurationTrendChart,
  getIntensityRPETrendChart,
  getPRTimelineChart,
  getAnchorLiftsChart,
  getExerciseFrequencyChart,
  getMovementPatternBalanceChart,
  getMuscleGroupBalanceChart,
  getRecoverySignalChart,
} from '../../controllers/chartDataController.mjs';

const makeReqRes = ({ sql = [], rows = [] } = {}) => {
  const querySpy = vi.fn(async (s) => {
    sql.push(s);
    return [rows]; // [rows, metadata]
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

const makeFailingReqRes = (error = new Error('database unavailable')) => {
  const querySpy = vi.fn(async () => {
    throw error;
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
  return { req, res, querySpy };
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

// ─────────────────────────────────────────────────────────────
// Phase 14 (2026-04-15) — 12 canonical chart endpoint locks
//
// Every canonical chart endpoint that reads from workout_logs MUST
// JOIN via the snake_case table names. The five broken pre-Phase-14
// endpoints that referenced `"WorkoutExercises"` / `"Exercises"` /
// `"Sets"` are now deprecated to empty-array stubs — the tests below
// lock that contract.
// ─────────────────────────────────────────────────────────────

/**
 * Shared anti-regression: no canonical SQL may reference any of the
 * non-existent PascalCase tables from the pre-Phase-14 drift era.
 */
const FORBIDDEN_TABLES = [
  /"WorkoutSessions"/,
  /"WorkoutExercises"/,
  /"Exercises"/,
  /"Sets"/,
];

function assertNoForbiddenTables(sql) {
  for (const pattern of FORBIDDEN_TABLES) {
    expect(sql).not.toMatch(pattern);
  }
}

describe('Phase 14 — chart-attendance-reliability', () => {
  it('groups by ws.status on workout_sessions with a 90 day window', async () => {
    const { req, res, sql } = makeReqRes();
    await getAttendanceReliabilityChart(req, res);
    const executedSql = sql[0];
    expect(executedSql).toMatch(/FROM\s+workout_sessions/i);
    expect(executedSql).toMatch(/GROUP BY\s+ws\.status/i);
    expect(executedSql).toMatch(/INTERVAL\s+'90 days'/);
    assertNoForbiddenTables(executedSql);
  });

  it('returns reliabilityPercent and status totals', async () => {
    const { req, res } = makeReqRes();
    await getAttendanceReliabilityChart(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        reliabilityPercent: expect.any(Number),
        totals: expect.objectContaining({
          completed: expect.any(Number),
          skipped: expect.any(Number),
          cancelled: expect.any(Number),
          resolved: expect.any(Number),
        }),
      }),
    );
  });
});

describe('Phase 14 — chart-weekly-volume', () => {
  it('computes SUM(wl.weight * wl.reps) grouped by week from workout_logs', async () => {
    const { req, res, sql } = makeReqRes();
    await getWeeklyVolumeChart(req, res);
    const executedSql = sql[0];
    expect(executedSql).toMatch(/FROM\s+workout_logs\s+wl/i);
    expect(executedSql).toMatch(/JOIN\s+workout_sessions\s+ws/i);
    expect(executedSql).toMatch(/SUM\(wl\.weight\s*\*\s*wl\.reps\)/i);
    expect(executedSql).toMatch(/DATE_TRUNC\('week'/);
    assertNoForbiddenTables(executedSql);
  });

  it('surfaces query failures as unavailable chart data instead of empty success', async () => {
    const { req, res } = makeFailingReqRes();

    await getWeeklyVolumeChart(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unable to load chart data',
      error: 'internal_error',
    });
  });
});

describe('Phase 14 — chart-sets-reps-trend', () => {
  it('reads counts(*) and SUM(wl.reps) from workout_logs', async () => {
    const { req, res, sql } = makeReqRes();
    await getSetsRepsTrendChart(req, res);
    const executedSql = sql[0];
    expect(executedSql).toMatch(/FROM\s+workout_logs\s+wl/i);
    expect(executedSql).toMatch(/COUNT\(\*\)/);
    expect(executedSql).toMatch(/SUM\(wl\.reps\)/i);
    assertNoForbiddenTables(executedSql);
  });

  it('returns dual series: sets and reps', async () => {
    const { req, res } = makeReqRes();
    await getSetsRepsTrendChart(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          sets: expect.any(Array),
          reps: expect.any(Array),
        }),
      }),
    );
  });
});

describe('Phase 14 — chart-duration-trend', () => {
  it('reads ws.duration from workout_sessions, filters to duration > 0', async () => {
    const { req, res, sql } = makeReqRes();
    await getDurationTrendChart(req, res);
    const executedSql = sql[0];
    expect(executedSql).toMatch(/FROM\s+workout_sessions\s+ws/i);
    expect(executedSql).toMatch(/ws\.duration/i);
    expect(executedSql).toMatch(/ws\.duration\s*>\s*0/i);
    assertNoForbiddenTables(executedSql);
  });

  it('ships the raw timestamp alongside MM/DD so the heatmap can bucket the user-LOCAL day', async () => {
    // Sean's 2026-07-12 ruling: user-local bucketing wins — the client needs
    // the real instant, not a server-rendered calendar-day string.
    const { req, res, sql } = makeReqRes({
      rows: [{ date: '07/06', ts: '2026-07-06T05:00:00.000Z', duration: 45 }],
    });
    await getDurationTrendChart(req, res);
    expect(sql[0]).toMatch(/ws\.date\s+AS\s+ts/i);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [{ x: '07/06', y: 45, ts: '2026-07-06T05:00:00.000Z' }],
      }),
    );
  });
});

describe('Phase 14 — chart-intensity-rpe-trend', () => {
  it('joins workout_logs LEFT JOIN with precedence: AVG(wl.rpe) then AVG(ws.intensity)', async () => {
    const { req, res, sql } = makeReqRes();
    await getIntensityRPETrendChart(req, res);
    const executedSql = sql[0];
    expect(executedSql).toMatch(/FROM\s+workout_sessions\s+ws/i);
    expect(executedSql).toMatch(/LEFT JOIN\s+workout_logs\s+wl/i);
    expect(executedSql).toMatch(/AVG\(wl\.rpe\)/i);
    expect(executedSql).toMatch(/AVG\(ws\.intensity\)/i);
    assertNoForbiddenTables(executedSql);
  });

  it('omits weeks with no logged RPE or intensity instead of emitting a fake zero point', async () => {
    const { req, res } = makeReqRes({
      rows: [
        {
          week: '05/10',
          avg_rpe: null,
          avg_intensity: null,
          rpe_count: 0,
        },
      ],
    });

    await getIntensityRPETrendChart(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });
});

describe('Phase 14 — chart-pr-timeline', () => {
  it('reads workout_logs heaviest set per exercise per day, filtered to weight > 0', async () => {
    const { req, res, sql } = makeReqRes();
    await getPRTimelineChart(req, res);
    const executedSql = sql[0];
    expect(executedSql).toMatch(/FROM\s+workout_logs\s+wl/i);
    expect(executedSql).toMatch(/JOIN\s+workout_sessions\s+ws/i);
    expect(executedSql).toMatch(/wl\.weight\s*>\s*0/);
    expect(executedSql).toMatch(/DISTINCT ON/i);
    assertNoForbiddenTables(executedSql);
  });
});

describe('Phase 14 — chart-anchor-lifts', () => {
  it('uses a CTE to pick top-3 exercises by session count, then queries their progression', async () => {
    const { req, res, sql } = makeReqRes();
    await getAnchorLiftsChart(req, res);
    const executedSql = sql[0];
    expect(executedSql).toMatch(/WITH\s+top_exercises/i);
    expect(executedSql).toMatch(/LIMIT\s+3/i);
    expect(executedSql).toMatch(/FROM\s+workout_logs/i);
    assertNoForbiddenTables(executedSql);
  });

  it('returns data keyed by exercise name and a top-level exercises list', async () => {
    const { req, res } = makeReqRes();
    await getAnchorLiftsChart(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.any(Object),
        exercises: expect.any(Array),
      }),
    );
  });
});

describe('Phase 14 — chart-exercise-frequency', () => {
  it('groups all completed workout_logs by exerciseName without truncating the diary', async () => {
    const { req, res, sql } = makeReqRes();
    await getExerciseFrequencyChart(req, res);
    const executedSql = sql[0];
    expect(executedSql).toMatch(/FROM\s+workout_logs\s+wl/i);
    // Case/whitespace-insensitive grouping (2026-07-16 data-truth fix) — merges
    // 'Bench Press' and 'bench press' into one diary row instead of two.
    expect(executedSql).toMatch(/GROUP BY\s+LOWER\(TRIM\(wl\."exerciseName"\)\)/i);
    expect(executedSql).not.toMatch(/LIMIT\s+\d+/i);
    expect(executedSql).not.toMatch(/INTERVAL\s+'90 days'/i);
    assertNoForbiddenTables(executedSql);
  });
});

describe('Phase 14 — chart-movement-pattern-balance', () => {
  it('uses ILIKE CASE mapping on exerciseName to aggregate by NASM movement pattern', async () => {
    const { req, res, sql } = makeReqRes();
    await getMovementPatternBalanceChart(req, res);
    const executedSql = sql[0];
    expect(executedSql).toMatch(/CASE/i);
    expect(executedSql).toMatch(/ILIKE\s+'%squat%'/i);
    expect(executedSql).toMatch(/ILIKE\s+'%deadlift%'/i);
    expect(executedSql).toMatch(/ILIKE\s+'%bench%'/i);
    expect(executedSql).toMatch(/ILIKE\s+'%row%'/i);
    expect(executedSql).toMatch(/ELSE\s+'other'/i);
    expect(executedSql).toMatch(/FROM\s+workout_logs\s+wl/i);
    assertNoForbiddenTables(executedSql);
  });
});

describe('Phase 14 — chart-muscle-group-balance', () => {
  it('replaces the broken muscle-group-focus chain with workout_logs ILIKE mapping', async () => {
    const { req, res, sql } = makeReqRes();
    await getMuscleGroupBalanceChart(req, res);
    const executedSql = sql[0];
    expect(executedSql).toMatch(/CASE/i);
    expect(executedSql).toMatch(/FROM\s+workout_logs\s+wl/i);
    // The shared classifier (muscleGroupSql.mjs) emits canonical LOWERCASE
    // keys; the Title-case display label is applied in JS via MUSCLE_GROUP_DISPLAY.
    expect(executedSql).toMatch(/'chest'/);
    expect(executedSql).toMatch(/'back'/);
    expect(executedSql).toMatch(/'legs'/);
    expect(executedSql).toMatch(/'core'/);
    assertNoForbiddenTables(executedSql);
  });
});

describe('Phase 14 / 15.0 — chart-recovery-signal', () => {
  it('filters BOTH wl.notes AND wl."exerciseNote" by pain keywords (Phase 15.0)', async () => {
    const { req, res, sql } = makeReqRes();
    await getRecoverySignalChart(req, res);
    const executedSql = sql[0];
    expect(executedSql).toMatch(/FROM\s+workout_logs\s+wl/i);
    // Phase 15.0: the recovery signal must scan the dedicated
    // exerciseNote column too, or transcript-derived exercise-level
    // observations will be silently lost from analytics after the
    // Phase 13.2 set-1 encoding is removed.
    expect(executedSql).toMatch(/wl\.notes\s*~\*/);
    expect(executedSql).toMatch(/wl\."exerciseNote"\s*~\*/);
    expect(executedSql).toMatch(/pain\|hurt\|sore/);
    expect(executedSql).toMatch(/\\m/); // Postgres word-boundary anchors
    expect(executedSql).toMatch(/FILTER\s*\(\s*WHERE\s+wl\.rpe\s*>=\s*9\s*\)/i);
    assertNoForbiddenTables(executedSql);
  });

  it('only returns exercises with at least one flag (HAVING clause)', async () => {
    const { req, res, sql } = makeReqRes();
    await getRecoverySignalChart(req, res);
    const executedSql = sql[0];
    expect(executedSql).toMatch(/HAVING/i);
  });
});

// ─────────────────────────────────────────────────────────────
// Route wiring lock: both client and admin route files must
// expose all 12 canonical endpoints.
// ─────────────────────────────────────────────────────────────

describe('Phase 14 — route wiring for 12 canonical chart endpoints', () => {
  // cwd may be `backend/` or the repo root depending on how vitest is
  // invoked — resolve against both to keep this test portable.
  const resolveRoutes = (relative) => {
    const fromCwd = resolve(process.cwd(), relative);
    try {
      return readFileSync(fromCwd, 'utf8');
    } catch {
      return readFileSync(resolve(process.cwd(), 'backend', relative), 'utf8');
    }
  };
  const CLIENT_ROUTES = resolveRoutes('routes/clientAnalyticsRoutes.mjs');
  const ADMIN_ROUTES = resolveRoutes('routes/analyticsRoutes.mjs');

  const CANONICAL_SUFFIXES = [
    'chart-workout-frequency',
    'chart-attendance-reliability',
    'chart-weekly-volume',
    'chart-sets-reps-trend',
    'chart-duration-trend',
    'chart-intensity-rpe-trend',
    'chart-pr-timeline',
    'chart-anchor-lifts',
    'chart-exercise-frequency',
    'chart-movement-pattern-balance',
    'chart-muscle-group-balance',
    'chart-recovery-signal',
  ];

  it.each(CANONICAL_SUFFIXES)(
    'clientAnalyticsRoutes.mjs registers %s on the JWT-derived client path',
    (suffix) => {
      expect(CLIENT_ROUTES).toContain(`/${suffix}`);
    },
  );

  it.each(CANONICAL_SUFFIXES)(
    'analyticsRoutes.mjs registers /:userId/%s on the admin/trainer path',
    (suffix) => {
      expect(ADMIN_ROUTES).toContain(`/:userId/${suffix}`);
    },
  );
});
