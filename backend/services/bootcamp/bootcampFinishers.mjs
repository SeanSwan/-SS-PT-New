/**
 * ============================================================================
 * FILE: backend/services/bootcamp/bootcampFinishers.mjs
 * PURPOSE: Day-aware cardio-finisher selection — closes SWA-105 D2.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-03 | SLICE: SWA-105 Slice 3
 * ============================================================================
 *
 * WHAT D2 WAS: `CARDIO_FINISHERS[(s + offset) % len]` stapled a finisher onto
 * EVERY station rotated by station index — blind to day type, joint load, and
 * the low-impact quality gate. A lower-body day could receive Squat Jumps on
 * top of an already leg-loaded station.
 *
 * THE POLICY (deliberate, coach-reasoned):
 *  - Strength days (lower/upper) SPARE the day's prime movers: the finisher's
 *    primary region should NOT be the day's loaded region. Legs get their
 *    heart-rate spike from jacks-arms/climbers on lower day; upper day can
 *    absolutely jump. This is the opposite of naive "day-aligned" matching —
 *    finishers exist to elevate heart rate, not to add volume to tired movers.
 *  - Cardio / full-body days take any finisher.
 *  - The low-impact rule mirrors the existing quality gate: unless the class
 *    is explicitly cardio / high-impact, high-impact finishers are excluded.
 *  - FAIL-OPEN: an over-filtered list falls back one step at a time (drop the
 *    day preference, then the impact rule) — a station never loses its
 *    finisher, and every relaxation is reported.
 *  - Joint SUBSTITUTION stays painAwareGating's job downstream (it already
 *    swaps kneeMod/backMod variants); this module only decides WHICH finisher.
 */

import { CARDIO_FINISHERS } from './bootcampConstants.mjs';

/** Same region vocabulary as dayTypeContract, scoped to finisher muscle strings. */
const REGION = Object.freeze({
  quads: 'lower', quadriceps: 'lower', hamstrings: 'lower', glutes: 'lower',
  gluteus_maximus: 'lower', gluteus_medius: 'lower', calves: 'lower',
  hip_flexors: 'lower', hip_abductors: 'lower',
  chest: 'upper', shoulders: 'upper', anterior_deltoid: 'upper', triceps: 'upper',
  biceps: 'upper', lats: 'upper',
  core: 'core', obliques: 'core',
  full_body: 'full',
});

const HIGH_IMPACT = ['jump', 'burpee', 'hop', 'bound', 'tuck', 'star'];

/** The day's loaded region that a strength-day finisher should spare. */
const SPARE_REGION = Object.freeze({ lower_body: 'lower', upper_body: 'upper' });

export function classifyFinisher(finisher) {
  const tokens = String(finisher.muscles ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  const primaryRegion = REGION[tokens[0]] ?? 'full';
  const nameKey = String(finisher.name ?? '').toLowerCase();
  const highImpact = HIGH_IMPACT.some((h) => nameKey.includes(h));
  return { primaryRegion, highImpact };
}

/**
 * Pick `count` finishers for a class. Deterministic given rng; rotates through
 * the eligible set so consecutive stations vary (preserving the variety fix).
 *
 * @returns {{ finishers: Array, relaxed: null|'day_preference'|'impact_rule',
 *             excludedHighImpact: number }}
 */
export function pickFinishers({ dayTypeId, count, highImpactAllowed = false, rng = Math.random }) {
  const classified = CARDIO_FINISHERS.map((f) => ({ finisher: f, ...classifyFinisher(f) }));

  const impactLegal = highImpactAllowed ? classified : classified.filter((c) => !c.highImpact);
  const excludedHighImpact = classified.length - impactLegal.length;

  const spare = SPARE_REGION[dayTypeId];
  const dayPreferred = spare ? impactLegal.filter((c) => c.primaryRegion !== spare) : impactLegal;

  let eligible = dayPreferred;
  let relaxed = null;
  if (eligible.length === 0) {
    eligible = impactLegal;           // drop the day preference first
    relaxed = 'day_preference';
  }
  if (eligible.length === 0) {
    eligible = classified;            // then, and only then, the impact rule
    relaxed = 'impact_rule';
  }

  const offset = Math.floor(rng() * eligible.length);
  const finishers = Array.from(
    { length: Math.max(0, count) },
    (_, i) => eligible[(i + offset) % eligible.length].finisher,
  );
  return { finishers, relaxed, excludedHighImpact };
}
