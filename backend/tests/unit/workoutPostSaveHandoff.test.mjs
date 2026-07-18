import { describe, expect, it } from 'vitest';
import {
  estimateOneRepMax,
  topSetE1rm,
  exerciseVolume,
  buildProofSeriesFromUnifiedSessions,
} from '../../services/workoutProofSeriesService.mjs';
import { unifyRow, toUnifiedSessions } from '../../services/workoutProofLoader.mjs';
import { normalizeExerciseName } from '../../utils/exerciseIdentity.mjs';
import {
  resolveNextBestActionFromContext,
  enforceClientSafety,
  NBA_KINDS,
} from '../../services/nextBestActionResolverService.mjs';

// ── unified fixtures ──────────────────────────────────────────────────────────
const uSet = (name, weight, reps, setNumber, source = 'log') => ({
  nameKey: normalizeExerciseName(name), displayName: name, weight, reps, setNumber, source,
});
const uSession = (id, date, sets, duration = 50) => ({ id, date, duration, sets });
const squatSession = (id, date, top, dur = 50) =>
  uSession(id, date, [uSet('Barbell Back Squat', top, 5, 1), uSet('Barbell Back Squat', top, 5, 2)], dur);

// ── loader: dual-source unification (the headline fix) ─────────────────────────
describe('workoutProofLoader.unifyRow — dual-source unification', () => {
  it('LOGS-WIN precedence: when both sources have the same exercise, use the human log rows', () => {
    const row = {
      id: 's1', date: '2026-07-11T10:00:00Z',
      logRows: [{ exerciseName: 'Bench Press', weight: 225, reps: 5, setNumber: 1 }],
      setRows: [{ exerciseName: 'Bench Press', weight: 999, reps: 5, setNumber: 1 }], // template placeholder — must be ignored
    };
    const u = unifyRow(row);
    expect(u.sets).toHaveLength(1);
    expect(u.sets[0].weight).toBe(225);
    expect(u.sets[0].source).toBe('log');
  });

  it('uses set rows when there are no log rows for that exercise', () => {
    const u = unifyRow({ id: 's', date: 'd', logRows: [], setRows: [{ exerciseName: 'Deadlift', weight: 405, reps: 3, setNumber: 1 }] });
    expect(u.sets[0].source).toBe('set');
    expect(u.sets[0].weight).toBe(405);
  });

  it('normalizes names: casing/extra-space MERGE; different names SPLIT (no fuzzy)', () => {
    expect(normalizeExerciseName('Bench  Press')).toBe(normalizeExerciseName('bench press')); // merge
    expect(normalizeExerciseName('Bench Press')).not.toBe(normalizeExerciseName('Barbell Bench Press')); // split
  });

  it('drops junk sets (weight<=0, reps<=0, reps>36, null)', () => {
    const u = unifyRow({ id: 's', date: 'd', logRows: [
      { exerciseName: 'Squat', weight: 0, reps: 5, setNumber: 1 },
      { exerciseName: 'Squat', weight: 225, reps: 0, setNumber: 2 },
      { exerciseName: 'Squat', weight: 225, reps: 37, setNumber: 3 },
      { exerciseName: 'Squat', weight: null, reps: 5, setNumber: 4 },
      { exerciseName: 'Squat', weight: 225, reps: 5, setNumber: 5 },
    ], setRows: [] });
    expect(u.sets).toHaveLength(1);
    expect(u.sets[0].weight).toBe(225);
  });

  it('dedupes by setNumber, keeping the max weight (volume is duplicate-sensitive)', () => {
    const u = unifyRow({ id: 's', date: 'd', logRows: [
      { exerciseName: 'Squat', weight: 185, reps: 5, setNumber: 1 },
      { exerciseName: 'Squat', weight: 225, reps: 5, setNumber: 1 }, // same setNumber → keep 225
    ], setRows: [] });
    expect(u.sets).toHaveLength(1);
    expect(u.sets[0].weight).toBe(225);
  });

  it('toUnifiedSessions maps a list', () => {
    expect(toUnifiedSessions([{ id: 'a', date: 'd', logRows: [{ exerciseName: 'Row', weight: 135, reps: 8, setNumber: 1 }], setRows: [] }])).toHaveLength(1);
  });
});

// ── series builder (unified shape, name-keyed) ────────────────────────────────
describe('workoutProofSeriesService — series build (unified)', () => {
  it('estimateOneRepMax matches Epley (225×5 → 263) + guards', () => {
    expect(estimateOneRepMax(225, 5)).toBe(263);
    expect(estimateOneRepMax(0, 5)).toBeNull();
    expect(estimateOneRepMax(225, 0)).toBeNull();
  });

  it('topSetE1rm takes the best set; exerciseVolume sums weight×reps', () => {
    expect(topSetE1rm([uSet('x', 225, 5, 1), uSet('x', 235, 3, 2)])).toBe(263); // 263 vs 259
    expect(exerciseVolume([uSet('x', 100, 5, 1), uSet('x', 100, 5, 2)])).toBe(1000);
  });

  it('renders a real chart for CLIENT-LOGGED (log-source) workouts — the headline fix', () => {
    const sessions = [
      squatSession('s1', '2026-07-06T10:00:00Z', 200),
      squatSession('s2', '2026-07-08T10:00:00Z', 205),
      squatSession('s3', '2026-07-10T10:00:00Z', 210),
      squatSession('s4', '2026-07-11T10:00:00Z', 225),
    ];
    const r = buildProofSeriesFromUnifiedSessions(sessions, { todaySessionId: 's4' });
    expect(r.nameKey).toBe('barbell back squat');
    expect(r.exerciseName).toBe('Barbell Back Squat');
    expect(r.points).toHaveLength(4);
    expect(r.todayE1rm).toBe(263);
    expect(r.pr).toBe(true);
    expect(r.prDeltaLbs).toBe(18); // 263 − 245
    expect(r.sessionsThisWeek).toBe(4);
    expect(r.streakWeeks).toBe(1);
  });

  it('picks the proof exercise by aggregated per-name volume', () => {
    const sess = [uSession('t', '2026-07-11T10:00:00Z', [
      uSet('Overhead Press', 135, 8, 1),          // 1080
      uSet('Barbell Back Squat', 185, 5, 1),        // 925 …
      uSet('Barbell Back Squat', 185, 5, 2),        // …+925 = 1850 aggregate
    ])];
    expect(buildProofSeriesFromUnifiedSessions(sess, { todaySessionId: 't' }).nameKey).toBe('barbell back squat');
  });

  it('todayE1rm is null when today has no valid set for the proof exercise (never a prior value)', () => {
    const sess = [
      squatSession('a', '2026-07-06T10:00:00Z', 200),
      uSession('b', '2026-07-11T10:00:00Z', [uSet('Barbell Back Squat', 0, 5, 1)]), // junk today → dropped upstream... simulate no valid set
    ];
    // 'b' has no valid squat set (weight 0 would be dropped by the loader; here we pass it raw to the builder,
    // which still yields no e1rm point for today because estimateOneRepMax(0,5) is null).
    const r = buildProofSeriesFromUnifiedSessions(sess, { todaySessionId: 'b' });
    expect(r.todayE1rm).toBeNull();
    expect(r.pr).toBe(false);
  });

  it('keeps a multi-week streak alive mid-week', () => {
    const wk = (p, mon, n) => Array.from({ length: n }, (_, i) => {
      const d = new Date(mon); d.setUTCDate(d.getUTCDate() + i);
      return squatSession(`${p}${i}`, d.toISOString(), 200 + i);
    });
    const sess = [
      ...wk('w1', '2026-06-15T10:00:00Z', 3), ...wk('w2', '2026-06-22T10:00:00Z', 3),
      ...wk('w3', '2026-06-29T10:00:00Z', 3), squatSession('cur', '2026-07-06T10:00:00Z', 230),
    ];
    expect(buildProofSeriesFromUnifiedSessions(sess, { todaySessionId: 'cur' }).streakWeeks).toBe(3);
  });

  it('durationMin null when duration null; first-ever single point', () => {
    const r = buildProofSeriesFromUnifiedSessions([squatSession('only', '2026-07-11T10:00:00Z', 185, null)], { todaySessionId: 'only' });
    expect(r.durationMin).toBeNull();
    expect(r.points).toHaveLength(1);
    expect(r.isFirstEver).toBe(true);
  });

  it('returns null with no usable session', () => {
    expect(buildProofSeriesFromUnifiedSessions([], { todaySessionId: 'x' })).toBeNull();
    expect(buildProofSeriesFromUnifiedSessions(null)).toBeNull();
  });
});

// ── NBA resolver + fail-closed guard (unchanged from Slice 1) ──────────────────
describe('nextBestActionResolverService — rules + fail-closed safety', () => {
  it('Rule 1 trainer+struggling client+plan → ADJUST_PLAN (trainerOnly)', () => {
    const r = resolveNextBestActionFromContext({ viewerRole: 'trainer', targetClientId: 4821, hasActivePlan: true, missedPrescribedTopSet: true });
    expect(r.kind).toBe(NBA_KINDS.ADJUST_PLAN);
    expect(r.trainerOnly).toBe(true);
  });
  it('adherence boundary 59% flags / 60% does not', () => {
    const base = { viewerRole: 'admin', targetClientId: 1, hasActivePlan: true };
    expect(resolveNextBestActionFromContext({ ...base, adherence14d: 0.59 }).kind).toBe(NBA_KINDS.ADJUST_PLAN);
    expect(resolveNextBestActionFromContext({ ...base, adherence14d: 0.60 }).kind).not.toBe(NBA_KINDS.ADJUST_PLAN);
  });
  it('Rule 3 flexibility (lexicon-safe); Rule 4 fallback', () => {
    const r3 = resolveNextBestActionFromContext({ viewerRole: 'client', sessionsThisWeek: 3, planFrequency: 3 });
    expect(r3.kind).toBe(NBA_KINDS.RECOVERY_FLEXIBILITY);
    expect(`${r3.title} ${r3.body}`.toLowerCase()).toMatch(/flexibility/);
    expect(`${r3.title} ${r3.body}`.toLowerCase()).not.toMatch(/yoga|meditation/);
    expect(resolveNextBestActionFromContext({ viewerRole: 'client' }).kind).toBe(NBA_KINDS.VIEW_PROGRESS);
  });
});

describe('enforceClientSafety — fail-closed guard', () => {
  const trainerAction = { kind: NBA_KINDS.ADJUST_PLAN, title: 't', ctaLabel: 'c', href: '/x', trainerOnly: true };
  it('drops a trainerOnly action to fallback for client / CLIENT / undefined / unknown roles', () => {
    for (const role of ['client', 'CLIENT', 'Client', undefined, null, '', 'user', 'member']) {
      expect(enforceClientSafety(role, { ...trainerAction }).trainerOnly).toBe(false);
    }
  });
  it('passes trainerOnly through for trainer/admin (case-insensitive)', () => {
    expect(enforceClientSafety('trainer', { ...trainerAction }).kind).toBe(NBA_KINDS.ADJUST_PLAN);
    expect(enforceClientSafety('ADMIN', { ...trainerAction }).kind).toBe(NBA_KINDS.ADJUST_PLAN);
  });
});
