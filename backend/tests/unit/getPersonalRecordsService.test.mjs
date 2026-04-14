/**
 * analyticsService.getPersonalRecords — canonical /progress PR rewire
 * ====================================================================
 * Locks the SQL + mapping contract for Personal Records on the canonical
 * /dashboard/client/progress surface.
 *
 * Regression intent (canonical-surface-audit 2026-04-13, PR rewire slice):
 *   The prior service used Sequelize ORM with includes through an empty,
 *   schema-drifted chain: WorkoutSession → WorkoutExercise → Set. Real prod
 *   schema:
 *     - workout_exercises (0 rows, no `exerciseName` column, `exerciseId` only)
 *     - sets (0 rows, real columns are weightUsed/repsCompleted — not weight/reps)
 *     - workout_sessions (11 rows, real date column is `date` — not `sessionDate`)
 *   The real per-set data for Sean's 11 production sessions lives in
 *   workout_logs (109 rows): sessionId, exerciseName, reps, weight, rpe, tempo.
 *
 *   Frontend consumer ClientProgressDashboardPage fetches
 *   /api/client/analytics/personal-records and unwraps `res.data.data` as an
 *   array of records. It reads: exerciseName, weight, reps, date, unit.
 *   The prior service returned [] for every real user, so the PRs stat card
 *   always showed 0 and the "Personal Records Highlights" block (gated by
 *   personalRecords.length > 0) never rendered. Rule 28 claim-to-evidence
 *   breach on a canonical surface.
 *
 * Mocking strategy: mock ../../database.mjs so `sequelize.query()` is a spy.
 * Assert the SQL string hits workout_logs + workout_sessions, and that the
 * mapped result matches the frontend-expected shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { querySpy } = vi.hoisted(() => ({
  querySpy: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({
  default: { query: querySpy },
}));

// Stub the models index so the service can still call getWorkoutSession()
// without pulling in the real association graph. The new implementation
// must NOT depend on WorkoutSession/WorkoutExercise/Set associations at all.
vi.mock('../../models/index.mjs', () => ({
  getWorkoutSession: vi.fn(() => ({ name: 'WorkoutSession' })),
  getModel: vi.fn(() => null),
  Op: {
    gte: Symbol('gte'),
    lte: Symbol('lte'),
  },
}));

import { getPersonalRecords } from '../../services/analyticsService.mjs';

describe('analyticsService.getPersonalRecords — canonical /progress PR rewire', () => {
  beforeEach(() => {
    querySpy.mockReset();
  });

  it('queries workout_logs JOIN workout_sessions (real data path), not the empty workout_exercises/sets chain', async () => {
    querySpy.mockResolvedValue([[]]);

    await getPersonalRecords(42);

    expect(querySpy).toHaveBeenCalledTimes(1);
    const [sqlArg] = querySpy.mock.calls[0];

    // HARD ASSERTIONS — real data source
    expect(sqlArg).toMatch(/FROM\s+workout_logs/i);
    expect(sqlArg).toMatch(/JOIN\s+workout_sessions/i);
    expect(sqlArg).toMatch(/"sessionId"/);
    expect(sqlArg).toMatch(/"exerciseName"/);
    expect(sqlArg).toMatch(/ws\."userId"\s*=\s*:userId/);
    expect(sqlArg).toMatch(/ws\.status\s*=\s*'completed'/);

    // Negative assertions — the old schema-drifted path must not reappear
    expect(sqlArg).not.toMatch(/workout_exercises/i);
    expect(sqlArg).not.toMatch(/FROM\s+sets\b/i);
    expect(sqlArg).not.toMatch(/"Sets"/);
    expect(sqlArg).not.toMatch(/"WorkoutExercises"/);
    expect(sqlArg).not.toMatch(/weightUsed/); // real sets column, but wrong table
    expect(sqlArg).not.toMatch(/repsCompleted/);
    expect(sqlArg).not.toMatch(/sessionDate/); // drift — real column is `date`
  });

  it('passes the userId as a replacement parameter (not string-interpolated, prevents injection)', async () => {
    querySpy.mockResolvedValue([[]]);

    await getPersonalRecords(42);

    const [, options] = querySpy.mock.calls[0];
    expect(options).toMatchObject({ replacements: { userId: 42 } });
  });

  it('maps real workout_logs rows into the frontend-expected record shape', async () => {
    // Simulate 3 distinct PRs coming back from the SQL query.
    // The service must map them to { exerciseName, weight, reps, date, sessionId, unit }.
    querySpy.mockResolvedValue([
      [
        {
          exercise_name: 'Bench Press',
          max_weight: 185.0,
          reps_at_max: 5,
          session_date: new Date('2026-04-10T10:00:00Z'),
          session_id: 'uuid-1',
        },
        {
          exercise_name: 'Squat',
          max_weight: 245.0,
          reps_at_max: 3,
          session_date: new Date('2026-04-08T10:00:00Z'),
          session_id: 'uuid-2',
        },
        {
          exercise_name: 'Deadlift',
          max_weight: 315.0,
          reps_at_max: 2,
          session_date: new Date('2026-04-05T10:00:00Z'),
          session_id: 'uuid-3',
        },
      ],
    ]);

    const records = await getPersonalRecords(42);

    expect(records).toHaveLength(3);
    // Each record must expose the fields the frontend reads on
    // ClientProgressDashboardPage.tsx:480-486
    const bench = records.find((r) => r.exerciseName === 'Bench Press');
    expect(bench).toBeDefined();
    expect(bench).toMatchObject({
      exerciseName: 'Bench Press',
      weight: 185.0,
      reps: 5,
      sessionId: 'uuid-1',
      unit: 'lbs',
    });
    expect(bench.date).toBeDefined();
  });

  it('returns an empty array (not throw) when no workout_logs rows exist for the user', async () => {
    querySpy.mockResolvedValue([[]]);

    const records = await getPersonalRecords(99);

    expect(records).toEqual([]);
  });

  it('filters out rows with null/zero weight (cannot be a PR)', async () => {
    // The SQL itself should exclude these, but the service must not crash
    // if the DB driver returns a null/0 row defensively.
    querySpy.mockResolvedValue([
      [
        { exercise_name: 'Bench Press', max_weight: 185, reps_at_max: 5, session_date: new Date(), session_id: 'a' },
        { exercise_name: 'Plank', max_weight: 0, reps_at_max: 60, session_date: new Date(), session_id: 'b' },
        { exercise_name: 'Stretch', max_weight: null, reps_at_max: null, session_date: new Date(), session_id: 'c' },
      ],
    ]);

    const records = await getPersonalRecords(42);
    // Only the real PR row survives
    expect(records.map((r) => r.exerciseName)).toEqual(['Bench Press']);
  });

  it('SQL orders results so strongest PRs come first (frontend slices top 4 for Highlights)', async () => {
    querySpy.mockResolvedValue([[]]);

    await getPersonalRecords(42);
    const [sqlArg] = querySpy.mock.calls[0];

    // Frontend does personalRecords.slice(0, 4) for the Highlights block,
    // so the service must return records already sorted by max_weight DESC.
    expect(sqlArg).toMatch(/ORDER\s+BY\s+max_weight\s+DESC/i);
  });
});
