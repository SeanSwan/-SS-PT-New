/**
 * workoutLogSourcePolicyPrSuppression.test.mjs
 * ============================================
 * Regression for the silent PR data-loss bug (hostile review round 2, 2026-07-11).
 *
 * The backfill generator pairs MAX(weight) with MAX(reps) from INDEPENDENT aggregates,
 * so it can emit a set the client never performed (real history 225x1 and 135x15 =>
 * fabricated 225x12). That fabricated set's Brzycki est-1RM (~324) BEATS the client's
 * real est-1RM PR (225), overwriting the PR row and repointing its sessionId at the
 * generated filler session. Undoing the backfill then DESTROYs that row
 * (historyBackfillService destroy-by-sessionId) — permanently erasing the client's real
 * personal best.
 *
 * Root-cause fix: synthetic filler may never mint or beat a PR, so no PR row can ever
 * reference a generated session and undo has nothing of the client's to destroy.
 * REAL historical imports (plaud_merge) must still record baselines — those lifts happened.
 */
import { describe, expect, it } from 'vitest';
import {
  deriveWorkoutLogSourcePolicy,
  WORKOUT_LOG_SOURCES,
} from '../../services/workout/workoutLogSourcePolicy.mjs';
import { estimateBrzycki1RM } from '../../services/oneRepMaxService.mjs';

describe('workout-log source policy — personal-record suppression', () => {
  it('SUPPRESSES personal records for synthetic ai_generated_backfill', () => {
    const policy = deriveWorkoutLogSourcePolicy(WORKOUT_LOG_SOURCES.AI_GENERATED_BACKFILL);
    expect(policy.isSyntheticBackfill).toBe(true);
    expect(policy.suppressPersonalRecords).toBe(true);
  });

  it('still records personal records for REAL PLAUD-merged workouts', () => {
    // plaud_merge is a REAL lift (only its billing is suppressed) — it is deliberately
    // NOT in HISTORICAL_WORKOUT_LOG_SOURCES, and it must keep recording PRs.
    const policy = deriveWorkoutLogSourcePolicy(WORKOUT_LOG_SOURCES.PLAUD_MERGE);
    expect(policy.isSyntheticBackfill).toBe(false);
    expect(policy.suppressPersonalRecords).toBe(false);
  });

  it('still records personal records for REAL historical imports (move-fitness / manual)', () => {
    const policy = deriveWorkoutLogSourcePolicy(WORKOUT_LOG_SOURCES.HISTORICAL_IMPORT);
    expect(policy.isHistoricalImport).toBe(true);
    // Historical but REAL — baselines are recorded; only the SYNTHETIC lane is suppressed.
    expect(policy.suppressPersonalRecords).toBe(false);
  });

  it('still records personal records for ordinary live workouts', () => {
    const policy = deriveWorkoutLogSourcePolicy(undefined);
    expect(policy.suppressPersonalRecords).toBe(false);
  });

  it('documents WHY: the fabricated pairing really does out-score the real PR', () => {
    // Real logged history: a 225x1 single and a 135x15 burnout on a different day.
    const realBest1rm = Math.max(
      estimateBrzycki1RM(225, 1),   // 225
      estimateBrzycki1RM(135, 15),  // ~228
    );
    // What the generator can fabricate by pairing MAX(weight)=225 with MAX(reps)->12:
    const fabricated1rm = estimateBrzycki1RM(225, 12);
    // The fabricated set beats the client's real best — which is exactly how the real PR
    // got overwritten and then destroyed by undo. Suppression is what prevents it.
    expect(fabricated1rm).toBeGreaterThan(realBest1rm);
  });
});

describe('estimateBrzycki1RM — above-ceiling input is REJECTED, not clamped', () => {
  it('returns null (not the 1500 cap) so est-1RM PRs cannot freeze forever', () => {
    // Clamping to the cap stored a bogus 1500 PR; because the PR check is a strict `>`,
    // nothing could ever beat it and est-1RM PRs stopped firing permanently.
    expect(estimateBrzycki1RM(1100, 12)).toBeNull();
  });

  it('still returns real estimates below the ceiling', () => {
    expect(estimateBrzycki1RM(100, 5)).toBe(113);
    expect(estimateBrzycki1RM(100, 1)).toBe(100);
  });
});

describe('buildPrCandidates — exercise names are matched case-insensitively', () => {
  it('collapses "Bench Press" and "bench press" into ONE candidate', async () => {
    const { buildPrCandidates } = await import('../../services/workout/workoutPrDetectionService.mjs');
    const candidates = buildPrCandidates([
      { exerciseName: 'Bench Press', sets: [{ weight: 185, reps: 5 }] },
      { exerciseName: 'bench press', sets: [{ weight: 205, reps: 3 }] },
    ]);
    // One movement, not two competing PR baselines.
    expect(candidates).toHaveLength(1);
    // The FIRST spelling seen is kept for display.
    expect(candidates[0].exerciseName).toBe('Bench Press');
    // ...and the heavier set still wins.
    expect(candidates[0].weight.value).toBe(205);
  });
});
