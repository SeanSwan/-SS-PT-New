/**
 * SCU S5 — bounded read-only evidence tools.
 *
 * Exits: T22 (a reader THROW is `unavailable`; zero rows is `empty` — the two
 * must not collapse into each other, or a failed pain/progress read would be
 * reported to the model as "no pain" / "no progress"), per-query row/byte
 * caps, permission/target refreshed per tool, and the four-tool allowlist
 * (no model-visible write tool).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  COACH_EVIDENCE_TOOLS,
  COACH_EVIDENCE_TOOL_IDS,
  contextSummaryTool,
  exerciseLookupTool,
  recentWorkoutTool,
  progressEvidenceTool,
} from '../../services/ai/coachEvidenceTools.mjs';
import { clearCoachContextCache } from '../../services/ai/coachContextCache.mjs';

/** Fake sequelize: query(sql, opts) -> [[rows]] or throws, per caller config. */
function makeSequelize({ rowsByPattern = {}, throwByPattern = {} } = {}) {
  const calls = [];
  return {
    calls,
    QueryTypes: { SELECT: 'SELECT' },
    async query(sql, _opts) {
      calls.push(sql);
      for (const [pattern, handler] of Object.entries({ ...throwByPattern, ...rowsByPattern })) {
        if (sql.includes(pattern)) {
          if (handler.__throw) throw new Error(handler.message || 'reader threw');
          return [handler.rows];
        }
      }
      return [[]];
    },
  };
}

beforeEach(() => {
  clearCoachContextCache();
});

describe('S5 evidence tools', () => {
  it('exposes exactly the four allowlisted read tools — no write tool is model-visible', () => {
    expect(COACH_EVIDENCE_TOOL_IDS.sort()).toEqual(
      ['context_summary', 'exercise_lookup', 'progress_evidence', 'recent_workout'].sort(),
    );
    for (const id of COACH_EVIDENCE_TOOL_IDS) {
      expect(typeof COACH_EVIDENCE_TOOLS[id]).toBe('function');
    }
  });

  it('T22: a reader throw is `unavailable`, zero rows is `empty` — they never merge', async () => {
    // recent_workout: DB/reader throws.
    const throwing = makeSequelize({ throwByPattern: { workout_sessions: { __throw: true, message: 'relation missing' } } });
    const failed = await recentWorkoutTool({ sequelize: throwing, userId: 42 });
    expect(failed.state).toBe('unavailable');
    expect(failed.reason).toContain('relation missing');

    // recent_workout: query succeeds with zero rows.
    const empty = makeSequelize({ rowsByPattern: { workout_sessions: { rows: [] } } });
    const none = await recentWorkoutTool({ sequelize: empty, userId: 42 });
    expect(none.state).toBe('empty');
    expect(none.payload).toEqual([]);

    // progress_evidence: zero sessions -> empty (not "zero progress");
    // throwing session reader -> unavailable.
    const emptyProgress = await progressEvidenceTool({ sequelize: empty, userId: 42 });
    expect(emptyProgress.state).toBe('empty');
    const failedProgress = await progressEvidenceTool({ sequelize: throwing, userId: 42 });
    expect(failedProgress.state).toBe('unavailable');
  });

  it('recent_workout caps rows to the 5-session limit and flags truncation on overflow', async () => {
    const tenRows = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, title: `Day ${i + 1}`, date: '2026-09-01', duration: 60, intensity: 'moderate', exercises: [] }));
    const db = makeSequelize({ rowsByPattern: { workout_sessions: { rows: tenRows } } });
    const out = await recentWorkoutTool({ sequelize: db, userId: 42 });
    expect(out.state).toBe('ok');
    expect(out.payload.length).toBeLessThanOrEqual(5);
    expect(out.truncated).toBe(true);
    expect(out.bytes).toBeGreaterThanOrEqual(0);
  });

  it('exercise_lookup degrades to unavailable without an authorized reader and truncates overflow rows', async () => {
    const noReader = await exerciseLookupTool({ sequelize: {}, query: 'squat' });
    expect(noReader.state).toBe('unavailable');
    expect(noReader.reason).toContain('no authorized exercise reader');

    const many = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `Move ${i + 1}`, unit: 'lb' }));
    const reader = async (_sequelize, _query, _limit) => many;
    const capped = await exerciseLookupTool({ sequelize: {}, query: 'move', deps: { exerciseReader: reader } });
    expect(capped.state).toBe('ok');
    expect(capped.payload.length).toBeLessThanOrEqual(25);
    expect(capped.truncated).toBe(true);

    const none = await exerciseLookupTool({ sequelize: {}, query: 'zzz', deps: { exerciseReader: async () => [] } });
    expect(none.state).toBe('empty');
  });

  it('context_summary: denied access is `denied`, a reader throw is `unavailable`, content is `ok`', async () => {
    const denied = await contextSummaryTool({
      sequelize: {},
      user: { id: 7, role: 'trainer' },
      targetClientId: 42,
      deps: { buildCoachContext: async () => ({ accessDenied: true }) },
    });
    expect(denied.state).toBe('denied');

    const threw = await contextSummaryTool({
      sequelize: {},
      user: { id: 7, role: 'trainer' },
      targetClientId: 42,
      deps: { buildCoachContext: async () => { throw new Error('context engine down'); } },
    });
    expect(threw.state).toBe('unavailable');
    expect(threw.reason).toContain('context engine down');

    const ok = await contextSummaryTool({
      sequelize: {},
      user: { id: 7, role: 'trainer' },
      targetClientId: 42,
      deps: { buildCoachContext: async () => ({ profile: { fitnessGoals: ['strength'] }, domains: ['profile'] }) },
    });
    expect(ok.state).toBe('ok');
    expect(ok.payload).toEqual({ profile: { fitnessGoals: ['strength'] }, domains: ['profile'] });
  });

  it('permission/target is refreshed per tool: each tool performs its own authorized read', async () => {
    const db = makeSequelize({ rowsByPattern: { workout_sessions: { rows: [{ id: 1, title: 'Push', date: '2026-09-01', duration: 60, intensity: 'moderate', exercises: [] }] } } });
    await recentWorkoutTool({ sequelize: db, userId: 42 });
    const afterFirst = db.calls.length;
    await progressEvidenceTool({ sequelize: db, userId: 42 });
    // progress runs its own session read (and a scheduled count read) — not a
    // cached or shared result from the workout tool.
    expect(db.calls.length).toBeGreaterThan(afterFirst);
    const distinctToolCalls = db.calls.filter((sql) => sql.includes('workout_sessions'));
    expect(distinctToolCalls.length).toBeGreaterThanOrEqual(2);
  });
});
