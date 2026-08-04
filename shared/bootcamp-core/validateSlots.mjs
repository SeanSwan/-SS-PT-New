/**
 * ============================================================================
 * FILE: shared/bootcamp-core/validateSlots.mjs
 * PURPOSE: Slot-level validation — durations, the closed chip enum, and the
 *          INSUFFICIENCY invariants that keep a relaxed selection honest.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-02 | SLICE: SWA-105 Slice 2
 * ============================================================================
 *
 * Split out of validate.mjs when the insufficiency rules pushed that file past
 * the 300-line cap (Rule 4) — the same split validateState.mjs took, for the
 * same reason. Slot rules are the densest part of the validator and the part a
 * future reviewer returns to, so they earn their own file.
 */

import { CHIPS, RUNGS, RUNG_CHIP, RUNG_CONSTRAINT } from './constants.mjs';

const CHIP_SET = new Set(CHIPS);
const RUNG_SET = new Set(RUNGS);
const RELAXATION_CHIPS = new Set(Object.values(RUNG_CHIP));

export function validateSlot(slot, path, structure) {
  const problems = [];
  if (!slot || typeof slot !== 'object') return [`${path} is not an object`];
  if (!slot.displayName) problems.push(`${path}.displayName is required`);

  // A zero-length segment has startsAt === endsAt, so the clock can never be
  // "inside" it — the Runner skips it while the board still shows the exercise.
  for (const field of ['workSec', 'restSec']) {
    const value = slot[field];
    if (value === null || value === undefined) continue;
    if (typeof value !== 'number' || Number.isNaN(value)) {
      problems.push(`${path}.${field} must be a number when present`);
    } else if (field === 'workSec' && value <= 0) {
      problems.push(`${path}.workSec must be > 0 — a zero-duration segment is unreachable by the clock`);
    } else if (field === 'restSec' && value < 0) {
      problems.push(`${path}.restSec must be >= 0`);
    }
  }
  if ((slot.workSec === null || slot.workSec === undefined) && !(structure?.workSec > 0)) {
    problems.push(`${path}.workSec is null and structure.workSec is not usable as a fallback`);
  }

  if (!Array.isArray(slot.chips)) {
    problems.push(`${path}.chips must be an array`);
  } else {
    if (slot.chips.length > 2) {
      problems.push(`${path}.chips has ${slot.chips.length} entries; max 2 (three chips is a paragraph at 6am)`);
    }
    const unknown = slot.chips.filter((c) => !CHIP_SET.has(c));
    if (unknown.length > 0) {
      problems.push(`${path}.chips contains non-enum value(s): ${unknown.join(', ')} — free-text reasons are forbidden`);
    }
  }

  if (!RUNG_SET.has(slot.rung)) problems.push(`${path}.rung must be one of ${RUNGS.join('|')}`);
  if (slot.rung === 'R6') {
    problems.push(`${path}.rung R6 means "no swap exists" and cannot be a committed slot`);
  }

  problems.push(...validateInsufficiency(slot, path));
  return problems;
}

/**
 * INSUFFICIENCY BEHAVIOR (SWA-105 Slice 2, answering Kimi R3).
 *
 * The finding was that the plan defined no behavior when the pool cannot fill
 * the structure math, so a relaxed class was indistinguishable from a clean one.
 * The ladder fixed the SELECTION side; this is the DOCUMENT side, and it is
 * enforced in BOTH directions so neither kind of lie is representable:
 *
 *   rung != R0  =>  the confessing chip MUST be present.
 *       Otherwise a plan that bent pattern fidelity renders as an ordinary row,
 *       the trainer never learns a rule was broken, and R3's DoD item ("assert
 *       WHICH constraint relaxed, not merely that the result was legal") is
 *       unmet by the artifact that is supposed to carry it.
 *
 *   relaxation chip present  =>  the rung MUST match it.
 *       Otherwise a clean selection can wear a gold-outline "bodyweight sub"
 *       chip it did not earn. Cosmetic in the Builder; on a Floor Card at 6am
 *       it is a trainer told the rack was unavailable when it was not.
 *
 * Both directions matter because the failure modes are different people's
 * problems: the first misleads the trainer, the second misleads the class.
 */
function validateInsufficiency(slot, path) {
  const problems = [];
  const expected = RUNG_CHIP[slot.rung];
  const chips = Array.isArray(slot.chips) ? slot.chips : [];
  const present = chips.filter((chip) => RELAXATION_CHIPS.has(chip));

  if (expected && !chips.includes(expected)) {
    problems.push(
      `${path}.rung is ${slot.rung} (${RUNG_CONSTRAINT[slot.rung]} relaxed) but chips do not include `
      + `'${expected}' — a relaxed selection must name the rule it bent`,
    );
  }

  for (const chip of present) {
    if (chip !== expected) {
      problems.push(
        `${path}.chips has relaxation chip '${chip}' but rung is ${slot.rung} `
        + '— a selection may not claim a relaxation it did not need',
      );
    }
  }
  return problems;
}
