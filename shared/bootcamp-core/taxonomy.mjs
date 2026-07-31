/**
 * ============================================================================
 * FILE: shared/bootcamp-core/taxonomy.mjs
 * PURPOSE: The MINIMAL movement taxonomy the portable core understands.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-31 | SLICE: SWA-105 Slice 0
 * ============================================================================
 *
 * WHY THIS FILE EXISTS (Kimi K3 finding R11):
 * SwanStudios' own taxonomy is anatomical and specific — `anterior_deltoid`,
 * `gluteus_maximus`, `hip_flexors`. If the portable core spoke that language,
 * every future consumer would be translating into Swan's anatomy in order to
 * use a "portable" package. That is semantic coupling with zero imports, and
 * an import-scan DoD would never catch it.
 *
 * So core speaks PATTERNS and REGIONS — the two things every strength system
 * agrees on — and adapters map their own anatomy onto it. Swan's
 * `anterior_deltoid` maps to region `upper` + pattern `push_v`; another app's
 * `deltoid_front` maps to the same. Neither app's vocabulary leaks into core.
 *
 * NOT AN ENUM OF EXERCISES. Core never knows what a "Bulgarian split squat"
 * is. It knows that whatever the adapter handed it claims pattern `lunge`,
 * primary region `lower`.
 */

/** Movement patterns. Deliberately small — this is a classification axis, not a library. */
export const PATTERNS = Object.freeze([
  'squat',
  'hinge',
  'lunge',
  'push_horizontal',
  'push_vertical',
  'pull_horizontal',
  'pull_vertical',
  'carry',
  'rotate',
  'gait',
  'isometric',
]);

/** Body regions. `full` means genuinely systemic (burpee, thruster), not "lots of muscles". */
export const REGIONS = Object.freeze(['lower', 'upper', 'core', 'full']);

/**
 * Joint load axes. Used for contraindication matching against AGGREGATE flags
 * (see constraints.mjs). Never carries a person identifier — Rule 8 by construction.
 */
export const JOINTS = Object.freeze([
  'knee',
  'shoulder',
  'ankle',
  'wrist',
  'back',
  'elbow',
  'hip',
  'foot',
]);

/** Impact level. Drives the low-impact quality gate that already exists on main. */
export const IMPACT_LEVELS = Object.freeze(['none', 'low', 'moderate', 'high']);

const PATTERN_SET = new Set(PATTERNS);
const REGION_SET = new Set(REGIONS);
const JOINT_SET = new Set(JOINTS);
const IMPACT_SET = new Set(IMPACT_LEVELS);

export const isPattern = (value) => PATTERN_SET.has(value);
export const isRegion = (value) => REGION_SET.has(value);
export const isJoint = (value) => JOINT_SET.has(value);
export const isImpactLevel = (value) => IMPACT_SET.has(value);

/**
 * Opposing-pattern map, used by fatigue sequencing (slice 4) to avoid stacking
 * three consecutive posterior-chain stations. Lives in core because it is a
 * property of human movement, not of SwanStudios.
 */
export const OPPOSING_PATTERN = Object.freeze({
  squat: 'hinge',
  hinge: 'squat',
  push_horizontal: 'pull_horizontal',
  pull_horizontal: 'push_horizontal',
  push_vertical: 'pull_vertical',
  pull_vertical: 'push_vertical',
  lunge: 'hinge',
  carry: 'rotate',
  rotate: 'carry',
  gait: 'isometric',
  isometric: 'gait',
});

/**
 * Normalize an adapter-supplied movement descriptor into core shape.
 * Returns null when the descriptor is unusable — callers must treat null as
 * "this exercise cannot participate in constraint checking" and exclude it,
 * rather than guessing. Guessing is how `core`-tagged squats reached upper day.
 *
 * @param {object} input
 * @returns {{primaryRegion: string, regions: string[], pattern: string|null,
 *            joints: string[], impact: string}|null}
 */
export function normalizeMovement(input) {
  if (!input || typeof input !== 'object') return null;

  const primaryRegion = input.primaryRegion;
  if (!isRegion(primaryRegion)) return null;

  const regions = Array.isArray(input.regions)
    ? [...new Set(input.regions.filter(isRegion))]
    : [];
  if (!regions.includes(primaryRegion)) regions.unshift(primaryRegion);

  const pattern = isPattern(input.pattern) ? input.pattern : null;

  const joints = Array.isArray(input.loadedJoints)
    ? [...new Set(input.loadedJoints.filter(isJoint))]
    : [];

  const impact = isImpactLevel(input.impact) ? input.impact : 'moderate';

  return { primaryRegion, regions, pattern, joints, impact };
}
