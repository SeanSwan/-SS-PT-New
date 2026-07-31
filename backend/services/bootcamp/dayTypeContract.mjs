/**
 * ============================================================================
 * FILE: backend/services/bootcamp/dayTypeContract.mjs
 * PURPOSE: The Swan adapter for the portable day-type contract — maps Swan's
 *          exercise records (28 muscle tokens + 7 categories) into core
 *          movements and applies the contract that replaces the `.some()`
 *          filter (SWA-105 D1).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-07-31 | SLICE: SWA-105 Slice 1
 * ============================================================================
 *
 * WHY: main filtered the day pool with
 *     (ex.muscles ?? []).some(m => targetMuscles.includes(m))
 * against DAY_TYPE_MUSCLES, which lists `core` in ALL FOUR rotations — so any
 * core-tagged exercise was legal on every day and a `quads,core` squat passed
 * UPPER DAY. The filter could not fail. This adapter replaces it with the
 * shared contract: PRIMARY-region inclusion + explicit pattern exclusions +
 * per-region volume budgets (shared/bootcamp-core/dayTypes.mjs).
 *
 * TAXONOMY BRIDGE (Kimi R11 — core speaks regions/patterns, Swan maps in):
 *  - primaryRegion comes from the exercise's FIRST muscle (the registry's own
 *    primary-muscle convention, same one main's selector uses).
 *  - pattern comes from the registry's `category` field (squat/hinge/lunge/
 *    push/pull/core/corrective), refined to horizontal/vertical by name.
 *  - An exercise this map cannot classify is EXCLUDED, never guessed in —
 *    guessing is how core-tagged squats reached upper day.
 *
 * FAIL-OPEN LADDER (the class always generates): full contract → drop pattern
 * exclusions → unfiltered pool, each step surfaced in `explanations`. This is
 * slice-2's relaxation ladder in embryo, scoped to pool construction.
 */

import {
  createDayTypeRegistry, SWAN_DAY_TYPES, checkDayTypeLegality, checkVolumeBudget,
} from '../../../shared/bootcamp-core/dayTypes.mjs';
import { normalizeMovement } from '../../../shared/bootcamp-core/taxonomy.mjs';

/** Swan muscle token -> core region. Covers the 28 registry tokens plus the
 *  CARDIO_FINISHERS aliases (quadriceps, gluteus_maximus, shoulders, full_body). */
const MUSCLE_REGION = Object.freeze({
  // lower
  adductors: 'lower', calves: 'lower', glute_medius: 'lower', glutes: 'lower',
  hamstrings: 'lower', hip_abductors: 'lower', hip_flexors: 'lower',
  it_band: 'lower', quads: 'lower', tfl: 'lower',
  quadriceps: 'lower', gluteus_maximus: 'lower', gluteus_medius: 'lower',
  // upper
  anterior_deltoid: 'upper', biceps: 'upper', brachioradialis: 'upper',
  chest: 'upper', lateral_deltoid: 'upper', lats: 'upper', lower_chest: 'upper',
  rear_deltoid: 'upper', rhomboids: 'upper', rotator_cuff: 'upper',
  traps: 'upper', triceps: 'upper', upper_chest: 'upper', shoulders: 'upper',
  // core
  core: 'core', erector_spinae: 'core', obliques: 'core', tva: 'core',
  thoracic_spine: 'core',
  // systemic
  full_body: 'full',
});

const VERTICAL_HINTS = ['overhead', 'shoulder_press', 'military', 'pike', 'pull_up', 'pullup', 'chin', 'pulldown', 'lat_pull'];
const ROTATE_HINTS = ['twist', 'rotation', 'chop', 'russian'];
const HOLD_HINTS = ['plank', 'hold', 'dead_bug', 'bird_dog', 'wall_sit', 'carry'];
const HIGH_IMPACT_HINTS = ['jump', 'hop', 'burpee', 'sprint', 'bound', 'plyo', 'tuck'];
const MODERATE_IMPACT_HINTS = ['run', 'jog', 'skip', 'climber', 'jack', 'skater', 'shuffle', 'high_knees'];

function searchKey(exercise) {
  return `${exercise.key ?? ''} ${exercise.name ?? ''}`.toLowerCase().replace(/\s+/g, '_');
}

function inferPattern(exercise) {
  const category = exercise.category;
  const text = searchKey(exercise);
  if (category === 'squat') return 'squat';
  if (category === 'hinge') return 'hinge';
  if (category === 'lunge') return 'lunge';
  if (category === 'push') return VERTICAL_HINTS.some((h) => text.includes(h)) ? 'push_vertical' : 'push_horizontal';
  if (category === 'pull') return VERTICAL_HINTS.some((h) => text.includes(h)) ? 'pull_vertical' : 'pull_horizontal';
  if (category === 'core') {
    if (ROTATE_HINTS.some((h) => text.includes(h))) return 'rotate';
    if (HOLD_HINTS.some((h) => text.includes(h))) return 'isometric';
    return null; // region rule still governs; no pattern exclusion applies
  }
  // corrective / finishers / unknown categories: name-derived where obvious
  if (HOLD_HINTS.some((h) => text.includes(h))) return 'isometric';
  if (MODERATE_IMPACT_HINTS.some((h) => text.includes(h)) || HIGH_IMPACT_HINTS.some((h) => text.includes(h))) return 'gait';
  return null;
}

function inferImpact(exercise) {
  const text = searchKey(exercise);
  if (HIGH_IMPACT_HINTS.some((h) => text.includes(h))) return 'high';
  if (MODERATE_IMPACT_HINTS.some((h) => text.includes(h))) return 'moderate';
  return 'low';
}

/**
 * Map a Swan exercise record into a core movement, or null when the record is
 * unclassifiable (unknown primary muscle). Null means "cannot participate in
 * contract checking" and the caller EXCLUDES it — with a count in the summary
 * so taxonomy holes are visible instead of silent.
 */
export function toCoreMovement(exercise) {
  const muscles = Array.isArray(exercise?.muscles) ? exercise.muscles : [];
  const primaryToken = exercise?.primaryMuscle || muscles[0];
  const primaryRegion = MUSCLE_REGION[primaryToken];
  if (!primaryRegion) return null;

  const regions = [...new Set(muscles.map((m) => MUSCLE_REGION[m]).filter(Boolean))];
  return normalizeMovement({
    primaryRegion,
    regions,
    pattern: inferPattern(exercise),
    loadedJoints: [],
    impact: inferImpact(exercise),
  });
}

let registrySingleton = null;
export function getDayTypeRegistry() {
  if (!registrySingleton) registrySingleton = createDayTypeRegistry(SWAN_DAY_TYPES);
  return registrySingleton;
}

/**
 * Apply the day-type contract to a pool, with the fail-open ladder.
 *
 * @param {Array} exercises  Swan exercise records (registry or Rolodex shape)
 * @param {string} dayTypeId lower_body | upper_body | cardio | full_body
 * @param {number} neededSlots minimum pool size the class needs
 * @returns {{ pool: Array, ladderStep: 'contract'|'no_pattern_exclusions'|'unfiltered',
 *             rejected: {wrongRegion: number, excludedPattern: number, unclassified: number},
 *             explanation: string }}
 */
export function applyDayTypeContract(exercises, dayTypeId, neededSlots = 1) {
  const registry = getDayTypeRegistry();
  const dayType = registry.has(dayTypeId) ? registry.require(dayTypeId) : registry.require('full_body');

  const rejected = { wrongRegion: 0, excludedPattern: 0, unclassified: 0 };
  const legal = [];
  const regionOnlyLegal = []; // ladder step 2: ignore pattern exclusions

  for (const exercise of exercises) {
    const movement = toCoreMovement(exercise);
    if (!movement) {
      rejected.unclassified += 1;
      continue;
    }
    const verdict = checkDayTypeLegality(dayType, movement);
    const annotated = { ...exercise, coreMovement: movement };
    if (verdict.legal) {
      legal.push(annotated);
      regionOnlyLegal.push(annotated);
    } else if (verdict.reason === 'excluded_pattern') {
      rejected.excludedPattern += 1;
      // Region still qualifies — eligible if the ladder relaxes patterns.
      if (dayType.primaryRegions.includes(movement.primaryRegion)) regionOnlyLegal.push(annotated);
    } else {
      rejected.wrongRegion += 1;
    }
  }

  if (legal.length >= neededSlots) {
    return {
      pool: legal,
      ladderStep: 'contract',
      rejected,
      explanation: `${dayType.label} contract: ${legal.length} exercises qualify `
        + `(${rejected.wrongRegion} wrong primary region, ${rejected.excludedPattern} excluded pattern, `
        + `${rejected.unclassified} unclassified).`,
    };
  }
  if (regionOnlyLegal.length >= neededSlots) {
    return {
      pool: regionOnlyLegal,
      ladderStep: 'no_pattern_exclusions',
      rejected,
      explanation: `${dayType.label} contract RELAXED (pattern exclusions dropped): the strict pool `
        + `had ${legal.length} of the ${neededSlots} needed. Region rule still enforced.`,
    };
  }
  return {
    pool: exercises,
    ladderStep: 'unfiltered',
    rejected,
    explanation: `${dayType.label} contract could not fill the class (${regionOnlyLegal.length}/${neededSlots} `
      + 'even relaxed) — pool left unfiltered so the class still generates. Review the exercise library '
      + 'coverage for this day type.',
  };
}

/**
 * Volume-budget gate for the selection fallback (the D1 leak point). Keeps a
 * candidate out when its primary region has hit the day's share of the class.
 * Candidates without a classified movement are allowed through — the pool
 * filter above already decided their fate; this gate only budgets.
 */
export function budgetGate(dayTypeId, selectedMovements, totalSlots) {
  const registry = getDayTypeRegistry();
  if (!registry.has(dayTypeId)) return () => true;
  const dayType = registry.require(dayTypeId);
  return (exercise) => {
    const movement = exercise?.coreMovement ?? toCoreMovement(exercise);
    if (!movement) return true;
    return checkVolumeBudget(dayType, selectedMovements, movement, totalSlots).withinBudget;
  };
}
