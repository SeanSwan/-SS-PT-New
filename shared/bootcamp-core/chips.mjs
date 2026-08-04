/**
 * ============================================================================
 * FILE: shared/bootcamp-core/chips.mjs
 * PURPOSE: Fact-chip derivation — how a selection explains itself WITHOUT prose.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-02 | SLICE: SWA-105 Slice 2
 * ============================================================================
 *
 * THE FINDING THIS ANSWERS (Opus 5 P4): the original plan had the brain "return
 * a REASON per exercise." But Layer 3 rejects and backfills, so some rendered
 * reasons would be FABRICATED JUSTIFICATIONS FOR EXERCISES THE BRAIN NEVER
 * CHOSE — worse than no reasons, and a Rule-75 Trailhead-Truth violation
 * waiting to happen.
 *
 * So reasons are STRUCTURED FACTS DERIVED FROM THE FINAL PLAN, not prose
 * authored beside it. Two consequences, both load-bearing:
 *   1. They survive backfill — derived from what shipped, not from what was
 *      proposed. There is no code path that can narrate a rejected pick.
 *   2. The LLM may rank and order; it may NOT narrate. The chip vocabulary is
 *      closed (constants.mjs), so a model cannot invent a justification even
 *      if it wants to.
 *
 * TWO CHIPS, NEVER THREE. "Three chips is a paragraph at 6am." The cap is
 * enforced here at derivation and again in validate.mjs, because a cap applied
 * only at render is a cap that leaks into the PDF.
 *
 * TONE, NOT COLOUR. Core returns `structural | earned | relaxed`; the renderer
 * maps tone to the Crystalline palette (cyan / gold / gold-outline). PURPLE IS
 * UNREPRESENTABLE HERE BY CONSTRUCTION — purple means AI-coach in this product,
 * and these chips are deterministic, so a purple chip would lie about
 * provenance. There is no tone that maps to it.
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT DO: carry values. The spec sketched
 * `knee-safe x3`. `slot.chips` is a closed string enum, and duplicating the
 * aggregate count onto the chip creates a second copy that can drift from the
 * constraint snapshot that owns it. The renderer composes `joint_safe` with
 * `snapshot.severeJointFlagCounts` at paint time instead — one source, no drift.
 */

import { CHIPS, RUNG_CHIP } from './constants.mjs';

export { CHIPS, RUNG_CHIP };

const RELAXED_CHIPS = Object.freeze(new Set(Object.values(RUNG_CHIP)));

/**
 * Chip -> tone. Every member of CHIPS must appear here; the test suite asserts
 * totality, so adding a chip without a tone fails the build rather than
 * rendering an unstyled chip on a TV at 20 feet.
 */
export const CHIP_TONE = Object.freeze({
  same_pattern: 'structural',
  same_kit: 'structural',
  no_setup: 'structural',
  joint_safe: 'structural',
  low_impact: 'structural',

  not_used_recently: 'earned',
  new: 'earned',
  coach_favorite: 'earned',
  was_here: 'earned',

  used_recently: 'relaxed',
  familiar: 'relaxed',
  different_pattern: 'relaxed',
  repeated_this_class: 'relaxed',
  bodyweight_sub: 'relaxed',
});

export const TONES = Object.freeze(['structural', 'earned', 'relaxed']);

export const chipTone = (chip) => CHIP_TONE[chip] ?? null;
export const isRelaxedChip = (chip) => RELAXED_CHIPS.has(chip);

/**
 * Priority order, highest first. This is the SwapDeck tier order (Opus 5 §S2)
 * made explicit: chips are "ordered by the tier that actually drove the rank."
 *
 *   was_here            provenance — the undo affordance outranks everything
 *   <relaxed chip>      injected ahead of these by deriveChips (see below)
 *   T1 joint safety     joint_safe, low_impact
 *   T2 movement fidelity same_pattern
 *   T3 setup delta      no_setup, same_kit
 *   T4 anti-repeat      not_used_recently
 *   T5 novelty/favorite new, coach_favorite
 */
const CHIP_PRIORITY = Object.freeze([
  'was_here',
  'joint_safe',
  'low_impact',
  'same_pattern',
  'no_setup',
  'same_kit',
  'not_used_recently',
  'new',
  'coach_favorite',
]);

/** fact key -> chip. Facts are booleans the adapter can actually prove. */
const FACT_CHIP = Object.freeze({
  wasHere: 'was_here',
  jointSafe: 'joint_safe',
  lowImpact: 'low_impact',
  samePattern: 'same_pattern',
  noSetup: 'no_setup',
  sameKit: 'same_kit',
  notUsedRecently: 'not_used_recently',
  isNew: 'new',
  coachFavorite: 'coach_favorite',
});

export const MAX_CHIPS = 2;

/**
 * Derive at most two chips for one selection.
 *
 * The relaxation chip, when the item needed one, is ALWAYS first and is never
 * displaced by a positive fact. A relaxed row that leads with "no setup" and
 * hides "different pattern" behind the two-chip cap is exactly the comfortable
 * half-truth the ladder exists to prevent.
 *
 * Facts are opt-in booleans: an adapter that cannot PROVE a fact simply omits
 * it. Omission renders nothing; it never renders a guess.
 *
 * @param {object} facts  subset of FACT_CHIP keys, truthy = fact holds
 * @param {object} [opts]
 * @param {string} [opts.rung='R0']  the rung this item was admitted at
 * @returns {string[]} 0..2 chips, closed enum, priority-ordered
 */
export function deriveChips(facts = {}, { rung = 'R0' } = {}) {
  const chips = [];

  const relaxationChip = RUNG_CHIP[rung];
  if (relaxationChip) chips.push(relaxationChip);

  for (const chip of CHIP_PRIORITY) {
    if (chips.length >= MAX_CHIPS) break;
    const factKey = Object.keys(FACT_CHIP).find((key) => FACT_CHIP[key] === chip);
    if (factKey && facts[factKey]) chips.push(chip);
  }

  return chips.slice(0, MAX_CHIPS);
}

/**
 * Render-ready pairs. Kept in core so every surface (Builder, TV, PDF, Floor
 * Card) sorts and tones chips identically — divergent chip order across
 * surfaces is how "the board says something different from the phone" starts.
 */
export function toneChips(chips = []) {
  return chips
    .filter((chip) => CHIP_TONE[chip])
    .map((chip) => ({ chip, tone: CHIP_TONE[chip] }));
}

/** Every chip in the closed enum has a tone. Used by the totality test. */
export function untonedChips() {
  return CHIPS.filter((chip) => !CHIP_TONE[chip]);
}
