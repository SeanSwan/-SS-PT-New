/**
 * workoutPrDetection.test.mjs — launch charter Phase 4a locks
 * =============================================================
 * (1) Pure candidate math: best weight + best Brzycki est-1RM per exercise,
 *     >15-rep sets excluded from est-1RM (mirrors oneRepMaxService), junk
 *     sets ignored. (2) Source contracts: BOTH write paths invoke the
 *     detection step with the never-fail posture, the 201 carries prEvents,
 *     the ledger award uses the sliced idempotency key, and first-ever lifts
 *     award NO points (quiet baseline).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildPrCandidates, PR_POINTS } from '../../services/workout/workoutPrDetectionService.mjs';
import { estimateBrzycki1RM } from '../../services/oneRepMaxService.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(__dirname, rel), 'utf8');
const SERVICE = read('../../services/workout/workoutPrDetectionService.mjs');
const ROUTE = read('../../routes/dailyWorkoutFormRoutes.mjs');
const ADAPTER = read('../../services/workout/aiWorkoutDailyFormService.mjs');
const MODEL = read('../../models/PersonalRecord.mjs');
const MIGRATION = read('../../migrations/20260707010000-create-personal-records.cjs');

describe('buildPrCandidates', () => {
  const exercise = (name, sets) => ({ exerciseName: name, sets });

  it('takes the heaviest set for weight and best Brzycki for est1rm', () => {
    const [c] = buildPrCandidates([
      exercise('Bench Press', [
        { weight: 185, reps: 8 },
        { weight: 205, reps: 2 },
        { weight: 195, reps: 5 },
      ]),
    ]);
    expect(c.weight.value).toBe(205);
    const bestEst = Math.max(
      estimateBrzycki1RM(185, 8),
      estimateBrzycki1RM(205, 2),
      estimateBrzycki1RM(195, 5)
    );
    expect(c.est1rm.value).toBe(bestEst);
  });

  it('excludes >15-rep sets from est-1RM but not from top-weight', () => {
    const [c] = buildPrCandidates([
      exercise('Leg Press', [
        { weight: 400, reps: 20 },
        { weight: 350, reps: 10 },
      ]),
    ]);
    expect(c.weight.value).toBe(400);
    expect(c.est1rm.value).toBe(estimateBrzycki1RM(350, 10));
  });

  it('ignores bodyweight/zero/junk sets and unnamed exercises', () => {
    const result = buildPrCandidates([
      exercise('Push-up', [{ weight: 0, reps: 20 }]),
      exercise('', [{ weight: 100, reps: 5 }]),
      exercise('Row', [{ weight: 'nope', reps: 5 }, { weight: 95, reps: null }]),
    ]);
    expect(result).toEqual([]);
  });

  it('dedupes by exercise across duplicate entries', () => {
    const result = buildPrCandidates([
      exercise('Squat', [{ weight: 225, reps: 5 }]),
      exercise('Squat', [{ weight: 245, reps: 3 }]),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].weight.value).toBe(245);
  });
});

describe('wiring + safety contracts', () => {
  it('the canonical route runs detection pre-response and ships prEvents in the 201', () => {
    expect(ROUTE).toMatch(/detectAndRecordPersonalRecords\(\{/);
    expect(ROUTE).toMatch(/prEvents,/);
    // Never-fail posture: detection is wrapped, failure only warns.
    expect(ROUTE).toMatch(/PR detection failed \(non-critical\)/);
  });

  it('the unified adapter runs detection post-commit and returns prEvents', () => {
    expect(ADAPTER).toMatch(/detectAndRecordPersonalRecords\(\{/);
    expect(ADAPTER).toMatch(/prEvents,/);
    expect(ADAPTER).toMatch(/PR detection failed \(non-critical\)/);
  });

  it('awards are idempotent, sliced, and first-ever lifts earn no points', () => {
    expect(SERVICE).toMatch(/idempotencyKey: `pr:\$\{numericUserId\}:\$\{candidate\.exerciseName\.slice\(0, 60\)\}/);
    expect(SERVICE).toMatch(/source: 'achievement_earned'/);
    expect(PR_POINTS).toBeGreaterThan(0);
    // First-ever branch records the row and pushes a first event WITHOUT any
    // ledger call (recordLedgerEntry appears only in the beat-prior branch).
    const firstBranch = SERVICE.slice(
      SERVICE.indexOf('if (!prior) {'),
      SERVICE.indexOf('if (best.value > Number(prior.value))')
    );
    expect(firstBranch).not.toMatch(/recordLedgerEntry/);
    expect(firstBranch).toMatch(/first: true/);
  });

  it('model + migration agree on the unique (user, exercise, metric) identity', () => {
    expect(MODEL).toMatch(/personal_records_user_exercise_metric_unique/);
    expect(MIGRATION).toMatch(/personal_records_user_exercise_metric_unique/);
    expect(MODEL).toMatch(/references: \{ model: 'Users', key: 'id' \}/);
    expect(MIGRATION).toMatch(/references: \{ model: 'Users', key: 'id' \}/);
    // Idempotent migration guard (§4.3 contract).
    expect(MIGRATION).toMatch(/to_regclass/);
  });
});
