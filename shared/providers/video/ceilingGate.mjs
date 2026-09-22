/**
 * ceilingGate.mjs — the PER-JOB ceiling: the caller's `max_cost_usd` against the CHARGE.
 *
 * ── WHY THIS IS A SEPARATE DECISION ─────────────────────────────────────────
 * `spendGuard.mjs` answers "may this process spend at all today". That is the GLOBAL
 * ceiling and it is one question. Astra's requirement was three: "enforce per-job,
 * per-caller and global ceilings". Two of them were missing, and they are missing for
 * different reasons — so they are judgements about a JOB and about a CALLER, kept beside
 * `licenceGate.mjs` rather than folded into the guard that answers the third.
 *
 *   GLOBAL     spendGuard.checkRunAllowed — the operator's daily cap.  Already built.
 *   PER-JOB    jobRefusal()               — the caller's own `max_cost_usd`, applied to
 *                                           the CHARGE rather than to the forecast.
 *   PER-CALLER callerRefusal()            — a cap on one principal's accumulated day.
 *                                           Now in `callerCeiling.mjs` (rule 4); the names
 *                                           are re-exported at the bottom of this file, so
 *                                           every existing import path is unchanged.
 *
 * ── THE PER-JOB GAP THIS CLOSES ─────────────────────────────────────────────
 * `routes.createJob` validates `max_cost_usd` against the quote's ESTIMATE and stores it
 * on the job as `maxCostUsd`. `runGenerate` never read that field, so the ceiling was a
 * submission-time assertion about a FORECAST and nothing more. Two consequences, both
 * real: the field could be edited or lost between quote and run with no effect, and the
 * ledger recorded a charge that no ceiling had ever been compared against.
 *
 * A quote is valid for five minutes and the charge happens after. The forecast and the
 * charge are computed from the same catalogue row today, so they agree — but "they agree
 * today" is a fact about the data, not an enforcement. This makes it an enforcement.
 *
 * ── FAIL-CLOSED, AND THE ONE PLACE IT DELIBERATELY IS NOT ────────────────────
 * An UNREADABLE ceiling is not an absent one: if a charge is non-zero and the ceiling
 * cannot be parsed, the run is refused. That is the fail-closed direction.
 *
 * The deliberate exception is a charge of exactly ZERO. A malformed `max_cost_usd` can only
 * reach the runner on a route the quote priced at zero, because `routes.createJob`
 * refuses a malformed one on any priced route. Nothing is spent on a zero charge, so
 * `0 <= anything` holds for every ceiling including an unreadable one, and refusing
 * there would fail a request over money that does not exist — the same over-restriction
 * that blocked the free local lane in round 11. So: refuse when money is at stake,
 * pass when it provably is not.
 */

/**
 * Micro-dollars per dollar. The authoritative scale, matching `costEstimate.mjs`.
 * Exported because `callerCeiling.mjs` needs the same scale, and two copies of a money
 * conversion is how the two halves of one decision come to disagree (the round-6 defect).
 */
export const MICROS_PER_USD = 1_000_000;


/**
 * USD to integer micro-dollars, or null when the value is not a usable number.
 *
 * `null` rather than 0 for anything unreadable. Zero is a real amount of money and
 * "I could not read this" is not — conflating them is the defect class this whole lane
 * keeps rediscovering (`Number(x) || 0`, `null * n === 0`).
 */
export function microsFromUsd(usd) {
  if (typeof usd !== 'number' || !Number.isFinite(usd)) return null;
  // Snap to the micro grid before scaling, the same way `routes.createJob` does:
  // `0.29 * 1e6` is 289999.99999999994 in binary floating point.
  return Math.round(Number(usd.toFixed(6)) * MICROS_PER_USD);
}

/**
 * THE PER-JOB CEILING. The caller's `max_cost_usd` against the charge about to be made.
 *
 * @param {object} a
 * @param {number|null|undefined} a.maxCostUsd  the ceiling stored on the job
 * @param {number} a.runCostUsd                 the cost the guard authorised
 * @returns {{code: string, message: string}|null}
 */
export function jobRefusal({ maxCostUsd, runCostUsd }) {
  // ABSENT IS NOT UNREADABLE. `max_cost_usd` is optional on a zero-priced route — the
  // free local lane submits without one, and demanding one there would block the path
  // this gateway exists for. So absent means "the caller declared no ceiling".
  if (maxCostUsd === undefined || maxCostUsd === null) return null;

  const charge = microsFromUsd(runCostUsd);
  // A ZERO CHARGE IS THE ONE CASE WHERE AN UNREADABLE CEILING CANNOT LOSE MONEY.
  // See the header: a malformed ceiling reaches the runner only via a zero-priced
  // route, so this is where it lands, and refusing here would fail a free request.
  if (charge === 0) return null;

  const ceiling = microsFromUsd(maxCostUsd);
  if (ceiling === null || ceiling <= 0) {
    return {
      code: 'E_BAD_MAX_COST',
      message: `This job carries max_cost_usd=${JSON.stringify(maxCostUsd)}, which is not a positive `
        + 'number of US dollars, and the run would cost money. A ceiling that cannot be read is not '
        + 'an absent ceiling, so the run is refused rather than executed unbounded. Resubmit the job '
        + 'with a numeric max_cost_usd.',
    };
  }

  if (charge === null) {
    // The charge itself is unreadable. `checkRunAllowed` cannot currently return that —
    // it refuses an unknown cost with E_UNKNOWN_COST before returning — so this is a
    // guard for the contract rather than a path in production. Stated as such rather
    // than presented as a live defect.
    return {
      code: 'E_JOB_COST_UNKNOWN',
      message: 'The cost of this run could not be determined, so it cannot be compared against the '
        + "caller's ceiling. An unknown cost is not a cheap one.",
    };
  }

  if (charge > ceiling) {
    return {
      code: 'E_JOB_COST_EXCEEDED',
      message: `This run costs $${(charge / MICROS_PER_USD).toFixed(4)}, over the caller's `
        + `max_cost_usd ceiling of $${(ceiling / MICROS_PER_USD).toFixed(4)}. The ceiling was `
        + 'accepted at submission against the quote\'s estimate; this is the same ceiling applied '
        + 'to the charge, and the charge wins.',
    };
  }

  return null;
}

// ── THE PER-CALLER HALF, RE-EXPORTED ────────────────────────────────────────
// Split out for rule 4. Every name that used to be importable from this module still is,
// so no call site changed — the same bridge `spendGuard.mjs` uses for `usageLedger.mjs`.
export { callerLimits, callerRefusal, callerScope, CeilingError } from './callerCeiling.mjs';
