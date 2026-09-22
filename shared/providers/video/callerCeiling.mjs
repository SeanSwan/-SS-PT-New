/**
 * callerCeiling.mjs — the PER-CALLER ceiling: one principal's day against their own cap.
 *
 * ── WHY THIS IS A SEPARATE FILE FROM `ceilingGate.mjs` ──────────────────────
 * Rule 4 (max 300 lines per code file) — and the seam is real rather than arithmetic.
 * `ceilingGate.mjs` documents itself as two judgements: one about a JOB (the caller's own
 * `max_cost_usd`, applied to the charge) and one about a CALLER (a cap on one principal's
 * accumulated day). Round 13's fix to the caller half pushed the combined file to 347
 * lines, so the caller half moved here. `ceilingGate.mjs` re-exports everything below, so
 * no import path changed — the same bridge `spendGuard.mjs` uses for `usageLedger.mjs`.
 *
 * `microsFromUsd` lives in `ceilingGate.mjs` because the per-job ceiling needs it too; it is
 * imported here rather than duplicated, because two copies of a money conversion is how the
 * two halves of one decision come to disagree — the round-6 defect.
 */

import { microsFromUsd, MICROS_PER_USD } from './ceilingGate.mjs';

export class CeilingError extends Error {
  constructor(code, message) { super(message); this.name = 'CeilingError'; this.code = code; }
}

/** A plain non-negative decimal, or null when unset. Malformed THROWS. */
function optionalCapFrom(raw, variable) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const str = String(raw).trim();
  if (!/^\d+(\.\d+)?$/.test(str)) {
    // Treating a typo as absent would silently restore "no per-caller ceiling", which is
    // the permissive direction. Same rule as `spendGuard.numberFrom`.
    throw new CeilingError('E_BAD_CAP',
      `${variable} must be a plain non-negative decimal number; got "${raw}".`);
  }
  const value = Number(str);
  // A DIGIT-ONLY STRING CAN STILL OVERFLOW. `Number('9'.repeat(400))` is `Infinity`, and it
  // passes the plain-decimal test above — so this is not a hypothetical shape. It matters
  // because of where the value lands: `callerScope` returns null when neither cap is finite,
  // and `callerRefusal` treats a non-finite cap as unconfigured. An overflowing cap would
  // therefore SILENTLY DISABLE the ceiling the operator just configured — precisely the
  // "typo reads as unset" outcome the check above exists to prevent, arriving through the
  // one shape that check does not cover. Refused loudly instead.
  if (!Number.isFinite(value)) {
    throw new CeilingError('E_BAD_CAP',
      `${variable} must be a finite number; got a value that overflows to ${value}.`);
  }
  return value;
}

/**
 * How many of today's runs the per-caller split actually accounts for, or null when the
 * split cannot be trusted to add up.
 *
 * ── WHY THIS EXISTS: "ABSENT FROM THE SPLIT" IS TWO DIFFERENT FACTS ──────────
 * Round 12 read an absent caller as an unknown share and refused. That is right for a day
 * with no split, and it is WRONG for a day whose split is complete — and the difference is
 * decidable, which round 12 missed. `record()` writes an entry for every caller it sees and
 * increments the global counter for every run, so:
 *
 *   sum(callers[*].runs) === runs   the split accounts for the whole day, and a caller
 *                                   absent from it has PROVABLY used nothing.
 *   sum(callers[*].runs)  <  runs   some run belongs to nobody recorded (an unattributed
 *                                   run, or a day that started before per-caller tracking
 *                                   existed), so an absent caller's share is genuinely open.
 *
 * Round 12 collapsed both into the second reading. The effect was not conservative, it was
 * a defect: the SECOND caller of any day was refused for the rest of the day, so the ceiling
 * admitted only callers the ledger had already seen. A refusal that fires on the normal case
 * is not fail-closed, it is broken — the same distinction the caps' own "unset means no cap,
 * not zero" comment draws.
 *
 * `null` when any entry is malformed, so the caller cannot be reconciled and the answer stays
 * "unknown" rather than becoming a sum that happens to look complete.
 */
function attributedRuns(callers) {
  let total = 0;
  // Object.keys is own-enumerable only, so the prototype chain cannot contribute a count.
  for (const key of Object.keys(callers)) {
    const entry = callers[key];
    if (!entry || typeof entry !== 'object' || !Number.isFinite(entry.runs) || entry.runs < 0) {
      return null;
    }
    total += entry.runs;
  }
  return total;
}

/**
 * The PER-CALLER caps, read from the environment. BOTH DEFAULT TO UNSET.
 *
 * Unset means "no per-caller ceiling", and that is deliberate rather than a lapse in
 * fail-closedness. The global caps still apply and are unchanged; a per-caller cap is an
 * ADDITIONAL narrowing an operator opts into. Defaulting it to zero would refuse every
 * caller on every deployment that has not set the variable — which is not fail-closed,
 * it is broken. The fail-closed reading applies to the value once it is configured: a
 * malformed one throws, and a configured cap against an unattributable caller refuses.
 */
export function callerLimits(env = process.env) {
  return Object.freeze({
    maxRunsDaily: optionalCapFrom(env.SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER,
      'SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER'),
    maxSpendUsdDaily: optionalCapFrom(env.SWAN_VIDEO_MAX_SPEND_USD_DAILY_PER_CALLER,
      'SWAN_VIDEO_MAX_SPEND_USD_DAILY_PER_CALLER'),
  });
}

/**
 * The PER-CALLER ceiling. One principal's accumulated day against their cap.
 *
 * @param {object} a
 * @param {string} a.principal   who is asking
 * @param {object} a.usage       from `ledger.usageFor(day)` — `{runs, spendUsd, callers?}`
 * @param {object} a.limits      from `callerLimits()`
 * @param {number} a.runCostUsd  the cost of the run being decided, so the spend cap can be
 *                               PROJECTED rather than merely reported — the same semantics
 *                               `checkRunAllowed` uses for the global ceiling. Omitted
 *                               means 0, which checks the accumulated total alone.
 * @returns {{code: string, message: string}|null}
 */
export function callerRefusal({ principal, usage, limits, runCostUsd = 0 }) {
  const caps = limits || {};
  const runCap = Number.isFinite(caps.maxRunsDaily) ? caps.maxRunsDaily : null;
  const spendCap = Number.isFinite(caps.maxSpendUsdDaily) ? caps.maxSpendUsdDaily : null;
  // No cap configured is the default and the common case: nothing to enforce, and the
  // global ceiling is unaffected. Returning null here is what keeps this non-breaking.
  if (runCap === null && spendCap === null) return null;

  const who = String(principal ?? '').trim();
  if (!who) {
    return {
      code: 'E_CALLER_UNKNOWN',
      message: 'A per-caller ceiling is configured, but this job carries no owner, so its usage '
        + 'cannot be attributed to a caller. Configure the job owner, or unset '
        + 'SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER and SWAN_VIDEO_MAX_SPEND_USD_DAILY_PER_CALLER.',
    };
  }

  const all = usage || {};
  const tracked = all.callers && typeof all.callers === 'object' && !Array.isArray(all.callers);
  const globalRuns = typeof all.runs === 'number' && Number.isFinite(all.runs) ? all.runs : 0;
  const globalSpend = typeof all.spendUsd === 'number' && Number.isFinite(all.spendUsd) ? all.spendUsd : 0;
  const isCount = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

  // `Object.hasOwn`, not a plain lookup. `callers['constructor']` resolves through the
  // prototype chain to the Object constructor, and `callers['__proto__']` to
  // Object.prototype — which IS an object, so it passes a bare `typeof` shape test and gets
  // read as a recorded entry. Round 6 fixed this exact class on the provider catalogue
  // (`VIDEO_PROVIDERS['constructor']`); a caller name deserves the same treatment, and it is
  // caller-supplied on the very path this ceiling protects.
  const hasEntry = Boolean(tracked) && Object.hasOwn(all.callers, who);
  let mine = hasEntry ? all.callers[who] : null;

  if (hasEntry && (!mine || typeof mine !== 'object')) {
    // The split MENTIONS this caller, but the entry is not a record. That is corruption or
    // tampering rather than absence — and reading it as absence would reset the caller to
    // zero and hand back their whole ceiling. Refused unconditionally, for the same reason
    // `usageFor` refuses a count that is not a count.
    return {
      code: 'E_CALLER_USAGE_UNKNOWN',
      message: `The ledger's per-caller entry for ${who} is present but is not a pair of counts, so `
        + 'their usage cannot be compared against a ceiling. Repair or delete the ledger file.',
    };
  }

  if (!hasEntry) {
    // TWO DIFFERENT UNKNOWNS, and round 12 collapsed them. See `attributedRuns`: a split
    // that reconciles against the day's run total makes an absent caller a KNOWN zero; one
    // that does not leaves their share genuinely open. Only the second is a refusal.
    const attributed = tracked ? attributedRuns(all.callers) : null;
    const reconciled = tracked && attributed !== null && attributed === globalRuns;
    if (!reconciled && (globalRuns > 0 || globalSpend > 0)) {
      return {
        code: 'E_CALLER_USAGE_UNKNOWN',
        message: tracked
          ? `Today's ledger records ${globalRuns} run(s) but the per-caller split is incomplete `
            + `(${attributed === null ? 'an unreadable number of them' : `${attributed} of them`} `
            + `attributed), so ${who}'s share cannot be ruled out. An unattributable share is not a `
            + 'zero one. Wait for the UTC day to roll over, or clear the ledger.'
          : `Today's ledger records usage but no per-caller split, so ${who}'s share is unknown. `
            + 'A per-caller ceiling is configured, and an unattributable share is not a zero one. '
            + 'Wait for the UTC day to roll over, or clear the ledger.',
      };
    }
    // Either a fresh day, or a split that accounts for every run of it: this caller's share
    // really is zero. NOT a widening — the global ceiling is untouched, and a caller who has
    // actually run has an entry and is judged on it above.
    mine = { runs: 0, spendUsd: 0 };
  }

  const runs = isCount(mine.runs) ? mine.runs : null;
  const spend = isCount(mine.spendUsd) ? mine.spendUsd : null;
  if (runs === null || spend === null) {
    // Same reasoning as `spendGuard.usageFor`: this code can never write a non-count, so
    // one that is present is evidence the file was not written by this code.
    return {
      code: 'E_CALLER_USAGE_UNKNOWN',
      message: `The ledger's per-caller entry for ${who} is not a pair of counts, so their usage `
        + 'cannot be compared against a ceiling.',
    };
  }

  if (runCap !== null && runs >= runCap) {
    return {
      code: 'E_CALLER_RUN_CAP',
      message: `${who} has reached their daily run ceiling (${runs}/${runCap}). Raise `
        + 'SWAN_VIDEO_MAX_RUNS_DAILY_PER_CALLER or wait for the UTC day to roll over.',
    };
  }

  if (spendCap !== null) {
    // PROJECT, don't report. A ceiling compared against what has already been spent lets
    // the run that crosses it through, and the caller only learns afterwards. The global
    // guard already projects; a per-caller cap that did not would be the weaker of two
    // ceilings on the same money.
    if (!isCount(runCostUsd)) {
      return {
        code: 'E_CALLER_USAGE_UNKNOWN',
        message: `A per-caller spend ceiling is configured but the cost of this run is unreadable, `
          + `so ${who}'s projected spend cannot be compared against it.`,
      };
    }
    // ── IN INTEGER MICRO-DOLLARS, NOT BINARY FLOATS ────────────────────────
    // Round 12 compared `spend + runCostUsd > spendCap` as floats, and `0.1 + 0.2` is
    // 0.30000000000000004 — so a caller landing EXACTLY on their ceiling was refused. The
    // rest of this lane holds Astra's ruling that money is never compared in binary
    // floating point; the per-caller cap was the one place that broke it. Snapping all
    // three to the micro grid makes the comparison exact and the boundary inclusive, which
    // is the same `>` semantics `checkRunAllowed` and `jobRefusal` both use.
    const spentMicros = microsFromUsd(spend);
    const runMicros = microsFromUsd(runCostUsd);
    const capMicros = microsFromUsd(spendCap);
    if (spentMicros === null || runMicros === null || capMicros === null) {
      // Unreachable while the three inputs are validated above, but a null here would make
      // the sum NaN and `NaN > x` is FALSE — i.e. a silent allowance. Refuse instead.
      return {
        code: 'E_CALLER_USAGE_UNKNOWN',
        message: `A per-caller spend ceiling is configured but ${who}'s spend, this run's cost or the `
          + 'ceiling itself could not be expressed in micro-dollars, so no comparison is possible.',
      };
    }
    const projectedMicros = spentMicros + runMicros;
    if (projectedMicros > capMicros) {
      return {
        code: 'E_CALLER_SPEND_CAP',
        message: `${who}'s next run would reach $${(projectedMicros / MICROS_PER_USD).toFixed(4)} `
          + `today, over their $${(capMicros / MICROS_PER_USD).toFixed(4)} per-caller ceiling. Raise `
          + 'SWAN_VIDEO_MAX_SPEND_USD_DAILY_PER_CALLER or wait for the UTC day to roll over.',
      };
    }
  }
  return null;
}

/**
 * Build the caller scope `checkRunAllowed` expects, or null when no per-caller cap is set.
 *
 * Returning null when nothing is configured is what makes the guard's fourth parameter
 * purely additive: an unconfigured deployment passes null and the guard behaves exactly
 * as it did before this module existed.
 */
export function callerScope(principal, usage, env = process.env) {
  const limits = callerLimits(env);
  if (!Number.isFinite(limits.maxRunsDaily) && !Number.isFinite(limits.maxSpendUsdDaily)) return null;
  return { principal, usage, limits };
}
