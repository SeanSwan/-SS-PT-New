/**
 * ============================================================================
 * FILE: workIntervalProgression.mjs — R-H20 (slice E).
 *
 * PURPOSE
 *   The single place that turns a Sprint week's requested work-duration modifier into an
 *   ACTUAL prescribed work interval, with the provenance contract §6 line 266 requires.
 *
 * WHAT WAS MISSING BEFORE THIS
 *   `resolveWeekModifier` (sprintProgression.mjs) resolved a per-week modifier, but its only
 *   consumer was an `explanations` log entry — no prescribed number ever changed. This module
 *   computes the number; `generateBootcampClass` applies and persists it.
 *
 * THE POLICY (contract §6 lines 260-266, implemented literally)
 *   - proposed main work interval = max(1, round(baseWorkSec * requestedModifier));
 *   - a conservative 60-SECOND CEILING for automatically progressed ordinary work;
 *   - a manually saved longer interval is PRESERVED and receives no automated increase —
 *     but a factor < 1 still reduces it;
 *   - a cap or rounding hold is explicitly `applied:false`, never a claimed increase;
 *   - paced protocols (EMOM/Tabata/AMRAP/pyramid-class timing) keep their exact protocol:
 *     `mode:'manual_protocol', applied:false`, for trainer review.
 *
 * CONTRACT STEP 3 — the budget comparison (line 264), and a CORRECTED PREMISE
 *   `fitWorkIntervalToBudget` below implements the arithmetic. An earlier version of this
 *   header said the shortfall was "a scope choice, not a technical blocker, since the backend
 *   already imports that module". **That was wrong.** The backend imports the
 *   `shared/bootcamp-core` ROOT (`relaxation`, `taxonomy`, `chips`, `dayTypes`) but **never
 *   `timeline.mjs`** — a repo-wide grep finds it imported only by a TEST. Nothing server-side
 *   builds a ClassPlan: the compiler is the FRONTEND Runner's. So "use the shared ClassPlan
 *   compiler" cannot be done inside `generateBootcampClass` without inventing a plan, and
 *   inventing one would measure a timeline the class never runs.
 *
 *   What IS wired instead: the budget check uses the generator's OWN model of non-work time —
 *   the same `transitionSec + stationTransitionSec` arithmetic that
 *   `resolveBootcampStructure`'s custom branch has always used for exactly this purpose. The
 *   WORK side is exact: `workIntervalProgression.test.mjs` proves against `expandSegments`
 *   that compiled work is `rounds x stations x exercisesPerStation x workSec`. **Disclosed
 *   deviation:** the actual rest/transition timing is compiled by the Runner, so this is a
 *   conservative server-side approximation, not the compiler's own numbers. The
 *   template-manifest half of line 266 WAS implemented (see below).
 *
 * NOT IMPLEMENTED (the remaining gap)
 *   The `progression` record is persisted on the Sprint slot (`sprintSlotWrite.mjs:47`
 *   stores `generatedClassData` verbatim) AND on a saved template
 *   (`bootcampTemplateRows.mjs` spreads it into `metadata` conditionally). What remains of
 *   §6 is the `manual_protocol` trainer-review surface and `progressionPolicyV1` defaults.
 *
 * BUDGET VOCABULARY (F2)
 *   `budgetStatus` and `budgetNotCheckedReason` (in `workIntervalBudget.mjs`) are on EVERY
 *   record, so "the budget was verified" is never inferred from an absent field. The consumer
 *   is the Preflight gate (`BootcampClassRail.logic.ts`): BLOCK on `certifiable === false`,
 *   WARN on `not_checked` for an applied increase. Reachability is MEASURED in
 *   `workIntervalBudget.test.mjs` — the failure is a guard today, `not_checked` is live.
 *
 * KNOWN UNREACHABLE BRANCH (recorded, not hidden)
 *   `manual_override_preserved` keys off `baseWorkSec > 60`, and every reachable base today
 *   is <= 60 (`FORMAT_CONFIG` max `durationSec` 60 for `emom`; custom clamps to
 *   `Math.min(60, ...)`, `bootcampGenerator.mjs:459`) and no caller passes a saved interval.
 * ============================================================================
 */

import { BUDGET_NOT_CHECKED, BUDGET_STATUS, fitWorkIntervalToBudget } from './workIntervalBudget.mjs';
import { PROGRESSION_POLICY_VERSION } from './sprintProgression.mjs';

// Re-exported so callers and tests keep finding the budget vocabulary HERE, where the record
// is built — the extraction was for the rule-4 cap, not a surface change.
export { BUDGET_NOT_CHECKED, BUDGET_STATUS, fitWorkIntervalToBudget };

/** Conservative ceiling for AUTOMATICALLY progressed ordinary work intervals. */
export const WORK_INTERVAL_CEILING_SEC = 60;

export const WORK_INTERVAL_MODE = 'scheduled_work_duration';
export const MANUAL_PROTOCOL_MODE = 'manual_protocol';

/**
 * Formats whose timing/load semantics are not ordinary work intervals.
 *
 * This IS a name list — an earlier version of this comment claimed detection was
 * "structural rather than a hardcoded name list", which was false: `emom` has
 * neither `restSec` nor `blockMin`, so the name branch is the ONLY thing catching
 * it. The structural markers below are an ADDITION that covers tabata (`restSec`)
 * and amrap (`blockMin`), not a replacement for the list.
 */
export const PACED_FORMATS = Object.freeze(['emom', 'tabata', 'amrap']);

/**
 * Class STYLES whose semantics are not an ordinary work interval.
 *
 * `pyramid` is named explicitly by contract §6 line 270. It is not a cue: it
 * rewrites LOAD structure — `pyramidStartWeight` heavy/medium/light with
 * `pyramidDrops` per group (classStyleModifiers.mjs:133-160) — so stretching its
 * work interval changes what the protocol means. The other styles in `STYLE_CUES`
 * (ladder, chipper, death_by, …) only attach explanation text
 * (classStyleModifiers.mjs:192-251) and are deliberately NOT listed here.
 */
export const PACED_CLASS_STYLES = Object.freeze(['pyramid']);

export function isPacedProtocol(format, classFormat, classStyle) {
  if (classFormat && PACED_FORMATS.includes(classFormat)) return true;
  if (classStyle && PACED_CLASS_STYLES.includes(classStyle)) return true;
  if (!format) return false;
  // Structural markers of a protocol whose timing is not an ordinary interval.
  if (format.restSec != null) return true;
  if (format.blockMin != null) return true;
  return false;
}

const isPositiveFinite = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Decide the applied work interval for one class.
 *
 * Returns the full provenance record; `applied` is true only when a prescribed
 * number actually changed. `mode` distinguishes an ordinary interval decision from
 * a paced protocol this policy refuses to touch.
 */
export function resolveWorkInterval({
  baseWorkSec,
  requestedModifier,
  format,
  classFormat,
  classStyle,
  totalWorkSlots,
  // §6 line 264 budget inputs. Omitted by callers that cannot supply them, in which case
  // the ceiling alone bounds the interval and NO budget claim is made.
  otherBlockSec,
  budgetSec,
  source = 'unspecified',
}) {
  const record = {
    policyVersion: PROGRESSION_POLICY_VERSION,
    mode: WORK_INTERVAL_MODE,
    source,
    requestedModifier,
    baseWorkSec,
    appliedWorkSec: baseWorkSec,
    baseWorkTotalSec: null,
    appliedWorkTotalSec: null,
    applied: false,
    reason: null,
    // §6 line 264 — the budget disposition is stated on EVERY record (F2): `budgetStatus`
    // plus `budgetNotCheckedReason` when it is 'not_checked'. `certifiable` keeps its narrow
    // meaning — `false` ONLY when the budget cannot fit even the baseline interval, the one
    // value a Preflight may BLOCK on. 'not_checked' is a review warning, not a failure.
    budgetStatus: BUDGET_STATUS.NOT_CHECKED,
    budgetNotCheckedReason: null,
    certifiable: undefined,
  };

  const withTotals = (appliedWorkSec) => {
    if (!isPositiveFinite(totalWorkSlots)) return;
    record.baseWorkTotalSec = Math.round(baseWorkSec * totalWorkSlots);
    record.appliedWorkTotalSec = Math.round(appliedWorkSec * totalWorkSlots);
  };

  if (isPacedProtocol(format, classFormat, classStyle)) {
    record.mode = MANUAL_PROTOCOL_MODE;
    record.reason = 'unsupported_protocol';
    record.budgetNotCheckedReason = BUDGET_NOT_CHECKED.PACED_PROTOCOL;
    withTotals(baseWorkSec);
    return record;
  }

  if (!isPositiveFinite(requestedModifier)) {
    record.reason = 'invalid_modifier';
    record.budgetNotCheckedReason = BUDGET_NOT_CHECKED.INVALID_MODIFIER;
    withTotals(baseWorkSec);
    return record;
  }

  if (!isPositiveFinite(baseWorkSec)) {
    // No reducible supported field exists — same holding shape the deload policy
    // uses rather than stamping a change onto unchanged data.
    record.reason = 'unsupported_prescription';
    record.budgetNotCheckedReason = BUDGET_NOT_CHECKED.NO_REDUCIBLE_INTERVAL;
    withTotals(baseWorkSec);
    return record;
  }

  if (requestedModifier === 1) {
    record.reason = 'no_change';
    record.budgetNotCheckedReason = BUDGET_NOT_CHECKED.NO_INTERVAL_CHANGE;
    withTotals(baseWorkSec);
    return record;
  }

  let appliedWorkSec = Math.max(1, Math.round(baseWorkSec * requestedModifier));
  const isIncrease = requestedModifier > 1;

  if (isIncrease) {
    // A manually saved interval longer than the ceiling is an explicit override:
    // preserve it and refuse automated increases. Reductions below still apply.
    if (baseWorkSec > WORK_INTERVAL_CEILING_SEC) {
      record.reason = 'manual_override_preserved';
      record.budgetNotCheckedReason = BUDGET_NOT_CHECKED.NO_INTERVAL_CHANGE;
      withTotals(baseWorkSec);
      return record;
    }
    if (appliedWorkSec > WORK_INTERVAL_CEILING_SEC) {
      // The ceiling held the increase. `appliedWorkSec` stays at the BASELINE
      // because nothing was applied — reporting the clipped number there would make
      // the record contradict its own `applied:false`, and callers read
      // `appliedWorkSec` as "what the class actually prescribes". The clipped
      // proposal is preserved separately so the information is not lost.
      record.proposedWorkSec = WORK_INTERVAL_CEILING_SEC;
      record.reason = 'work_interval_ceiling';
      record.budgetNotCheckedReason = BUDGET_NOT_CHECKED.NO_INTERVAL_CHANGE;
      withTotals(baseWorkSec);
      return record;
    }

    // ── Contract §6 line 264: fit the increase to the requested work-block budget ──
    // "If an increase exceeds the budget, find the largest integer work interval between
    // baseline and proposal whose compiled work block fits. … If even baseline fails,
    // return a Preflight budget failure rather than certify the class."
    //
    // Only INCREASES are budgeted. A factor below 1 shortens the class and can finish
    // early — §6 line 265 — so reducing is never a budget violation.
    const fitted = fitWorkIntervalToBudget({
      baseWorkSec,
      proposedWorkSec: appliedWorkSec,
      totalWorkSlots,
      otherBlockSec,
      budgetSec,
    });
    if (fitted) {
      record.budgetSec = budgetSec;
      record.otherBlockSec = isPositiveFinite(otherBlockSec) ? otherBlockSec : 0;
      record.budgetNotCheckedReason = null;
      if (!fitted.certifiable) {
        // Even the baseline does not fit: report the failure and change nothing, so the
        // caller cannot certify a class that overruns the requested time.
        record.reason = 'budget_failure';
        record.budgetStatus = BUDGET_STATUS.BUDGET_FAILURE;
        record.certifiable = false;
        withTotals(baseWorkSec);
        return record;
      }
      record.certifiable = true;
      if (fitted.workSec !== appliedWorkSec) {
        record.proposedWorkSec = appliedWorkSec;
        record.appliedWorkSec = fitted.workSec;
        record.applied = fitted.workSec !== baseWorkSec;
        record.reason = fitted.reason === BUDGET_STATUS.BUDGET_HOLD ? BUDGET_STATUS.BUDGET_HOLD : fitted.reason;
        record.budgetStatus = fitted.reason === BUDGET_STATUS.BUDGET_HOLD
          ? BUDGET_STATUS.BUDGET_HOLD
          : BUDGET_STATUS.WITHIN_BUDGET;
        withTotals(fitted.workSec);
        return record;
      }
      record.budgetStatus = BUDGET_STATUS.WITHIN_BUDGET;
      appliedWorkSec = fitted.workSec;
    } else {
      // F2: no usable budget input — either the caller supplied no budget, or
      // `totalWorkSlots` is not positive, which is every format whose `exercisesPerStation`
      // is null (full_group / circuit / hybrid, `bootcampConstants.mjs:52-58`). The increase
      // still applies under the ceiling, so the record SAYS the work block was never compared
      // instead of leaving the field absent for a consumer to read as a pass.
      record.budgetNotCheckedReason = BUDGET_NOT_CHECKED.INPUTS_UNAVAILABLE;
    }
  }

  if (appliedWorkSec === baseWorkSec) {
    // The factor rounded back to the baseline; claiming progression would be a lie.
    record.reason = 'rounded_to_baseline';
    // Only claim "not checked" if the budget really was not checked — a proposal that
    // rounded back to the baseline can still have been evaluated above.
    if (record.budgetStatus === BUDGET_STATUS.NOT_CHECKED) {
      record.budgetNotCheckedReason = BUDGET_NOT_CHECKED.NO_INTERVAL_CHANGE;
    }
    withTotals(baseWorkSec);
    return record;
  }

  record.appliedWorkSec = appliedWorkSec;
  record.applied = true;
  record.reason = WORK_INTERVAL_MODE;
  // Reached only by a REDUCTION or by an increase whose budget was evaluated above —
  // the `else` branch stamps INPUTS_UNAVAILABLE in that case.
  if (record.budgetStatus === BUDGET_STATUS.NOT_CHECKED && !record.budgetNotCheckedReason) {
    record.budgetNotCheckedReason = BUDGET_NOT_CHECKED.REDUCTION_CANNOT_OVERRUN;
  }
  withTotals(appliedWorkSec);
  return record;
}

/**
 * A copy of `format` carrying the applied interval.
 *
 * COPY-ON-WRITE IS MANDATORY. `resolveBootcampStructure` returns
 * `format: baseFormat` BY REFERENCE for every non-custom format
 * (bootcampGenerator.mjs:436), and `FORMAT_CONFIG` is not frozen
 * (bootcampConstants.mjs:11-60) — mutating in place would corrupt the module-level
 * config for the whole process, not just this class.
 */
export function applyWorkIntervalToFormat(format, record) {
  if (!record?.applied) return format;
  return { ...format, durationSec: record.appliedWorkSec };
}
