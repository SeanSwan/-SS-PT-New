/**
 * Phase 2 Slice 2.1 (2026-05-03) — chart/KPI truthfulness regression locks
 * ========================================================================
 * Phase 1 closed the trainer-logging → client-dashboard data path. Phase 2
 * audits chart/KPI truthfulness for default-value pollution that survives
 * the writer-side Phase 16 fixes. Audit found five bugs all in the same
 * Phase 16 null-honest pattern class:
 *
 *   B1 — dailyWorkoutFormRoutes.mjs:1141 (legacy `/progress` formTrends):
 *        `(ex.formRating || 3)` summed across all exercises divided by
 *        exercises.length. Phantom 3/5 dragged averages toward 3 for every
 *        unrated exercise. The canonical `/progress-detailed` reader at
 *        line 1418-1428 already does this correctly (positive numeric
 *        ratings only + null fallback);
 *        the legacy reader is reachable as a frontend fallback path AND
 *        directly from nasmApiService and EnhancedClientProgressView.
 *
 *   B2 — aiChatRoutes.mjs ~line 758 (workout-import action handler):
 *        `intensity: intensity || 5` writer-side fallback when an AI-extracted
 *        import payload omits intensity. WorkoutSession.intensity is
 *        allowNull: true (model:59-71), null = "not rated"; phantom 5
 *        polluted chartDataController.getIntensityRPETrendChart's AVG().
 *
 *   B3 — workoutSummaryRoutes.mjs:30: destructuring default
 *        `overallIntensity = 5` made the trainer recap unconditionally print
 *        "Overall Intensity: 5/10" even when the trainer omitted intensity.
 *
 *   B4 — workoutSummaryRoutes.mjs:68: `(ex.formRating || 0)` summed across
 *        all exercises divided by exercises.length. Unrated exercises dragged
 *        the avg toward 0 in the summary text and email.
 *
 *   B5 — workoutSummaryRoutes.mjs:60-65: avgRpe summed per-exercise averages
 *        and divided by exercises.length. Exercises with no rated sets
 *        contributed 0 to the per-workout average.
 *
 * These locks are source-text regex locks — same pattern as
 * phase16DailyWorkoutFormReaderNullGuards.test.mjs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DAILY_FORM_SOURCE = readFileSync(
  resolve(__dirname, '../../routes/dailyWorkoutFormRoutes.mjs'),
  'utf8',
);
const AI_CHAT_SOURCE = readFileSync(
  resolve(__dirname, '../../routes/aiChatRoutes.mjs'),
  'utf8',
);
const WORKOUT_SUMMARY_SOURCE = readFileSync(
  resolve(__dirname, '../../routes/workoutSummaryRoutes.mjs'),
  'utf8',
);

describe('Phase 2 Slice 2.1 — B1: legacy /progress formTrends null-honest', () => {
  // Slice between the two router.get declarations: the LEGACY
  // /client/:clientId/progress handler vs the canonical
  // /client/:clientId/progress-detailed handler. The canonical reader
  // already uses the correct pattern; we lock the legacy reader.
  const legacyStart = DAILY_FORM_SOURCE.indexOf(
    "router.get('/client/:clientId/progress',",
  );
  const detailedStart = DAILY_FORM_SOURCE.indexOf(
    "router.get('/client/:clientId/progress-detailed',",
  );

  it('source contains both legacy /progress and /progress-detailed handlers (sanity)', () => {
    expect(legacyStart).toBeGreaterThan(0);
    expect(detailedStart).toBeGreaterThan(legacyStart);
  });

  it('legacy formTrends reader does NOT `reduce + (ex.formRating || N)` in code context', () => {
    const legacySlice = DAILY_FORM_SOURCE.slice(legacyStart, detailedStart);
    // Negative lock: the buggy CODE pattern was a `.reduce(...)` whose
    // accumulator added `(ex.formRating || N)`. Comment-quoted mentions
    // of the old pattern (which the file legitimately keeps for
    // historical context) are excluded by requiring a `.reduce(` near
    // the `||` operator in the same line.
    const buggyComboThree = /reduce\([\s\S]{0,120}ex\.formRating\s*\|\|\s*3/;
    const buggyComboZero = /reduce\([\s\S]{0,120}ex\.formRating\s*\|\|\s*0/;
    expect(legacySlice).not.toMatch(buggyComboThree);
    expect(legacySlice).not.toMatch(buggyComboZero);
  });

  it('legacy formTrends reader filters to positive numeric ratings before averaging', () => {
    const legacySlice = DAILY_FORM_SOURCE.slice(legacyStart, detailedStart);
    expect(legacySlice).toMatch(
      /\.map\(ex\s*=>\s*Number\(ex\.formRating\)\)\s*[\r\n\s]*\.filter\(rating\s*=>\s*Number\.isFinite\(rating\)\s*&&\s*rating\s*>\s*0\)/
    );
  });

  it('legacy formTrends reader returns null when no exercise was rated', () => {
    const legacySlice = DAILY_FORM_SOURCE.slice(legacyStart, detailedStart);
    // Should render null, not 0, when ratings.length === 0. Locks the
    // null-honest contract: phantom 0 is a different lie than phantom 3.
    expect(legacySlice).toMatch(/averageFormRating:\s*ratings\.length\s*>\s*0[\s\S]*?:\s*null/);
  });
});

describe('Phase 2 Slice 2.1 — B2: aiChatRoutes import intensity null-honest', () => {
  function legacyImportWorkoutSlice() {
    const importHandlerIdx = AI_CHAT_SOURCE.indexOf('import_workout_log');
    if (importHandlerIdx === -1) return null;
    const sliceEnd = AI_CHAT_SOURCE.indexOf('workoutImportResults.push', importHandlerIdx + 100);
    expect(sliceEnd).toBeGreaterThan(importHandlerIdx);
    return AI_CHAT_SOURCE.slice(importHandlerIdx, sliceEnd);
  }

  it('workout-import handler is absent or does NOT `intensity || 5` on WorkoutSession.create', () => {
    // The legacy direct writer may be removed entirely. If it exists, it must
    // still preserve null-honest intensity behavior.
    const slice = legacyImportWorkoutSlice();
    if (!slice) {
      expect(AI_CHAT_SOURCE).not.toMatch(/WorkoutSession\.create[\s\S]{0,300}intensity:\s*intensity\s*\|\|\s*5/);
      return;
    }

    expect(slice).not.toMatch(/intensity:\s*intensity\s*\|\|\s*5/);
  });

  it('workout-import handler is removed or explicitly null-coerces missing intensity', () => {
    // Positive lock: if the legacy handler returns, importedIntensity must
    // guard both undefined and null and pass through any genuine 1-10 value.
    const slice = legacyImportWorkoutSlice();
    if (!slice) {
      expect(AI_CHAT_SOURCE).not.toMatch(/workoutImportResults/);
      return;
    }

    expect(AI_CHAT_SOURCE).toMatch(
      /importedIntensity\s*=\s*\(intensity\s*===\s*undefined\s*\|\|\s*intensity\s*===\s*null\)/,
    );
  });
});

describe('Phase 2 Slice 2.1 — B3-B5: workoutSummaryRoutes null-honest summary', () => {
  it('B3: destructuring default for overallIntensity is null, not 5', () => {
    expect(WORKOUT_SUMMARY_SOURCE).not.toMatch(/overallIntensity\s*=\s*5\s*,/);
    expect(WORKOUT_SUMMARY_SOURCE).toMatch(/overallIntensity\s*=\s*null\s*,/);
  });

  it('B3: summary template gates the Overall Intensity line on non-null', () => {
    // The line was unconditionally rendered before. Now it must be wrapped
    // in a (overallIntensity !== undefined && overallIntensity !== null) guard.
    expect(WORKOUT_SUMMARY_SOURCE).toMatch(
      /overallIntensity\s*!==\s*undefined\s*&&\s*overallIntensity\s*!==\s*null[\s\S]{0,200}Overall Intensity/,
    );
  });

  it('B4: avgFormRating uses the rated-only ratedFormRatings collector', () => {
    // Positive lock: the new code path must use ratedFormRatings.
    // (We cannot use a simple `.not.toMatch(/ex\.formRating || 0/)`
    // because the surrounding comment quotes the old pattern.)
    expect(WORKOUT_SUMMARY_SOURCE).toMatch(/ratedFormRatings/);

    // Negative lock: there must be NO line that both `reduce`s
    // `(ex.formRating || 0)` AND divides by `exercises.length` —
    // that's the exact buggy combination.
    const buggyCombo = /reduce\([\s\S]{0,80}ex\.formRating\s*\|\|\s*0[\s\S]{0,80}\/\s*exercises\.length/;
    expect(WORKOUT_SUMMARY_SOURCE).not.toMatch(buggyCombo);
  });

  it('B5: avgRpe collects all rated sets across exercises (flat) before averaging', () => {
    // Old pattern was per-exercise average summed and divided by
    // exercises.length, which dragged the avg toward 0 for unrated
    // exercises. New pattern flattens all rated sets across exercises
    // into a single list and averages that.
    expect(WORKOUT_SUMMARY_SOURCE).toMatch(/allRpes\s*=\s*exercises[\s\S]{0,200}\.flatMap/);
    // The new pattern divides by allRpes.length, NOT exercises.length.
    // Use [\s\S]*? non-greedy because reduce's callback contains nested parens.
    expect(WORKOUT_SUMMARY_SOURCE).toMatch(/allRpes\.reduce\([\s\S]*?\)\s*\/\s*allRpes\.length/);
  });

  it('phase 2 slice 2.1 banner present in workoutSummaryRoutes for future grep', () => {
    expect(WORKOUT_SUMMARY_SOURCE).toMatch(/Phase 2 Slice 2\.1/);
  });
});

describe('Phase 2 Slice 2.1 — banner discoverability', () => {
  it('dailyWorkoutFormRoutes carries the Phase 2 Slice 2.1 banner', () => {
    expect(DAILY_FORM_SOURCE).toMatch(/Phase 2 Slice 2\.1/);
  });

  it('aiChatRoutes carries the Phase 2 Slice 2.1 banner', () => {
    expect(AI_CHAT_SOURCE).toMatch(/Phase 2 Slice 2\.1/);
  });
});
