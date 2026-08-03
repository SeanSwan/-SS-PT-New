/**
 * ============================================================================
 * FILE: shared/bootcamp-core/relaxation.mjs
 * PURPOSE: The relaxation ladder — the object that makes insufficiency a
 *          FIRST-CLASS, NAMED outcome instead of a silent bypass.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-02 | SLICE: SWA-105 Slice 2
 * ============================================================================
 *
 * THE FINDING THIS ANSWERS (Kimi R3): the original three-layer plan said
 * rejected selections were "deterministically backfilled" but never defined
 * behavior on INSUFFICIENCY — when the pool cannot fill the structure math.
 * Backfill from an exhausted pool is empty; backfill from a non-exhausted pool
 * overrides the ranking with exactly the bypass D1 was. Both failures are
 * silent, and a silent failure at 5:50am is a class the trainer cannot trust.
 *
 * THE RULE: the system never says no, and it never lies about the yes.
 * Each rung relaxes EXACTLY ONE constraint, in a fixed order, and every
 * admitted item carries the rung it needed. A relaxed item is therefore
 * un-renderable without naming the rule that was bent (validate.mjs enforces
 * the chip pairing) — the trainer chooses which rule to break, knowingly.
 *
 *   R0 hard floor (nothing relaxed)
 *   R1 anti-repeat across weeks
 *   R2 novelty
 *   R3 pattern fidelity
 *   R4 not-used-in-THIS-class
 *   R5 equipment -> bodyweight regression
 *   R6 structure (no exercise exists; offer structural outs instead)
 *
 * WHY THE ORDER: it is ranked by what a trainer would sacrifice last. Repeating
 * a movement the group saw three weeks ago costs less than putting a squat on
 * upper day (R1 before R3); showing the same word twice on the board costs less
 * than sending 14 people to a rack that holds 2 (R4 before R5).
 *
 * R5 IS A GUARANTEE, NOT A SEARCH. The caller pins an always-legal bodyweight
 * set — zero equipment, low impact. R5 therefore cannot return empty, so R6 is
 * reachable only when the caller supplies no always-legal set (or every member
 * fails the HARD floor, which is a day-type coverage bug worth surfacing).
 *
 * PORTABILITY: this file knows nothing about exercises, muscles, kettlebells or
 * SwanStudios. Constraints are injected predicates keyed by name. A climbing gym
 * passes its own five predicates and gets the same ladder.
 */

import { RUNGS, RUNG_CONSTRAINT, RUNG_CHIP } from './constants.mjs';

export { RUNGS, RUNG_CONSTRAINT, RUNG_CHIP };

/** Rung -> ordinal, for "how far did we descend" comparisons. */
const RUNG_INDEX = Object.freeze(
  RUNGS.reduce((acc, rung, index) => Object.assign(acc, { [rung]: index }), {}),
);

/** Constraint name -> the rung that relaxes it. Inverse of RUNG_CONSTRAINT. */
const CONSTRAINT_RUNG = Object.freeze(
  Object.entries(RUNG_CONSTRAINT).reduce(
    (acc, [rung, constraint]) => (constraint ? Object.assign(acc, { [constraint]: rung }) : acc),
    {},
  ),
);

export const rungIndex = (rung) => RUNG_INDEX[rung] ?? -1;
export const isRung = (value) => Object.hasOwn(RUNG_INDEX, value);

/** The two structural outs offered at R6 — never an empty state (Opus 5 §A3). */
export const STRUCTURAL_OUTS = Object.freeze([
  Object.freeze({ kind: 'hold_longer', label: 'Hold this station longer (tempo / isometric)' }),
  Object.freeze({ kind: 'drop_station', label: 'Drop this station and redistribute the group' }),
]);

/**
 * The rung an item needs in order to be admitted: the LAST constraint it
 * violates, in ladder order. An item violating both anti-repeat (R1) and
 * pattern fidelity (R3) enters at R3, because you must descend that far.
 *
 * @returns {{rung: string, violated: string[]}}
 */
function entryRung(item, constraints) {
  const violated = [];
  let deepest = 'R0';
  for (const [name, predicate] of Object.entries(constraints)) {
    const rung = CONSTRAINT_RUNG[name];
    if (!rung || typeof predicate !== 'function') continue;
    if (predicate(item) === true) continue;
    violated.push(name);
    if (rungIndex(rung) > rungIndex(deepest)) deepest = rung;
  }
  return { rung: deepest, violated };
}

/**
 * Walk the ladder.
 *
 * The hard floor is never relaxed: an item failing `hardFilter` is out at every
 * rung. That is what keeps R5 from re-opening D1 — a bodyweight substitute
 * still has to be legal for the day.
 *
 * @param {object}   input
 * @param {Array}    input.candidates    ranked best-first; order is preserved within a rung
 * @param {number}   input.need          how many the caller must end up with
 * @param {Function} [input.hardFilter]  (item) => boolean; R0 floor, never relaxed
 * @param {object}   [input.constraints] { anti_repeat|novelty|pattern_fidelity|
 *                                         not_used_this_class|equipment: (item) => boolean }
 *                                       Predicate returns TRUE when SATISFIED.
 *                                       An absent predicate counts as satisfied.
 * @param {Array}    [input.alwaysLegal] R5's guarantee — zero-equipment fallbacks,
 *                                       still subject to `hardFilter`
 * @param {Function} [input.identify]    (item) => key, for de-duping alwaysLegal
 *                                       against candidates. Defaults to identity.
 * @returns {{rung: string, admitted: Array<{item: *, rung: string, violated: string[]}>,
 *            relaxedCounts: Record<string, number>, rejectedByFloor: number,
 *            shortfall: number, exhausted: boolean, structuralOuts: Array}}
 */
export function runLadder({
  candidates = [],
  need = 1,
  hardFilter = null,
  constraints = {},
  alwaysLegal = [],
  identify = (item) => item,
} = {}) {
  const floor = typeof hardFilter === 'function' ? hardFilter : () => true;
  const scored = [];
  const seen = new Set();
  let rejectedByFloor = 0;

  for (const item of candidates) {
    if (!floor(item)) {
      rejectedByFloor += 1;
      continue;
    }
    seen.add(identify(item));
    scored.push({ item, ...entryRung(item, constraints) });
  }

  // R5's pinned set enters LAST and always at R5: it is by definition the
  // equipment relaxation. An always-legal item that already qualified through
  // the normal pool keeps its own (better) rung — hence the de-dupe.
  for (const item of alwaysLegal) {
    const key = identify(item);
    if (seen.has(key)) continue;
    if (!floor(item)) continue;
    seen.add(key);
    scored.push({ item, rung: 'R5', violated: ['equipment'] });
  }

  // Stable sort by rung: strict candidates are always consumed before relaxed
  // ones, so a relaxation only ever appears when it was genuinely required.
  scored.sort((a, b) => rungIndex(a.rung) - rungIndex(b.rung));

  const target = Math.max(0, need);
  let reached = 'R0';
  let count = 0;
  for (const entry of scored) {
    if (count >= target) break;
    count += 1;
    if (rungIndex(entry.rung) > rungIndex(reached)) reached = entry.rung;
  }

  // Admit everything at or above the depth we had to reach. Callers building a
  // POOL want all of them; callers building a 3-row deck take the first three.
  // Both get the same ordering and the same per-item rung.
  const admitted = scored.filter((entry) => rungIndex(entry.rung) <= rungIndex(reached));
  const shortfall = Math.max(0, target - admitted.length);
  const exhausted = shortfall > 0;

  const relaxedCounts = {};
  for (const entry of admitted) {
    if (entry.rung === 'R0') continue;
    relaxedCounts[entry.rung] = (relaxedCounts[entry.rung] ?? 0) + 1;
  }

  return {
    // R6 is "no exercise exists" — it is reported on the RESULT, never stamped
    // on an item, because an R6 item is a contradiction (validate.mjs rejects
    // a committed slot at R6).
    rung: exhausted ? 'R6' : reached,
    admitted,
    relaxedCounts,
    rejectedByFloor,
    shortfall,
    exhausted,
    structuralOuts: exhausted ? STRUCTURAL_OUTS : [],
  };
}

/** Take the top N admitted entries — the SwapDeck's three rows (Opus 5 §S2). */
export function pickTop(result, n) {
  return (result?.admitted ?? []).slice(0, Math.max(0, n));
}

/**
 * Derive the relaxation summary from the FINAL plan rather than storing it.
 *
 * Deliberately NOT a schema field: a stored summary can disagree with the slots
 * it summarizes, and a plan that claims "nothing relaxed" over three relaxed
 * slots is precisely the fabricated justification P4 exists to prevent.
 *
 * @param {Array<{rung?: string}>} slots
 * @returns {{counts: Record<string, number>, deepest: string, relaxedSlots: number,
 *            constraints: string[]}}
 */
export function summarizeRelaxations(slots = []) {
  const counts = {};
  let deepest = 'R0';
  for (const slot of slots) {
    const rung = slot?.rung ?? slot?.selectionRung ?? 'R0';
    if (!isRung(rung) || rung === 'R0') continue;
    counts[rung] = (counts[rung] ?? 0) + 1;
    if (rungIndex(rung) > rungIndex(deepest)) deepest = rung;
  }
  const relaxedSlots = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const constraints = Object.keys(counts)
    .sort((a, b) => rungIndex(a) - rungIndex(b))
    .map((rung) => RUNG_CONSTRAINT[rung])
    .filter(Boolean);
  return { counts, deepest, relaxedSlots, constraints };
}
