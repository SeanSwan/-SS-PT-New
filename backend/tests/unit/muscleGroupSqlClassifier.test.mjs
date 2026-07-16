/**
 * muscleGroupSqlClassifier — locks the shared muscle-group classifier contract
 * ===========================================================================
 * muscleGroupSql.mjs is the SINGLE SOURCE OF TRUTH for muscle-group
 * classification, consumed by BOTH the muscle-group balance chart
 * (chartDataController.getMuscleGroupBalanceChart) AND the strength-profile
 * radar (analyticsExerciseTotalsService). Before unification they had their own
 * inline CASE blocks that DISAGREED on identical logs — "Back Squat" was Legs on
 * the chart but Back on the radar, and "Leg Curl"/"Leg Extension" were mislabeled
 * ARMS on both because Arms was evaluated before Legs.
 *
 * These are pure-string structural locks (no DB) that guard the ORDERING and
 * KEY contract. The behavioral truth (which exercise → which key) is verified
 * against the production DB by scripts/verify-classifier-unification.mjs.
 */
import { describe, it, expect } from 'vitest';
import {
  MUSCLE_GROUP_CASE_SQL,
  MUSCLE_GROUP_DISPLAY,
  RADAR_MUSCLE_GROUP_KEYS,
} from '../../services/analytics/muscleGroupSql.mjs';

describe('muscleGroupSql — branch ordering (prevents the leg→arms mislabel)', () => {
  const idxOf = (key) => MUSCLE_GROUP_CASE_SQL.indexOf(`THEN '${key}'`);

  it('classifies wl."exerciseName" and ends with an ELSE other fallback', () => {
    expect(MUSCLE_GROUP_CASE_SQL).toMatch(/^CASE/);
    expect(MUSCLE_GROUP_CASE_SQL).toContain('wl."exerciseName" ILIKE');
    expect(MUSCLE_GROUP_CASE_SQL).toMatch(/ELSE 'other'\s*END$/);
  });

  it('evaluates Cardio FIRST so treadmill/bike is not caught by another branch', () => {
    const cardioIdx = idxOf('cardio');
    expect(cardioIdx).toBeGreaterThan(-1);
    // cardio's THEN precedes every other muscle THEN
    for (const key of ['legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'full_body']) {
      expect(idxOf(key)).toBeGreaterThan(cardioIdx);
    }
  });

  it('evaluates Legs BEFORE Arms (leg curl/extension = legs, not arms)', () => {
    expect(idxOf('legs')).toBeGreaterThan(-1);
    expect(idxOf('arms')).toBeGreaterThan(idxOf('legs'));
  });

  it('evaluates Legs BEFORE Back (Back Squat = legs, not back)', () => {
    expect(idxOf('back')).toBeGreaterThan(idxOf('legs'));
  });

  it("tightens Back's %lat% to %lat pull% so 'Lateral Raise' is not back", () => {
    expect(MUSCLE_GROUP_CASE_SQL).toContain("ILIKE '%lat pull%'");
    // the greedy bare %lat% (which caught "Lateral") must be gone
    expect(MUSCLE_GROUP_CASE_SQL).not.toContain("ILIKE '%lat%'");
  });
});

describe('muscleGroupSql — key/display contract', () => {
  // every key the CASE can emit
  const emittedKeys = [...MUSCLE_GROUP_CASE_SQL.matchAll(/THEN '([a-z_]+)'/g)]
    .map((m) => m[1])
    .concat('other'); // ELSE 'other'

  it('every emitted key has a Title-case display label', () => {
    for (const key of emittedKeys) {
      expect(MUSCLE_GROUP_DISPLAY[key], `missing display for '${key}'`).toBeTruthy();
    }
  });

  it('the display map has no orphan keys the CASE never emits', () => {
    for (const key of Object.keys(MUSCLE_GROUP_DISPLAY)) {
      expect(emittedKeys, `orphan display key '${key}'`).toContain(key);
    }
  });

  it('radar keys are all real emitted keys (radar has no full_body/other bucket)', () => {
    for (const key of RADAR_MUSCLE_GROUP_KEYS) {
      expect(emittedKeys).toContain(key);
    }
    expect(RADAR_MUSCLE_GROUP_KEYS).not.toContain('full_body');
    expect(RADAR_MUSCLE_GROUP_KEYS).not.toContain('other');
  });
});
