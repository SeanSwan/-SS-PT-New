/**
 * progressContextBuilder — Unit Tests (TDD-first)
 *
 * Summarizes recent training history into PII-free derived context
 * for the AI generation pipeline.
 */
import { describe, it, expect } from 'vitest';
import { buildProgressContext } from '../../services/ai/progressContextBuilder.mjs';

// ─── Helpers ──────────────────────────────────────────────────
const makeSession = (overrides = {}) => ({
  id: 'sess-1',
  date: new Date('2026-02-20'),
  duration: 60,
  intensity: 7,
  totalWeight: 5000,
  totalReps: 120,
  totalSets: 18,
  avgRPE: 7,
  status: 'completed',
  workoutLogs: [],
  ...overrides,
});

const makeLog = (overrides = {}) => ({
  exerciseName: 'Bench Press',
  setNumber: 1,
  reps: 10,
  weight: 135,
  rpe: 7,
  ...overrides,
});

// ─── Empty / Missing Data ─────────────────────────────────────
describe('progressContextBuilder — empty/missing data', () => {
  it('1 — returns safe empty summary for null sessions', () => {
    const ctx = buildProgressContext(null);
    expect(ctx).toBeTruthy();
    expect(ctx.recentSessionCount).toBe(0);
    expect(ctx.adherenceTrend).toBe('no_data');
    expect(ctx.volumeTrend).toBe('no_data');
    expect(ctx.rpeTrend).toBe('no_data');
    expect(ctx.warnings).toEqual([]);
    expect(ctx.missingInputs).toContain('workout_history');
  });

  it('2 — returns safe empty summary for empty array', () => {
    const ctx = buildProgressContext([]);
    expect(ctx.recentSessionCount).toBe(0);
    expect(ctx.adherenceTrend).toBe('no_data');
    expect(ctx.missingInputs).toContain('workout_history');
  });

  it('3 — returns safe summary for undefined sessions', () => {
    const ctx = buildProgressContext(undefined);
    expect(ctx.recentSessionCount).toBe(0);
    expect(ctx.adherenceTrend).toBe('no_data');
  });
});

// ─── Session Count & Frequency ────────────────────────────────
describe('progressContextBuilder — session count & frequency', () => {
  it('4 — counts completed sessions only', () => {
    const sessions = [
      makeSession({ status: 'completed' }),
      makeSession({ id: 'sess-2', status: 'skipped' }),
      makeSession({ id: 'sess-3', status: 'completed' }),
      makeSession({ id: 'sess-4', status: 'cancelled' }),
    ];
    const ctx = buildProgressContext(sessions);
    expect(ctx.recentSessionCount).toBe(2);
  });

  it('5 — calculates average sessions per week', () => {
    const sessions = [
      makeSession({ date: new Date('2026-02-24') }),
      makeSession({ id: 's2', date: new Date('2026-02-20') }),
      makeSession({ id: 's3', date: new Date('2026-02-17') }),
      makeSession({ id: 's4', date: new Date('2026-02-10') }),
    ];
    const ctx = buildProgressContext(sessions);
    expect(ctx.avgSessionsPerWeek).toBeGreaterThan(0);
    expect(typeof ctx.avgSessionsPerWeek).toBe('number');
  });
});

// ─── Volume / Intensity Summary ───────────────────────────────
describe('progressContextBuilder — volume & intensity', () => {
  it('6 — calculates average volume per session', () => {
    const sessions = [
      makeSession({ totalWeight: 5000, totalReps: 100, totalSets: 15 }),
      makeSession({ id: 's2', totalWeight: 6000, totalReps: 120, totalSets: 18 }),
    ];
    const ctx = buildProgressContext(sessions);
    expect(ctx.avgVolumePerSession).toBe(5500);
    expect(ctx.avgRepsPerSession).toBe(110);
    expect(ctx.avgSetsPerSession).toBeCloseTo(16.5);
  });

  it('7 — calculates average session duration', () => {
    const sessions = [
      makeSession({ duration: 45 }),
      makeSession({ id: 's2', duration: 75 }),
    ];
    const ctx = buildProgressContext(sessions);
    expect(ctx.avgDurationMin).toBe(60);
  });

  it('8 — calculates average intensity', () => {
    const sessions = [
      makeSession({ intensity: 6 }),
      makeSession({ id: 's2', intensity: 8 }),
    ];
    const ctx = buildProgressContext(sessions);
    expect(ctx.avgIntensity).toBe(7);
  });
});

// ─── RPE Trend ────────────────────────────────────────────────
describe('progressContextBuilder — RPE trend', () => {
  it('9 — detects stable RPE', () => {
    const sessions = [
      makeSession({ avgRPE: 7 }),
      makeSession({ id: 's2', avgRPE: 7 }),
      makeSession({ id: 's3', avgRPE: 7.5 }),
    ];
    const ctx = buildProgressContext(sessions);
    expect(ctx.rpeTrend).toBe('stable');
  });

  it('10 — detects increasing RPE (getting harder)', () => {
    const sessions = [
      makeSession({ date: new Date('2026-02-10'), avgRPE: 5 }),
      makeSession({ id: 's2', date: new Date('2026-02-15'), avgRPE: 7 }),
      makeSession({ id: 's3', date: new Date('2026-02-20'), avgRPE: 9 }),
    ];
    const ctx = buildProgressContext(sessions);
    expect(ctx.rpeTrend).toBe('increasing');
  });

  it('11 — detects decreasing RPE (adapting)', () => {
    const sessions = [
      makeSession({ date: new Date('2026-02-10'), avgRPE: 9 }),
      makeSession({ id: 's2', date: new Date('2026-02-15'), avgRPE: 7 }),
      makeSession({ id: 's3', date: new Date('2026-02-20'), avgRPE: 5 }),
    ];
    const ctx = buildProgressContext(sessions);
    expect(ctx.rpeTrend).toBe('decreasing');
  });

  it('12 — returns no_data when RPE is not tracked', () => {
    const sessions = [
      makeSession({ avgRPE: null }),
      makeSession({ id: 's2', avgRPE: null }),
    ];
    const ctx = buildProgressContext(sessions);
    expect(ctx.rpeTrend).toBe('no_data');
  });
});

// ─── Volume Trend ─────────────────────────────────────────────
describe('progressContextBuilder — volume trend', () => {
  it('13 — detects progressive overload (volume increasing)', () => {
    const sessions = [
      makeSession({ date: new Date('2026-02-10'), totalWeight: 3000 }),
      makeSession({ id: 's2', date: new Date('2026-02-15'), totalWeight: 4000 }),
      makeSession({ id: 's3', date: new Date('2026-02-20'), totalWeight: 5500 }),
    ];
    const ctx = buildProgressContext(sessions);
    expect(ctx.volumeTrend).toBe('increasing');
  });

  it('14 — detects volume regression', () => {
    const sessions = [
      makeSession({ date: new Date('2026-02-10'), totalWeight: 6000 }),
      makeSession({ id: 's2', date: new Date('2026-02-15'), totalWeight: 4500 }),
      makeSession({ id: 's3', date: new Date('2026-02-20'), totalWeight: 3000 }),
    ];
    const ctx = buildProgressContext(sessions);
    expect(ctx.volumeTrend).toBe('decreasing');
  });
});

// ─── Adherence Trend ──────────────────────────────────────────
describe('progressContextBuilder — adherence', () => {
  it('15 — detects good adherence (3+ sessions/week)', () => {
    const now = new Date('2026-02-25');
    const sessions = [
      makeSession({ date: new Date('2026-02-24') }),
      makeSession({ id: 's2', date: new Date('2026-02-22') }),
      makeSession({ id: 's3', date: new Date('2026-02-20') }),
      makeSession({ id: 's4', date: new Date('2026-02-18') }),
    ];
    const ctx = buildProgressContext(sessions, { referenceDate: now });
    expect(['consistent', 'improving']).toContain(ctx.adherenceTrend);
  });

  it('16 — detects declining adherence (long gap)', () => {
    const now = new Date('2026-02-25');
    const sessions = [
      makeSession({ date: new Date('2026-02-05') }),
    ];
    const ctx = buildProgressContext(sessions, { referenceDate: now });
    expect(['declining', 'no_data']).toContain(ctx.adherenceTrend);
  });
});

// ─── Exercise History (Per-Exercise Stats) ────────────────────
describe('progressContextBuilder — exercise history', () => {
  it('17 — extracts top exercises with best weight', () => {
    const sessions = [
      makeSession({
        workoutLogs: [
          makeLog({ exerciseName: 'Bench Press', weight: 135, reps: 10 }),
          makeLog({ exerciseName: 'Bench Press', setNumber: 2, weight: 155, reps: 8 }),
          makeLog({ exerciseName: 'Squat', weight: 185, reps: 8 }),
        ],
      }),
    ];
    const ctx = buildProgressContext(sessions);
    expect(ctx.exerciseHistory).toBeTruthy();
    expect(ctx.exerciseHistory.length).toBeGreaterThan(0);

    const bench = ctx.exerciseHistory.find(e => e.exerciseName === 'Bench Press');
    expect(bench).toBeTruthy();
    expect(bench.bestWeight).toBe(155);
    expect(bench.bestReps).toBe(10);
  });
});

// ─── PII Safety ───────────────────────────────────────────────
describe('progressContextBuilder — PII safety', () => {
  it('18 — output contains no userId or identifiable fields', () => {
    const sessions = [
      makeSession({ userId: 42, title: 'Personal workout for John' }),
    ];
    const ctx = buildProgressContext(sessions);
    const serialized = JSON.stringify(ctx);
    expect(serialized).not.toContain('42');
    expect(serialized).not.toContain('John');
    expect(serialized).not.toContain('userId');
  });

  it('19 — output contains no session IDs', () => {
    const sessions = [makeSession({ id: 'secret-sess-uuid-123' })];
    const ctx = buildProgressContext(sessions);
    const serialized = JSON.stringify(ctx);
    expect(serialized).not.toContain('secret-sess-uuid-123');
  });
});

// ─── Output Shape ─────────────────────────────────────────────
describe('progressContextBuilder — output shape', () => {
  it('20 — returns all expected fields', () => {
    const sessions = [makeSession()];
    const ctx = buildProgressContext(sessions);

    expect(ctx).toHaveProperty('recentSessionCount');
    expect(ctx).toHaveProperty('avgSessionsPerWeek');
    expect(ctx).toHaveProperty('avgVolumePerSession');
    expect(ctx).toHaveProperty('avgRepsPerSession');
    expect(ctx).toHaveProperty('avgSetsPerSession');
    expect(ctx).toHaveProperty('avgDurationMin');
    expect(ctx).toHaveProperty('avgIntensity');
    expect(ctx).toHaveProperty('rpeTrend');
    expect(ctx).toHaveProperty('volumeTrend');
    expect(ctx).toHaveProperty('adherenceTrend');
    expect(ctx).toHaveProperty('exerciseHistory');
    expect(ctx).toHaveProperty('warnings');
    expect(ctx).toHaveProperty('missingInputs');
  });
});
