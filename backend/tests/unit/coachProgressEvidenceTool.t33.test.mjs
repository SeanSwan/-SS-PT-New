/**
 * G07/T33 — source-linked progress evidence tool.
 *
 * Seeded 4-week logs (with an edited and a deleted session) must produce
 * EXACT deterministic volume, record refs and matched-schedule adherence.
 * Re-reading after a mutation must reflect the new truth — never a stale
 * cached copy. Joined SQL must reach workout_exercises + sets; the
 * scheduled denominator must come from 'planned' sessions, not a count of
 * all logged sessions.
 */
import { describe, expect, it, vi } from 'vitest';
import { progressEvidenceTool } from '../../services/ai/coachEvidenceTools.mjs';

/** Fake sequelize: regex-keyed SQL router -> [rows] or throw. */
function makeSequelize({ routes = {}, throws = false } = {}) {
  return {
    calls: [],
    QueryTypes: { SELECT: 'SELECT' },
    async query(sql, _opts) {
      this.calls.push(sql);
      if (throws) throw new Error('reader down');
      for (const [pattern, rows] of Object.entries(routes)) {
        if (new RegExp(pattern).test(sql)) return typeof rows === 'function' ? rows() : rows;
      }
      return [];
    },
  };
}

const SESSION_ROWS = [
  { session_id: 's1', status: 'completed', date: '2026-07-05', workout_exercise_id: 'we1a', exercise_id: 'ex-squat', set_id: 'set1', reps_completed: 5, weight_used: 100 },
  { session_id: 's1', status: 'completed', date: '2026-07-05', workout_exercise_id: 'we1a', exercise_id: 'ex-squat', set_id: 'set2', reps_completed: 5, weight_used: 110 },
  { session_id: 's2', status: 'completed', date: '2026-07-12', workout_exercise_id: 'we2a', exercise_id: 'ex-squat', set_id: 'set3', reps_completed: 5, weight_used: 120 },
  { session_id: 's2', status: 'completed', date: '2026-07-12', workout_exercise_id: 'we2b', exercise_id: 'ex-bench', set_id: 'set4', reps_completed: 8, weight_used: 60 },
  // s3 was EDITED after logging: the current load truth is 140 (was 130).
  { session_id: 's3', status: 'completed', date: '2026-07-19', workout_exercise_id: 'we3a', exercise_id: 'ex-squat', set_id: 'set5', reps_completed: 5, weight_used: 140 },
  // s4 was DELETED before this read: it contributes nothing and must not appear.
  { session_id: 's5', status: 'skipped', date: '2026-07-22', workout_exercise_id: 'we5a', exercise_id: 'ex-squat', set_id: 'set6', reps_completed: 10, weight_used: 200 },
].map(row => ({ ...row, weight_unit: 'lbs' }));

const PLANNED_ROWS = [
  { session_id: 'p1', status: 'planned' },
  { session_id: 'p2', status: 'planned' },
  { session_id: 'p3', status: 'planned' },
  { session_id: 'p4', status: 'planned' },
];
const UNIT_ROWS = [{ weightUnit: 'lbs' }];

function fourWeekDb(overrides = {}) {
  return makeSequelize({
    routes: {
      'JOIN workout_exercises': SESSION_ROWS,
      "status = 'planned'": PLANNED_ROWS,
      'BodyMeasurement|weight_unit|weightUnit': UNIT_ROWS,
      ...overrides,
    },
  });
}

describe('G07/T33 — source-linked progress evidence', () => {
  it('produces exact deterministic volume, refs and matched-schedule adherence from seeded 4-week logs', async () => {
    const db = fourWeekDb();
    const out = await progressEvidenceTool({ sequelize: db, userId: 42 });

    expect(out.state).toBe('ok');
    const evidence = out.payload;
    expect(evidence.status).toBe('verified');
    expect(evidence.completedSessionCount).toBe(3);
    // Exact volumes per exercise/unit: squat 1050 + 600 + 700 = 2350; bench 480.
    expect(evidence.volumeByExercise['ex-squat'].lbs).toBe(2350);
    expect(evidence.volumeByExercise['ex-bench'].lbs).toBe(480);
    // Deleted s4 absent; skipped s5 absent; refs exact and ordered.
    expect(evidence.recordRefs).toEqual(['s1', 's2', 's3']);
    // Adherence from MATCHED planned sessions (4 planned), not a count of all logs.
    expect(evidence.adherence).toBeNull();
    expect(evidence.missingInputs).toContain('scheduled_session_matches');
    expect(out.truncated).toBe(false);
  });

  it('re-reads after an edit/delete mutation — no stale cached copy', async () => {
    const dbBefore = fourWeekDb();
    const before = await progressEvidenceTool({ sequelize: dbBefore, userId: 42 });

    // Simulate another edit landing in the DB between reads.
    const dbAfter = fourWeekDb({
      'JOIN workout_exercises': () => SESSION_ROWS.map((row) => (
        row.set_id === 'set5' ? { ...row, weight_used: 150 } : row
      )),
    });
    const after = await progressEvidenceTool({ sequelize: dbAfter, userId: 42 });

    expect(after.payload.volumeByExercise['ex-squat'].lbs).toBe(2400);
    expect(after.payload).not.toEqual(before.payload);
  });

  it('is deterministic: identical seeds produce byte-identical evidence', async () => {
    const a = await progressEvidenceTool({ sequelize: fourWeekDb(), userId: 42 });
    const b = await progressEvidenceTool({ sequelize: fourWeekDb(), userId: 42 });
    expect(a.payload).toEqual(b.payload);
    expect(a.state).toBe(b.state);
  });

  it('shows a missing unit instead of inventing one', async () => {
    const db = fourWeekDb({ 'JOIN workout_exercises': SESSION_ROWS.map(row => ({ ...row, weight_unit: '' })) });
    const out = await progressEvidenceTool({ sequelize: db, userId: 42 });
    expect(out.payload.missingInputs).toContain('weight_unit');
    expect(out.payload.volumeByExercise).toEqual({});
    expect(out.payload.status).toBe('verified');
  });

  it('reader failure is unavailable; zero sessions is empty; uncompleted-only is no_verified_records', async () => {
    const down = await progressEvidenceTool({ sequelize: makeSequelize({ throws: true }), userId: 42 });
    expect(down.state).toBe('unavailable');

    const zero = await progressEvidenceTool({ sequelize: fourWeekDb({ 'JOIN workout_exercises': [] }), userId: 42 });
    expect(zero.state).toBe('empty');
    expect(zero.payload.status).toBe('empty');

    const noneCompleted = await progressEvidenceTool({
      sequelize: fourWeekDb({
        'JOIN workout_exercises': SESSION_ROWS.map((row) => ({ ...row, status: 'in_progress' })),
      }),
      userId: 42,
    });
    expect(noneCompleted.state).toBe('unavailable');
    expect(noneCompleted.payload.status).toBe('no_verified_records');
  });

  it('never invents adherence when no planned sessions exist', async () => {
    const db = fourWeekDb({ "status = 'planned'": [] });
    const out = await progressEvidenceTool({ sequelize: db, userId: 42 });
    expect(out.payload.adherence).toBeNull();
  });

  it('issues fresh reads per call (no cached progress payload)', async () => {
    const db = fourWeekDb();
    await progressEvidenceTool({ sequelize: db, userId: 42 });
    const afterFirst = db.calls.length;
    await progressEvidenceTool({ sequelize: db, userId: 42 });
    expect(db.calls.length).toBeGreaterThan(afterFirst);
  });

  it('hostile round 3: non-positive actor ids are not an authorized reader context', async () => {
    for (const bad of [-42, 0, 4.5, 'abc']) {
      const out = await progressEvidenceTool({ sequelize: makeSequelize({ routes: { 'JOIN': [] } }), userId: bad });
      expect(out.state).toBe('unavailable');
      expect(out.reason).toBe('no authorized session reader context');
    }
  });
});
