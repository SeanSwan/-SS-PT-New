/**
 * ============================================================================
 * FILE: backend/services/bootcamp/bootcampChips.mjs
 * PURPOSE: Swan adapter for fact-chip derivation — turns a Swan exercise record
 *          into the small set of facts core can honestly render as chips.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-02 | SLICE: SWA-105 Slice 2
 * ============================================================================
 *
 * THE DISCIPLINE THIS FILE ENFORCES: a chip is emitted only when this adapter
 * can PROVE the fact from the generated class. Everything else is omitted.
 * That restraint is the entire point of P4 — the failure mode being designed
 * out is a rendered justification nobody can trace back to the plan.
 *
 * WHAT GENERATE-TIME CAN PROVE, AND SO EMITS:
 *   low_impact      — from `coreMovement.impact`, the classification the day
 *                     contract already computed for this exercise.
 *   no_setup        — from `setupTimeSec`, which the Rolodex bridge estimates
 *                     from real equipment data (SETUP_TIME_CATEGORIES.instant).
 *   <relaxation>    — from `selectionRung`, stamped by the ladder. This is the
 *                     safety rail becoming visible, and it always leads.
 *
 * WHAT GENERATE-TIME CANNOT PROVE, AND SO DOES NOT EMIT — each of these would
 * be a plausible-looking lie:
 *   same_pattern / same_kit  comparative; there is no exercise being replaced
 *                            at generate time. These belong to the SwapDeck.
 *   joint_safe               needs the frozen constraint snapshot's aggregate
 *                            joint flags, which exist at class start, not here.
 *   not_used_recently        vacuous at generate: the 14-day exclusion already
 *                            removed everything that fails it, so the chip
 *                            would decorate every row and inform nobody.
 *   new / coach_favorite     require the preference model (slice 4).
 *
 * The core `deriveChips` contract accepts all of them, so slice 7's SwapDeck
 * and slice 4's brain light up the remaining tiers without touching core.
 */

import { deriveChips } from '../../../shared/bootcamp-core/chips.mjs';
import { SETUP_TIME_CATEGORIES } from './bootcampConstants.mjs';

/** Instant-setup ceiling, read from the existing category table (Rule 18). */
const NO_SETUP_MAX_SEC = SETUP_TIME_CATEGORIES?.instant?.max ?? 5;

/**
 * Facts this adapter can prove about one generated exercise.
 * Booleans only — a fact is either provable or absent, never "probably".
 */
export function factsForExercise(exercise, { setupTimeSec } = {}) {
  const impact = exercise?.coreMovement?.impact ?? null;
  const setup = Number.isFinite(setupTimeSec)
    ? setupTimeSec
    : Number(exercise?.setupTimeSec ?? NaN);

  return {
    // `low` only. `none` is not a Swan classification and `moderate` is not low
    // impact — a moderate-impact row wearing a low-impact chip is exactly the
    // claim a knee-sensitive participant would act on.
    lowImpact: impact === 'low',
    noSetup: Number.isFinite(setup) && setup <= NO_SETUP_MAX_SEC,
  };
}

/**
 * Chips for one generated exercise: 0..2, closed enum, relaxation first.
 *
 * @param {object} exercise    pooled exercise (carries coreMovement, selectionRung)
 * @param {object} [opts]
 * @param {number} [opts.setupTimeSec]  resolved setup estimate, when the caller
 *                                      already computed it for the record
 * @returns {string[]}
 */
export function chipsForExercise(exercise, opts = {}) {
  return deriveChips(factsForExercise(exercise, opts), {
    rung: exercise?.selectionRung ?? 'R0',
  });
}
