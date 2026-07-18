import { describe, expect, it } from 'vitest';
import {
  estimateOneRepMax,
  topSetE1rm,
  exerciseVolume,
  buildProofSeriesFromSessions,
} from '../../services/workoutProofSeriesService.mjs';
import {
  resolveNextBestActionFromContext,
  enforceClientSafety,
  NBA_KINDS,
} from '../../services/nextBestActionResolverService.mjs';

// ── fixtures ────────────────────────────────────────────────────────────────
const set = (weightUsed, repsCompleted, setType = 'working') => ({ setType, weightUsed, repsCompleted });
const squat = (sessionTopWeight, reps = 5) => ({
  exerciseId: 'ex-squat', exerciseName: 'Barbell Back Squat',
  sets: [set(sessionTopWeight - 40, 5, 'warmup'), set(sessionTopWeight, reps), set(sessionTopWeight, reps)],
});
const bench = (w) => ({ exerciseId: 'ex-bench', exerciseName: 'Barbell Bench Press', sets: [set(w, 5), set(w, 5)] });
const session = (id, dateISO, exercises, duration = 50) => ({ id, date: dateISO, duration, exercises });

describe('workoutProofSeriesService — Epley + top set', () => {
  it('estimateOneRepMax matches Epley and rounds (225×5 → 263)', () => {
    expect(estimateOneRepMax(225, 5)).toBe(263); // 225*(1+5/30)=262.5 → 263
    expect(estimateOneRepMax(100, 10)).toBe(133);
  });
  it('guards junk inputs to null (never poisons a chart)', () => {
    expect(estimateOneRepMax(0, 5)).toBeNull();
    expect(estimateOneRepMax(225, 0)).toBeNull();
    expect(estimateOneRepMax(null, 5)).toBeNull();
    expect(estimateOneRepMax(-5, 5)).toBeNull();
    expect(estimateOneRepMax('x', 5)).toBeNull();
  });
  it('topSetE1rm excludes warmups and takes the best working set', () => {
    const sets = [set(135, 10, 'warmup'), set(225, 5), set(235, 3)];
    // working: 225*(1.1667)=263 ; 235*(1.1)=259 → best 263
    expect(topSetE1rm(sets)).toBe(263);
  });
  it('topSetE1rm falls back to any set if all are warmups', () => {
    expect(topSetE1rm([set(100, 5, 'warmup')])).toBe(117);
    expect(topSetE1rm([])).toBeNull();
  });
  it('exerciseVolume sums weight×reps over sets (ignoring junk)', () => {
    expect(exerciseVolume(bench(100))).toBe(1000); // 100*5 + 100*5
    expect(exerciseVolume({ sets: [set(0, 5), set(100, 5)] })).toBe(500);
  });
});

describe('workoutProofSeriesService — series build', () => {
  // All four in ISO week Mon 2026-07-06 .. Sun 2026-07-12 (verified via node harness).
  const sessions = [
    session('s1', '2026-07-06T10:00:00Z', [squat(200), bench(135)]),
    session('s2', '2026-07-08T10:00:00Z', [squat(205), bench(135)]),
    session('s3', '2026-07-10T10:00:00Z', [squat(210), bench(140)]),
    session('s4', '2026-07-11T10:00:00Z', [squat(225), bench(140)]), // today, squat PR
  ];

  it('builds an e1RM series for the proof exercise from REAL points only', () => {
    const r = buildProofSeriesFromSessions(sessions, { todaySessionId: 's4' });
    expect(r.exerciseId).toBe('ex-squat'); // highest volume, has ≥3 priors
    expect(r.exerciseName).toBe('Barbell Back Squat');
    expect(r.points).toHaveLength(4);
    expect(r.points.every((p) => typeof p.e1rm === 'number')).toBe(true);
    expect(r.points[r.points.length - 1].isToday).toBe(true);
    expect(r.todayE1rm).toBe(263); // 225×5
  });

  it('detects an all-time PR and the delta', () => {
    const r = buildProofSeriesFromSessions(sessions, { todaySessionId: 's4' });
    // priors best = 210×5 = 245 ; today 263 → PR +18
    expect(r.pr).toBe(true);
    expect(r.prDeltaLbs).toBe(18);
  });

  it('picks highest-volume exercise WITH ≥3 priors over a higher-volume newcomer', () => {
    const withNewcomer = [
      ...sessions,
      session('s5', '2026-07-13T10:00:00Z', [
        { exerciseId: 'ex-deadlift', exerciseName: 'Deadlift', sets: [set(405, 5), set(405, 5)] }, // huge volume, 0 priors
        squat(230),
      ]),
    ];
    const r = buildProofSeriesFromSessions(withNewcomer, { todaySessionId: 's5' });
    expect(r.exerciseId).toBe('ex-squat'); // squat has priors; deadlift is new
  });

  it('handles a first-ever session (single real point, no fabricated trend, no PR)', () => {
    const r = buildProofSeriesFromSessions([session('only', '2026-07-07T10:00:00Z', [squat(185)])], { todaySessionId: 'only' });
    expect(r.points).toHaveLength(1);
    expect(r.pr).toBe(false);
    expect(r.prDeltaLbs).toBe(0);
    expect(r.isFirstEver).toBe(true);
  });

  it('counts sessions in the current ISO week and computes today totals', () => {
    const r = buildProofSeriesFromSessions(sessions, { todaySessionId: 's4' });
    // s1..s4 all fall in ISO week Mon 2026-07-06 .. Sun 07-12 (verified via node harness)
    expect(r.sessionsThisWeek).toBe(4);
    expect(r.streakWeeks).toBe(1);
    expect(r.exerciseCount).toBe(2);
    expect(r.durationMin).toBe(50);
    expect(r.totalVolumeLbs).toBeGreaterThan(0);
  });

  it('returns null when there is no usable session', () => {
    expect(buildProofSeriesFromSessions([], { todaySessionId: 'x' })).toBeNull();
    expect(buildProofSeriesFromSessions(null)).toBeNull();
  });
});

describe('nextBestActionResolverService — rules, precedence, safety', () => {
  it('Rule 1: trainer with a struggling client + active plan → ADJUST_PLAN (trainerOnly)', () => {
    const r = resolveNextBestActionFromContext({
      viewerRole: 'trainer', targetClientId: 4821, hasActivePlan: true, missedPrescribedTopSet: true,
    });
    expect(r.kind).toBe(NBA_KINDS.ADJUST_PLAN);
    expect(r.trainerOnly).toBe(true);
    expect(r.title).toBe('Client #4821 needs a plan adjustment');
    expect(r.href).toBe('/workout-planner?client=4821');
  });

  it('Rule 1 is skipped without an active plan (cannot evaluate honestly)', () => {
    const r = resolveNextBestActionFromContext({
      viewerRole: 'trainer', targetClientId: 4821, hasActivePlan: false, missedPrescribedTopSet: true,
      nextSessionWithin48h: true, nextSessionDayName: 'Wednesday',
    });
    expect(r.kind).toBe(NBA_KINDS.DO_NEXT_WORKOUT); // falls through to rule 2
  });

  it('adherence boundary: 59% flags, 60% does not', () => {
    const base = { viewerRole: 'admin', targetClientId: 1, hasActivePlan: true };
    expect(resolveNextBestActionFromContext({ ...base, adherence14d: 0.59 }).kind).toBe(NBA_KINDS.ADJUST_PLAN);
    expect(resolveNextBestActionFromContext({ ...base, adherence14d: 0.60 }).kind).not.toBe(NBA_KINDS.ADJUST_PLAN);
  });

  it('Rule 1 beats Rule 2 when both match (precedence)', () => {
    const r = resolveNextBestActionFromContext({
      viewerRole: 'trainer', targetClientId: 7, hasActivePlan: true, missedPrescribedTopSet: true,
      nextSessionWithin48h: true, nextSessionDayName: 'Friday',
    });
    expect(r.kind).toBe(NBA_KINDS.ADJUST_PLAN);
  });

  it('Rule 2: next session within 48h → DO_NEXT_WORKOUT with day name', () => {
    const r = resolveNextBestActionFromContext({ viewerRole: 'client', nextSessionWithin48h: true, nextSessionDayName: 'Wednesday' });
    expect(r.kind).toBe(NBA_KINDS.DO_NEXT_WORKOUT);
    expect(r.title).toBe('Next up: Wednesday');
    expect(r.href).toBe('/schedule');
  });

  it('Rule 3: hit weekly frequency → RECOVERY_FLEXIBILITY (lexicon-safe copy)', () => {
    const r = resolveNextBestActionFromContext({ viewerRole: 'client', sessionsThisWeek: 3, planFrequency: 3 });
    expect(r.kind).toBe(NBA_KINDS.RECOVERY_FLEXIBILITY);
    expect(r.href).toBe('/stretching');
    const blob = `${r.title} ${r.body} ${r.ctaLabel}`.toLowerCase();
    expect(blob).toContain('flexibility');
    expect(blob).not.toMatch(/yoga|meditation/);
  });

  it('Rule 4 fallback: VIEW_PROGRESS, never a dead end', () => {
    const r = resolveNextBestActionFromContext({ viewerRole: 'client' });
    expect(r.kind).toBe(NBA_KINDS.VIEW_PROGRESS);
    expect(r.trainerOnly).toBe(false);
  });

  it('SAFETY invariant: a client can never receive a trainerOnly action', () => {
    // Force the rule-1 preconditions but as a client — must NOT leak a plan decision.
    const r = resolveNextBestActionFromContext({
      viewerRole: 'client', targetClientId: 9, hasActivePlan: true, missedPrescribedTopSet: true,
    });
    expect(r.trainerOnly).toBe(false);
    expect(r.kind).toBe(NBA_KINDS.VIEW_PROGRESS);
  });
});

describe('enforceClientSafety — fail-closed guard (direct, not vacuous)', () => {
  const trainerAction = { kind: NBA_KINDS.ADJUST_PLAN, title: 't', ctaLabel: 'c', href: '/x', trainerOnly: true };
  it('drops a trainerOnly action to the safe fallback for a client', () => {
    const r = enforceClientSafety('client', { ...trainerAction });
    expect(r.trainerOnly).toBe(false);
    expect(r.kind).toBe(NBA_KINDS.VIEW_PROGRESS);
  });
  it('fails CLOSED on casing / undefined / unknown roles', () => {
    for (const role of ['CLIENT', 'Client', undefined, null, '', 'user', 'member']) {
      expect(enforceClientSafety(role, { ...trainerAction }).trainerOnly).toBe(false);
    }
  });
  it('passes a trainerOnly action through only for trainer/admin (case-insensitive)', () => {
    expect(enforceClientSafety('trainer', { ...trainerAction }).kind).toBe(NBA_KINDS.ADJUST_PLAN);
    expect(enforceClientSafety('ADMIN', { ...trainerAction }).kind).toBe(NBA_KINDS.ADJUST_PLAN);
  });
  it('never alters a non-trainerOnly action', () => {
    const safe = { kind: NBA_KINDS.VIEW_PROGRESS, title: 't', ctaLabel: 'c', href: '/p', trainerOnly: false };
    expect(enforceClientSafety('client', { ...safe })).toEqual(safe);
  });
});

describe('workoutProofSeriesService — correctness edges (hostile round)', () => {
  it('aggregates duplicate exercise rows in one session (does NOT hide a PR)', () => {
    const sess = [
      session('p1', '2026-07-06T10:00:00Z', [squat(200)]),
      session('p2', '2026-07-08T10:00:00Z', [squat(205)]),
      session('p3', '2026-07-10T10:00:00Z', [squat(210)]),
      session('t', '2026-07-11T10:00:00Z', [
        { exerciseId: 'ex-squat', exerciseName: 'Barbell Back Squat', sets: [set(95, 5)] },  // light row FIRST
        { exerciseId: 'ex-squat', exerciseName: 'Barbell Back Squat', sets: [set(315, 5)] }, // real top set SECOND
      ]),
    ];
    const r = buildProofSeriesFromSessions(sess, { todaySessionId: 't' });
    expect(r.todayE1rm).toBe(368); // 315×5, not 111 from the first row
    expect(r.pr).toBe(true);
  });
  it('reports null todayE1rm when today has no valid lift (never a prior value)', () => {
    const sess = [
      session('a', '2026-07-06T10:00:00Z', [squat(200)]),
      session('b', '2026-07-11T10:00:00Z', [{ exerciseId: 'ex-squat', exerciseName: 'Barbell Back Squat', sets: [set(0, 5)] }]),
    ];
    const r = buildProofSeriesFromSessions(sess, { todaySessionId: 'b' });
    expect(r.todayE1rm).toBeNull();
    expect(r.pr).toBe(false);
  });
  it('keeps a multi-week streak alive mid-week (does not collapse to 0)', () => {
    const wk = (prefix, mondayISO, n) => Array.from({ length: n }, (_, i) => {
      const d = new Date(mondayISO); d.setUTCDate(d.getUTCDate() + i);
      return session(`${prefix}${i}`, d.toISOString(), [squat(200 + i)]);
    });
    const sess = [
      ...wk('w1', '2026-06-15T10:00:00Z', 3),
      ...wk('w2', '2026-06-22T10:00:00Z', 3),
      ...wk('w3', '2026-06-29T10:00:00Z', 3),
      session('cur', '2026-07-06T10:00:00Z', [squat(230)]), // current week: only 1 session so far
    ];
    const r = buildProofSeriesFromSessions(sess, { todaySessionId: 'cur' });
    expect(r.streakWeeks).toBe(3);
  });
  it('durationMin is null (not 0) when duration is null', () => {
    const r = buildProofSeriesFromSessions([session('only', '2026-07-11T10:00:00Z', [squat(185)], null)], { todaySessionId: 'only' });
    expect(r.durationMin).toBeNull();
  });
});
