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
 * RELAXATION LADDER (SWA-105 Slice 2 — replaces slice 1's fail-open embryo).
 * Pool construction now walks the real, named ladder from relaxation.mjs:
 *
 *   R0  full contract — primary region + pattern exclusions both hold
 *   R3  pattern fidelity relaxed — region still enforced
 *   R5  equipment relaxed — top up from the pinned always-legal bodyweight set,
 *       which is STILL run through the day contract
 *   R6  exhausted — reported, with structural outs; never a silent bypass
 *
 * SLICE 1'S HOLE, CLOSED. The old last step returned the UNFILTERED pool, which
 * re-opened D1 precisely when the pool was thinnest: a narrow equipment profile
 * starved the contract, the starve tripped the fallback, and the fallback put
 * squats back on upper day. R5 tops up with day-LEGAL bodyweight movements
 * instead, so a thin room degrades into a simpler class rather than a wrong one.
 *
 * R1 (anti-repeat) IS DELIBERATELY NOT WIRED HERE. The 14-day freshness
 * exclusion is applied upstream in the generator as a hard filter, and demoting
 * it to a preference is live product behavior tied to the Mark-as-Taught button
 * — Sean's call, not the builder's. The rung exists and is tested in core, so
 * wiring it is a small change the day that ruling lands.
 */

import {
  createDayTypeRegistry, SWAN_DAY_TYPES, checkDayTypeLegality, checkVolumeBudget,
} from '../../../shared/bootcamp-core/dayTypes.mjs';
import { normalizeMovement } from '../../../shared/bootcamp-core/taxonomy.mjs';
import { runLadder } from '../../../shared/bootcamp-core/relaxation.mjs';
import { alwaysLegalTopUp } from './alwaysLegal.mjs';

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
 * Apply the day-type contract to a pool by walking the relaxation ladder.
 *
 * Every returned exercise carries `selectionRung` — the rung IT personally
 * needed, not the rung the batch reached. A pool that descended to R5 still
 * marks its strict members R0, so only the genuinely relaxed rows wear a gold
 * outline. Labelling the whole pool by its worst member is how a mostly-clean
 * class ends up looking broken.
 *
 * @param {Array} exercises  Swan exercise records (registry or Rolodex shape)
 * @param {string} dayTypeId lower_body | upper_body | cardio | full_body
 * @param {number} neededSlots minimum pool size the class needs
 * @returns {{ pool: Array, rung: 'R0'|'R3'|'R5'|'R6', relaxedCounts: object,
 *             rejected: {wrongRegion: number, excludedPattern: number, unclassified: number},
 *             exhausted: boolean, shortfall: number, structuralOuts: Array,
 *             explanation: string }}
 */
export function applyDayTypeContract(exercises, dayTypeId, neededSlots = 1) {
  const registry = getDayTypeRegistry();
  const dayType = registry.has(dayTypeId) ? registry.require(dayTypeId) : registry.require('full_body');

  const rejected = { wrongRegion: 0, excludedPattern: 0, unclassified: 0 };
  const candidates = [];

  // Classify once. `regionLegal` is the hard floor (never relaxed);
  // `patternLegal` is the R3 constraint the ladder may bend.
  for (const exercise of exercises) {
    const movement = toCoreMovement(exercise);
    if (!movement) {
      rejected.unclassified += 1;
      continue;
    }
    const verdict = checkDayTypeLegality(dayType, movement);
    const regionLegal = dayType.primaryRegions.includes(movement.primaryRegion);
    if (!regionLegal) {
      rejected.wrongRegion += 1;
      continue;
    }
    if (!verdict.legal && verdict.reason === 'excluded_pattern') rejected.excludedPattern += 1;
    candidates.push({
      ...exercise,
      coreMovement: movement,
      __patternLegal: verdict.legal || verdict.reason !== 'excluded_pattern',
    });
  }

  const classifyPinned = (exercise) => {
    const movement = toCoreMovement(exercise);
    if (!movement) return null;
    if (!dayType.primaryRegions.includes(movement.primaryRegion)) return null;
    const verdict = checkDayTypeLegality(dayType, movement);
    return {
      ...exercise,
      coreMovement: movement,
      __patternLegal: verdict.legal || verdict.reason !== 'excluded_pattern',
    };
  };

  // The pinned set is classified through the SAME contract — R5 relaxes
  // equipment, never day legality. A bodyweight squat still stays off upper day.
  const pinned = alwaysLegalTopUp(candidates)
    .map(classifyPinned)
    .filter((entry) => entry !== null && entry.__patternLegal);

  const result = runLadder({
    candidates,
    need: neededSlots,
    // Hard floor: primary region already filtered above, so anything reaching
    // the ladder is region-legal. Pattern legality is the R3 constraint.
    hardFilter: () => true,
    constraints: { pattern_fidelity: (entry) => entry.__patternLegal === true },
    alwaysLegal: pinned,
    identify: (entry) => entry.key ?? entry.name,
  });

  const pool = result.admitted.map(({ item, rung }) => {
    const { __patternLegal, ...rest } = item;
    return { ...rest, selectionRung: rung };
  });

  return {
    pool,
    rung: result.rung,
    relaxedCounts: result.relaxedCounts,
    rejected,
    exhausted: result.exhausted,
    shortfall: result.shortfall,
    structuralOuts: result.structuralOuts,
    explanation: describeContract({ dayType, neededSlots, pool, result, rejected }),
  };
}

/** The class explanation — names WHICH constraint relaxed, per Kimi R3's DoD. */
function describeContract({ dayType, neededSlots, pool, result, rejected }) {
  const census = `(${rejected.wrongRegion} wrong primary region, `
    + `${rejected.excludedPattern} excluded pattern, ${rejected.unclassified} unclassified)`;

  if (result.rung === 'R0') {
    return `${dayType.label} contract: ${pool.length} exercises qualify ${census}.`;
  }

  const relaxed = [];
  if (result.relaxedCounts.R3) {
    relaxed.push(`${result.relaxedCounts.R3} admitted by relaxing PATTERN FIDELITY `
      + `(a movement pattern ${dayType.label} normally excludes)`);
  }
  if (result.relaxedCounts.R5) {
    relaxed.push(`${result.relaxedCounts.R5} bodyweight substitute(s) added by relaxing EQUIPMENT`);
  }

  // `relaxed` can legitimately be empty at R6 — the pool ran out before any
  // constraint had something to bend. Joining an empty list into the sentence
  // produced ". ." on the trainer's screen, so the clause is conditional.
  const detail = relaxed.length > 0 ? ` ${relaxed.join('; ')}.` : '';

  if (result.exhausted) {
    return `${dayType.label} contract EXHAUSTED at R6: ${pool.length} of the ${neededSlots} needed `
      + `${census}.${detail} The class still generates — hold stations longer or drop a `
      + 'station. Review exercise library coverage for this day type.';
  }
  return `${dayType.label} contract RELAXED to ${result.rung}: ${pool.length} exercises available, `
    + `${neededSlots} needed ${census}.${detail}`;
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
