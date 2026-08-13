/**
 * variantLineage.mjs — how a child variant is derived from a winner.
 *
 * Split out of `variantRun.mjs` at the 300-line cap (rule 4). The seam is real:
 * `variantRun` owns what a record IS and how it reaches disk; this owns how one
 * record BEGETS another. It imports one-directionally, so there is no cycle and
 * no `export ... from` binding trap.
 *
 * The two constructors are a pair because what separates them is INTENT, and
 * intent is exactly what a ledger cannot reconstruct after the fact:
 *   refine(parent, changes) — the wording changed. Throws if nothing changed.
 *   reroll(parent)          — same prompt, new roll of the dice.
 *
 * `reroll` is the PRIMARY variance mechanism, because seeds are dead on this
 * model (probed 2026-08-12: identical prompt + identical seed produced different
 * bytes). With no seed to vary, three options from one brief ARE three re-rolls.
 */

import { buildRecord, isBuilt, RunError } from './variantRun.mjs';

/**
 * Derive a child variant from a winner. THE sanctioned way to build round N+1.
 *
 * Inherits only what identifies the lineage and the setup (brief, provider,
 * model, serializer) and deliberately does NOT inherit per-generation facts —
 * cost, latency, measured dimensions, status, safety events. Those describe an
 * image that has not been made yet, and copying them forward would let a child
 * inherit its parent's evidence.
 */
export function refine(parent, changes = {}) {
  if (!isBuilt(parent)) {
    throw new RunError('E_RUN_INVALID',
      'refine() needs a built parent record with a valid variantId — pass the winner from readRuns(), not raw input.');
  }
  /**
   * A CHILD THAT CHANGES NOTHING MUST BE LOUD, not free.
   *
   * `refine()` inherits promptText, which made "refine with no changes" a silent
   * no-op that produced a differently-identified row describing the same
   * request. That is a real intent — re-rolling for variance is the main move
   * now that seeds are dead — but it deserves its own name so the ledger records
   * WHY a row exists. Hence `reroll()`.
   */
  const substantive = Object.keys(changes).filter((k) => changes[k] !== undefined);
  if (substantive.length === 0) {
    throw new RunError('E_RUN_NO_CHANGE',
      'refine() with no changes is a re-roll, not a refinement. Call reroll(parent) — '
      + 'it is the same one call, and the ledger then records which one you meant.');
  }
  return buildRecord({
    briefId: parent.briefId,
    runId: parent.runId,
    provider: parent.provider,
    model: parent.model,
    brainVersion: parent.brainVersion,
    serializer: parent.serializer,
    // Inherited so a plain re-roll (same prompt, new seed) is one call. Pass
    // `promptText` in `changes` to actually change the wording.
    promptText: parent.promptText,
    ...changes,
    parentVariantId: parent.variantId,
    variantId: undefined,      // always a fresh identity
    createdAt: changes.createdAt,
  });
}

/**
 * Re-roll: same prompt, new roll of the dice. The explicit sibling of refine().
 *
 * This is the PRIMARY variance mechanism now, because seeds are dead on this
 * model (probed 2026-08-12: same prompt + same seed → different bytes). With no
 * seed to vary, generating three options from one brief IS three re-rolls, and
 * the ledger should say so rather than recording three identical-looking
 * refinements with no stated intent.
 */
export function reroll(parent, changes = {}) {
  if (!isBuilt(parent)) {
    throw new RunError('E_RUN_INVALID',
      'reroll() needs a built parent record with a valid variantId.');
  }
  return buildRecord({
    briefId: parent.briefId,
    runId: parent.runId,
    provider: parent.provider,
    model: parent.model,
    brainVersion: parent.brainVersion,
    serializer: parent.serializer,
    promptText: parent.promptText,
    ...changes,
    intent: 'reroll',
    parentVariantId: parent.variantId,
    variantId: undefined,
    createdAt: changes.createdAt,
  });
}
