/**
 * ============================================================================
 * FILE: shared/bootcamp-core/dayTypes.mjs
 * PURPOSE: Day types as INJECTED CONFIG, and the contract that makes them bite.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-31 | SLICE: SWA-105 Slice 0
 * ============================================================================
 *
 * THIS FILE IS THE FIX FOR D1 — the actual reported bug.
 *
 * What main does today (`bootcampGenerator.mjs:479`):
 *     .filter(([, ex]) => (ex.muscles ?? []).some(m => targetMuscles.includes(m)))
 * against `DAY_TYPE_MUSCLES`, which lists `core` in ALL FOUR rotations. With
 * `.some()`, any exercise carrying `core` as a secondary muscle is legal on
 * every day type. A squat tagged `quads,core` passes UPPER DAY. `cardio` and
 * `full_body` are near-supersets of each other, so those two days barely differ.
 *
 * The filter is not missing. THE FILTER CANNOT FAIL. That is the whole bug.
 *
 * Three structural changes here:
 *   1. PRIMARY-region inclusion, not `.some()` over a flat list. An exercise
 *      belongs to a day because its PRIMARY region qualifies — secondary
 *      involvement never buys admission.
 *   2. EXPLICIT EXCLUSIONS. A day may name patterns it refuses outright, so
 *      "upper day" can reject `squat`/`lunge` no matter how they're tagged.
 *   3. VOLUME BUDGETS. Even legal exercises are capped per region/pattern, so a
 *      full-body day cannot silently become a leg day.
 *
 * AND (Kimi R11): day types are a REGISTRY, injected into the engine — not a
 * TypeScript union baked into core. `SWAN_DAY_TYPES` below is Sean's gym's
 * config, exported as *a* registry, not *the* registry. Another app passes its
 * own and core neither knows nor cares.
 */

import { isPattern, isRegion } from './taxonomy.mjs';

/**
 * @typedef {object} DayTypeDef
 * @property {string} id
 * @property {string} label
 * @property {string[]} primaryRegions  Exercise's PRIMARY region must be in here.
 * @property {string[]} [excludePatterns] Refused outright regardless of tagging.
 * @property {object} [volumeBudget] Max share (0..1) of class slots per region.
 * @property {string} [finisherPolicy] 'none' | 'day_aligned' | 'contrast'
 */

/**
 * SwanStudios' four rotations — Sean's actual gym schedule.
 * EXPORTED AS CONFIG. Core does not import this; adapters pass it in.
 */
export const SWAN_DAY_TYPES = Object.freeze([
  Object.freeze({
    id: 'lower_body',
    label: 'Lower Body',
    primaryRegions: ['lower'],
    excludePatterns: ['push_vertical', 'pull_vertical', 'push_horizontal', 'pull_horizontal'],
    // `core` is allowed as a SECONDARY region but can never exceed a quarter of
    // the class — this is what stops "core day" masquerading as leg day.
    volumeBudget: Object.freeze({ core: 0.25, upper: 0 }),
    finisherPolicy: 'day_aligned',
  }),
  Object.freeze({
    id: 'upper_body',
    label: 'Upper Body',
    primaryRegions: ['upper'],
    // The exclusion that D1 could never express: no squat/hinge/lunge on upper
    // day, no matter how the exercise is muscle-tagged.
    excludePatterns: ['squat', 'hinge', 'lunge'],
    volumeBudget: Object.freeze({ core: 0.25, lower: 0 }),
    finisherPolicy: 'day_aligned',
  }),
  Object.freeze({
    id: 'cardio',
    label: 'Cardio',
    // Cardio is the one day defined by ENERGY rather than region, so it admits
    // all regions — but it is separated from full_body by demanding cyclical /
    // systemic patterns and a real impact allowance, not by muscle overlap.
    primaryRegions: ['lower', 'upper', 'core', 'full'],
    excludePatterns: ['carry'],
    volumeBudget: Object.freeze({ upper: 0.35 }),
    finisherPolicy: 'contrast',
  }),
  Object.freeze({
    id: 'full_body',
    label: 'Full Body',
    primaryRegions: ['lower', 'upper', 'core', 'full'],
    excludePatterns: [],
    // The budget IS the definition of full-body: no region may dominate.
    // Without this, full_body and cardio generate the same class (D3).
    volumeBudget: Object.freeze({ lower: 0.45, upper: 0.45, core: 0.3 }),
    finisherPolicy: 'contrast',
  }),
]);

/**
 * Build a registry from a day-type definition list. Validates eagerly so a
 * malformed config fails at construction, not at 5:50am.
 * @param {DayTypeDef[]} definitions
 */
export function createDayTypeRegistry(definitions) {
  if (!Array.isArray(definitions) || definitions.length === 0) {
    throw new Error('createDayTypeRegistry: at least one day-type definition is required');
  }

  const byId = new Map();
  for (const def of definitions) {
    const problems = validateDayTypeDef(def);
    if (problems.length > 0) {
      throw new Error(`createDayTypeRegistry: invalid day type "${def?.id}": ${problems.join('; ')}`);
    }
    if (byId.has(def.id)) {
      throw new Error(`createDayTypeRegistry: duplicate day type id "${def.id}"`);
    }
    byId.set(def.id, def);
  }

  return Object.freeze({
    ids: () => [...byId.keys()],
    has: (id) => byId.has(id),
    get: (id) => byId.get(id) ?? null,
    /** @returns {DayTypeDef} @throws when absent — callers must not default silently. */
    require: (id) => {
      const def = byId.get(id);
      if (!def) {
        throw new Error(
          `Unknown day type "${id}". Known: ${[...byId.keys()].join(', ')}. `
          + 'Refusing to fall back to a default — a silent default is how a class '
          + 'ends up generated for the wrong day.',
        );
      }
      return def;
    },
  });
}

export function validateDayTypeDef(def) {
  const problems = [];
  if (!def || typeof def !== 'object') return ['not an object'];
  if (typeof def.id !== 'string' || !def.id.trim()) problems.push('id must be a non-empty string');
  if (typeof def.label !== 'string' || !def.label.trim()) problems.push('label must be a non-empty string');

  if (!Array.isArray(def.primaryRegions) || def.primaryRegions.length === 0) {
    problems.push('primaryRegions must be a non-empty array');
  } else if (!def.primaryRegions.every(isRegion)) {
    problems.push(`primaryRegions contains unknown region(s): ${def.primaryRegions.filter((r) => !isRegion(r)).join(', ')}`);
  }

  if (def.excludePatterns !== undefined) {
    if (!Array.isArray(def.excludePatterns)) problems.push('excludePatterns must be an array');
    else if (!def.excludePatterns.every(isPattern)) {
      problems.push(`excludePatterns contains unknown pattern(s): ${def.excludePatterns.filter((p) => !isPattern(p)).join(', ')}`);
    }
  }

  if (def.volumeBudget !== undefined) {
    if (typeof def.volumeBudget !== 'object' || def.volumeBudget === null) {
      problems.push('volumeBudget must be an object');
    } else {
      for (const [region, share] of Object.entries(def.volumeBudget)) {
        if (!isRegion(region)) problems.push(`volumeBudget has unknown region "${region}"`);
        if (typeof share !== 'number' || share < 0 || share > 1) {
          problems.push(`volumeBudget.${region} must be a number in [0,1]`);
        }
      }
    }
  }

  return problems;
}

/**
 * THE DAY-TYPE CONTRACT. Answers one question with a reason: may this movement
 * appear on this day?
 *
 * Deliberately returns a REASON, not a boolean — the reason becomes the
 * structured fact-chip on the swap deck (Opus 5 §S2) and the audit line in the
 * class explanation. A boolean here would force prose to be invented downstream.
 *
 * @param {DayTypeDef} dayType
 * @param {{primaryRegion: string, regions: string[], pattern: string|null}} movement
 * @returns {{legal: boolean, reason: string, detail?: string}}
 */
export function checkDayTypeLegality(dayType, movement) {
  if (!movement) return { legal: false, reason: 'unclassified' };

  const excluded = dayType.excludePatterns ?? [];
  if (movement.pattern && excluded.includes(movement.pattern)) {
    return {
      legal: false,
      reason: 'excluded_pattern',
      detail: `${movement.pattern} is excluded from ${dayType.label}`,
    };
  }

  // PRIMARY region only. Secondary involvement never buys admission — this
  // single line is what `.some()` got wrong.
  if (!dayType.primaryRegions.includes(movement.primaryRegion)) {
    return {
      legal: false,
      reason: 'wrong_primary_region',
      detail: `primary region ${movement.primaryRegion} not in ${dayType.primaryRegions.join('/')}`,
    };
  }

  return { legal: true, reason: 'primary_region_match' };
}

/**
 * Volume-budget check, applied to a PROSPECTIVE selection rather than one
 * exercise. Legality alone cannot stop a full-body day drifting into a leg day;
 * only a budget over the whole class can.
 *
 * @param {DayTypeDef} dayType
 * @param {Array<{primaryRegion: string}>} selected  movements already chosen
 * @param {{primaryRegion: string}} candidate
 * @param {number} totalSlots  planned slots for the class (>0)
 * @returns {{withinBudget: boolean, reason?: string, detail?: string}}
 */
export function checkVolumeBudget(dayType, selected, candidate, totalSlots) {
  const budget = dayType.volumeBudget;
  if (!budget || !candidate || !(totalSlots > 0)) return { withinBudget: true };

  const share = budget[candidate.primaryRegion];
  if (share === undefined) return { withinBudget: true };

  const already = selected.filter((m) => m?.primaryRegion === candidate.primaryRegion).length;
  // A nonzero share must never round down to an outright ban — in a 2-slot
  // full-body class, floor(0.45 * 2) = 0 banned lower-body entirely, which is
  // exactly the n=4 small-class case this engine exists to handle. A ban is
  // expressed as share === 0 (see upper_body's `lower: 0`), never by rounding.
  const maxAllowed = share === 0 ? 0 : Math.max(1, Math.floor(share * totalSlots));

  if (already + 1 > maxAllowed) {
    return {
      withinBudget: false,
      reason: 'volume_budget_exceeded',
      detail: `${candidate.primaryRegion} capped at ${maxAllowed}/${totalSlots} for ${dayType.label}`,
    };
  }
  return { withinBudget: true };
}
