/**
 * ============================================================================
 * FILE: workIntervalBudget.mjs — R-H20 (contract §6 line 264).
 *
 * Extracted from `workIntervalProgression.mjs` (rule 4 cap). The split is along a real
 * seam: this module answers ONE question — "the largest integer work interval whose
 * compiled work block fits the requested budget" — while that one decides precedence
 * (deload, override, strategy, ceiling).
 *
 * For a station circuit the COMPILED work block is exactly
 * `rounds × stationCount × exercisesPerStation × workSec` (see `expandSegments` in
 * shared/bootcamp-core/timeline.mjs), which `workIntervalProgression.test.mjs` asserts
 * against the real compiler rather than trusting the algebra. Rest and transition
 * segments do not scale with the work interval, so they enter as a constant
 * `otherBlockSec`.
 * ============================================================================
 */

const isPositiveFinite = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Every value `record.budgetStatus` can take (§6 line 264). Lives here, with the arithmetic
 * that produces it, so the resolver and its consumers share ONE vocabulary.
 *
 * `NOT_CHECKED` is a first-class outcome, not a gap: for a paced protocol, for a class whose
 * interval does not change, or for a format whose work-slot count the generator cannot compute
 * (full_group / circuit / hybrid carry `exercisesPerStation: null`), the requested work block
 * was never compared against the proposal. Reporting that honestly is what lets a Preflight
 * warn instead of silently passing. External review round 97, finding F2.
 */
export const BUDGET_STATUS = Object.freeze({
  WITHIN_BUDGET: 'within_budget',
  BUDGET_HOLD: 'budget_hold',
  BUDGET_FAILURE: 'budget_failure',
  NOT_CHECKED: 'not_checked',
});

/** Why a record carries `budgetStatus: 'not_checked'`. */
export const BUDGET_NOT_CHECKED = Object.freeze({
  PACED_PROTOCOL: 'paced_protocol',
  INVALID_MODIFIER: 'invalid_modifier',
  NO_REDUCIBLE_INTERVAL: 'no_reducible_interval',
  NO_INTERVAL_CHANGE: 'no_interval_change',
  REDUCTION_CANNOT_OVERRUN: 'reduction_cannot_overrun',
  INPUTS_UNAVAILABLE: 'budget_inputs_unavailable',
});

/**
 * Contract §6 line 264:
 *
 *   "If an increase exceeds the budget, find the largest integer work interval between
 *    baseline and proposal whose compiled work block fits. Never shorten rest, remove
 *    required exercises or exceed the requested time to force progression. If even
 *    baseline fails, return a Preflight budget failure rather than certify the class."
 *
 * Returns `null` when the caller supplied no usable budget, so the caller keeps its
 * ceiling behaviour instead of silently treating "unknown budget" as "unlimited".
 *
 * NOTE ON ITS OWN RETURN SHAPE (external review, round 99, LOW-3): this helper's returns carry
 * `reason`/`certifiable` and NOT `budgetStatus` — the status vocabulary belongs to the RECORD
 * `resolveWorkInterval` builds, which is what a consumer reads. A caller holding one of these
 * objects must not read an absent `budgetStatus` as a pass; treat this as an internal
 * arithmetic helper, not as the public provenance shape.
 */
export function fitWorkIntervalToBudget({
  baseWorkSec,
  proposedWorkSec,
  totalWorkSlots,
  otherBlockSec = 0,
  budgetSec,
}) {
  if (!isPositiveFinite(budgetSec) || !isPositiveFinite(totalWorkSlots)) return null;
  if (!isPositiveFinite(baseWorkSec) || !isPositiveFinite(proposedWorkSec)) return null;

  const nonWorkSec = isPositiveFinite(otherBlockSec) ? otherBlockSec : 0;
  const largestThatFits = Math.floor((budgetSec - nonWorkSec) / totalWorkSlots);

  // "If even baseline fails, return a Preflight budget failure rather than certify."
  if (largestThatFits < baseWorkSec) {
    return { workSec: baseWorkSec, applied: false, reason: 'budget_failure', certifiable: false };
  }
  // The whole proposal fits — nothing to hold.
  if (largestThatFits >= proposedWorkSec) {
    return {
      workSec: proposedWorkSec,
      applied: proposedWorkSec !== baseWorkSec,
      reason: 'within_budget',
      certifiable: true,
    };
  }
  // Partial increase: the largest integer interval that fits. `applied` is true only
  // when that is still an actual change from the baseline.
  return {
    workSec: largestThatFits,
    applied: largestThatFits !== baseWorkSec,
    reason: 'budget_hold',
    certifiable: true,
  };
}

export default fitWorkIntervalToBudget;
