/**
 * historyBackfill.test.mjs — charter v3 H locks (attested history backfill)
 * ===========================================================================
 * "Three months of missed logging, filled realistically from what we've been
 * doing" — WITHOUT ever corrupting streaks, XP, PR awards, or billing.
 * Locks: (1) the pure generator — deterministic (same inputs = same output),
 * caps honored (120 days / 60 sessions), break windows and conflict dates
 * skipped, content sampled from the client's REAL exercise pool with sane
 * loads; (2) integrity rails — the source class derives full suppression and
 * the adapter's PR step honors it (records with historical dates, never
 * awards); (3) commit requires attestation; undo deletes in FK-safe order;
 * (4) routes are trainer/admin-gated.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  generateBackfillDays,
  BACKFILL_MAX_DAYS,
  BACKFILL_MAX_SESSIONS,
} from '../../services/workout/historyBackfillService.mjs';
import { deriveWorkoutLogSourcePolicy } from '../../services/workout/workoutLogSourcePolicy.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(__dirname, rel), 'utf8');

const pool = [
  { exerciseName: 'Barbell Squat', timesPerformed: 20, maxWeight: 225, maxReps: 8 },
  { exerciseName: 'Bench Press', timesPerformed: 15, maxWeight: 185, maxReps: 8 },
  { exerciseName: 'Deadlift', timesPerformed: 10, maxWeight: 275, maxReps: 5 },
  { exerciseName: 'Lat Pulldown', timesPerformed: 8, maxWeight: 120, maxReps: 12 },
];

const baseInput = {
  startDate: '2026-04-01',
  endDate: '2026-04-28',
  sessionsPerWeek: 3,
  exercisePool: pool,
};

describe('generateBackfillDays (pure, deterministic)', () => {
  it('spreads sessions across the range at the requested cadence', () => {
    const days = generateBackfillDays(baseInput);
    // 4 weeks × 3 sessions = 12 (±1 boundary tolerance).
    expect(days.length).toBeGreaterThanOrEqual(11);
    expect(days.length).toBeLessThanOrEqual(13);
    for (const day of days) {
      expect(day.date >= '2026-04-01' && day.date <= '2026-04-28').toBe(true);
      expect(day.exercises.length).toBeGreaterThanOrEqual(3);
      expect(day.exercises.length).toBeLessThanOrEqual(5);
    }
  });

  it('is deterministic — same inputs produce identical output', () => {
    expect(JSON.stringify(generateBackfillDays(baseInput))).toBe(
      JSON.stringify(generateBackfillDays(baseInput))
    );
  });

  it('samples from the real pool with realistic loads (never above their max)', () => {
    const days = generateBackfillDays(baseInput);
    const poolNames = new Set(pool.map((p) => p.exerciseName));
    for (const day of days) {
      for (const ex of day.exercises) {
        expect(poolNames.has(ex.exerciseName)).toBe(true);
        const source = pool.find((p) => p.exerciseName === ex.exerciseName);
        for (const set of ex.sets) {
          expect(set.weight).toBeGreaterThan(0);
          expect(set.weight).toBeLessThanOrEqual(source.maxWeight);
          expect(set.reps).toBeGreaterThanOrEqual(3);
          expect(set.reps).toBeLessThanOrEqual(15);
        }
      }
    }
  });

  it('skips break windows and conflict dates', () => {
    const days = generateBackfillDays({
      ...baseInput,
      breaks: [{ start: '2026-04-08', end: '2026-04-14' }],
      conflictDates: ['2026-04-01', '2026-04-02', '2026-04-03'],
    });
    for (const day of days) {
      expect(day.date >= '2026-04-08' && day.date <= '2026-04-14').toBe(false);
      expect(['2026-04-01', '2026-04-02', '2026-04-03']).not.toContain(day.date);
    }
  });

  it('enforces the hard caps', () => {
    expect(BACKFILL_MAX_DAYS).toBe(120);
    expect(() =>
      generateBackfillDays({ ...baseInput, startDate: '2025-06-01', endDate: '2026-04-28' })
    ).toThrow(/120/);
    const dense = generateBackfillDays({
      ...baseInput,
      startDate: '2026-01-01',
      endDate: '2026-04-28',
      sessionsPerWeek: 7,
    });
    expect(dense.length).toBeLessThanOrEqual(BACKFILL_MAX_SESSIONS);
  });

  it('refuses an empty exercise pool honestly', () => {
    expect(() => generateBackfillDays({ ...baseInput, exercisePool: [] })).toThrow(/exercise history/i);
  });
});

describe('integrity rails', () => {
  it('the source class derives FULL suppression (billing, plan, engagement)', () => {
    const policy = deriveWorkoutLogSourcePolicy('ai_generated_backfill');
    expect(policy.isHistoricalImport).toBe(true);
    expect(policy.suppressPaidSessionDeduction).toBe(true);
    expect(policy.suppressPlanAdvancement).toBe(true);
    expect(policy.suppressEngagementSideEffects).toBe(true);
  });

  it('the adapter PR step honors suppression (records, never awards)', () => {
    const adapter = read('../../services/workout/aiWorkoutDailyFormService.mjs');
    expect(adapter).toMatch(/awardPoints: !sourcePolicy\.suppressEngagementSideEffects/);
    const pr = read('../../services/workout/workoutPrDetectionService.mjs');
    expect(pr).toMatch(/awardPoints/);
    expect(pr).toMatch(/achievedAt/);
  });

  it('the adapter challenge step honors suppression (backfill never moves live challenges)', () => {
    // Challenge events stamp submittedAt (today), not the backdated workout
    // date — an ungated 60-session backfill would instantly complete active
    // challenges. AD-2 review catch.
    const adapter = read('../../services/workout/aiWorkoutDailyFormService.mjs');
    expect(adapter).toMatch(/sourcePolicy\.suppressEngagementSideEffects\s*\n?\s*\?\s*\{ status: 'suppressed_historical'/);
  });

  it('commit requires attestation and undo deletes in FK-safe order', () => {
    const service = read('../../services/workout/historyBackfillService.mjs');
    expect(service).toMatch(/attestation/);
    expect(service).toMatch(/at least 10 characters|attestation is required/i);
    // FK-safe undo: logs -> sessions -> forms.
    const undoIdx = service.indexOf('undoBackfillRun');
    const undoBlock = service.slice(undoIdx, undoIdx + 2400);
    const logsIdx = undoBlock.indexOf('workout_logs');
    const sessionsIdx = undoBlock.indexOf('workout_sessions');
    const formsIdx = undoBlock.indexOf('daily_workout_forms');
    expect(logsIdx).toBeGreaterThan(-1);
    expect(logsIdx).toBeLessThan(sessionsIdx);
    expect(sessionsIdx).toBeLessThan(formsIdx);
  });

  it('backfill routes are mounted on the trainer/admin-gated router', () => {
    const routes = read('../../routes/adminWorkoutLoggerRoutes.mjs');
    expect(routes).toMatch(/workouts\/backfill\/preview/);
    expect(routes).toMatch(/workouts\/backfill\/commit/);
    expect(routes).toMatch(/backfill-runs\/:runId\/undo/);
  });

  it('run model FKs PascalCase "Users" (never legacy lowercase)', () => {
    const model = read('../../models/HistoryBackfillRun.mjs');
    expect(model).toMatch(/references: \{ model: 'Users', key: 'id' \}/);
    const migration = read('../../migrations/20260707050000-create-history-backfill-runs.cjs');
    expect(migration).toMatch(/model: 'Users'/);
    expect(migration).toMatch(/to_regclass/);
  });
});
