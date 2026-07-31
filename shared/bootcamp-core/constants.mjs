/**
 * ============================================================================
 * FILE: shared/bootcamp-core/constants.mjs
 * PURPOSE: The closed vocabularies of the ClassPlan document.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-31 | SLICE: SWA-105 Slice 0
 * ============================================================================
 *
 * Split out of classPlan.mjs so the schema, its factories and its validator can
 * share one vocabulary without a circular import (Rule 4 forced the split; the
 * decoupling is the better outcome).
 */

export const CLASS_PLAN_SCHEMA_VERSION = 1;

/** Block kinds map onto the Runner's screen inventory (Opus 5 §1.3, S0–S7). */
export const BLOCK_KINDS = Object.freeze(['warmup', 'work', 'cooldown']);

/** How a work block is organised on the floor. */
export const WORK_SHAPES = Object.freeze(['stations', 'full_group']);

/**
 * CLOSED chip enum — max two per selection (Opus 5 §A2: "three chips is a
 * paragraph at 6am"). Adding a member is a deliberate product decision.
 * Free text is never permitted, because a Layer-3 backfill would otherwise
 * render a fabricated justification for an exercise the brain never chose.
 */
export const CHIPS = Object.freeze([
  'same_pattern',
  'same_kit',
  'no_setup',
  'joint_safe',
  'low_impact',
  'not_used_recently',
  'new',
  'coach_favorite',
  'was_here',
]);

/**
 * Relaxation rungs (Opus 5 §A3). Each relaxes EXACTLY ONE constraint.
 * R0 hard floor · R1 anti-repeat · R2 novelty · R3 pattern fidelity
 * R4 not-used-this-class · R5 equipment→bodyweight · R6 no swap exists.
 * R5 is guaranteed non-empty by the always-legal set, so R6 is only reachable
 * when the trainer rejects bodyweight.
 */
export const RUNGS = Object.freeze(['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6']);

/** Who acted. A ROLE, never a person — Rule 8 by construction. */
export const ACTORS = Object.freeze(['system', 'trainer', 'brain']);

/** Where an action happened — selects the SwapDeck weight vector. */
export const MOMENTS = Object.freeze(['build', 'pre_class', 'live']);
