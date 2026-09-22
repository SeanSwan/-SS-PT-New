/**
 * spendGuard.mjs — volume and spend ceilings, enforced BEFORE submission.
 *
 * ── THE COMMITMENT THIS SATISFIES, AND HOW IT DIFFERS ───────────────────────
 * The 2026-08-16 licensing request promised "server-side caps enforced before
 * submission, fail-closed (an unconfigured cap denies rather than permits)."
 *
 * What is built here is AGENT-SIDE, not server-side. Stated plainly because the
 * difference is real: an agent-side cap is enforced by the process doing the work,
 * so whoever runs the agent can raise it. It genuinely stops the thing it was
 * built to stop — runaway loops, a stuck retry, an accidental thousand-render
 * afternoon — and it does not stop a determined operator overriding their own
 * limit. Server-side enforcement in the queue is the stronger form and is still
 * owed; see the audit note in the licensing doc.
 *
 * ── HOW "FAIL-CLOSED" IS READ HERE, AND WHY ─────────────────────────────────
 * Read literally, "an unconfigured cap denies" would block the free local provider
 * over money that is never spent — the same mistake as enforcing the image-first
 * law against a provider that bills nothing. So the two ceilings differ:
 *
 *   SPEND  defaults to $0/day. A provider that bills is DENIED until Sean sets a
 *          real number. That is fail-closed in the strict sense, and it is the
 *          ceiling that protects actual money.
 *   VOLUME defaults to a finite number, never unlimited. An unset variable yields a
 *          real ceiling rather than permission.
 *
 * The one place "there is always a cap" is false, said here rather than left for a reader
 * to discover: while the ledger is UNREADABLE, today's run count is unknown and reads as
 * zero, so the volume ceiling cannot bind. That is the deliberate half of the asymmetric
 * degradation below — a bookkeeping fault must not become an outage for the zero-cost
 * lane — and the money ceiling is what still holds. Round 9's section F asserts this
 * rather than describing it.
 *
 * The result: the zero-cost local path Sean asked for runs today, and nothing can
 * spend a dollar without an explicit decision.
 */

/** Default daily run ceiling. Finite by construction — "unset" must never mean "unlimited". */
export const DEFAULT_MAX_RUNS_DAILY = 50;

/** Default daily spend ceiling. Zero: paid generation requires an explicit decision. */
export const DEFAULT_MAX_SPEND_USD_DAILY = 0;

// The per-caller ceiling is a judgement about a CALLER, so it lives in `ceilingGate.mjs`
// beside the per-job one. The import is one-directional on purpose: `ceilingGate` never
// imports this module, so there is no cycle to reason about.
import { callerRefusal } from './ceilingGate.mjs';

class SpendGuardError extends Error {
  constructor(code, message) { super(message); this.name = 'SpendGuardError'; this.code = code; }
}

function numberFrom(raw, dflt) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return dflt;
  const str = String(raw).trim();
  // Require PLAIN decimal. `Number()` alone accepts "0x32" as 50 and "0b11" as 3, so a
  // config typo silently becomes a ceiling nobody intended — found by an external
  // reviewer probing this exact input.
  if (!/^\d+(\.\d+)?$/.test(str)) {
    throw new SpendGuardError('E_BAD_CAP',
      `Cap must be a plain non-negative decimal number; got "${raw}".`);
  }
  const n = Number(str);
  // A malformed cap is the most dangerous input here: treating "abc" as absent would
  // silently restore the default, and treating it as Infinity would remove the ceiling
  // entirely. Refusing is the only reading that cannot lose money.
  if (!Number.isFinite(n)) {
    throw new SpendGuardError('E_BAD_CAP', `Cap must be a finite number; got "${raw}".`);
  }
  return n;
}

/**
 * A per-run cost as a number, or `Infinity` when it cannot be determined.
 *
 * `Infinity` is the FAIL-CLOSED reading and zero is the dangerous one:
 * `checkRunAllowed` treats a cost of 0 as "free local generation" and waves it past the
 * spend ceiling entirely. The previous expression was
 * `caps.costPerRunUsd === null ? Infinity : Number(caps.costPerRunUsd) || 0`, and
 * `Number(x) || 0` turned an ABSENT field, an empty string and 'not-a-number' all into
 * ZERO — three ways to give a billing provider a free run by malforming its cost.
 *
 * Only a plain non-negative decimal is a cost. `Number()` alone accepts "0x32" as 50,
 * which is the same trap `numberFrom` above already guards against.
 */
function costFrom(raw) {
  const str = typeof raw === 'number' ? String(raw) : String(raw ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(str)) return Number.POSITIVE_INFINITY;
  return Number(str);
}

export function readLimits(env = process.env) {
  return Object.freeze({
    maxRunsDaily: numberFrom(env.SWAN_VIDEO_MAX_RUNS_DAILY, DEFAULT_MAX_RUNS_DAILY),
    maxSpendUsdDaily: numberFrom(env.SWAN_VIDEO_MAX_SPEND_USD_DAILY, DEFAULT_MAX_SPEND_USD_DAILY),
  });
}

/**
 * Decide whether one run may proceed.
 *
 * @param {object} caps    resolved provider capabilities (carries costPerRunUsd)
 * @param {object} usage   {runs, spendUsd} already consumed TODAY
 * @param {object} limits  from readLimits()
 * @param {object|null} caller  OPTIONAL per-caller scope, from `ceilingGate.callerScope()`.
 *                        Null (the default) means no per-caller ceiling is configured and
 *                        this function behaves exactly as it did before the parameter
 *                        existed — which is what keeps every existing call site valid.
 * @returns {{allowed:true, projectedSpendUsd:number, runCost:number}}
 * @throws  {SpendGuardError} with a message naming the variable that raises the ceiling
 */
export function checkRunAllowed(caps, usage = { runs: 0, spendUsd: 0 }, limits = readLimits(), caller = null) {
  const runs = Number(usage.runs) || 0;
  const spent = Number(usage.spendUsd) || 0;

  if (runs >= limits.maxRunsDaily) {
    throw new SpendGuardError('E_RUN_CAP',
      `Daily run cap reached (${runs}/${limits.maxRunsDaily}). `
      + 'Raise SWAN_VIDEO_MAX_RUNS_DAILY or wait for the UTC day to roll over.');
  }

  // An unknown price is treated as a real cost, not a free one. `null` here means the
  // vendor's rate was never recorded, and guessing zero is how an unpriced provider
  // becomes an unbounded one. Absent and unparseable join `null` in that reading.
  const runCost = costFrom(caps.costPerRunUsd);

  // THE PER-CALLER CEILING. Placed here — after the operator's global run cap, before the
  // free-path early return below — for one reason: a per-caller RUN cap must bind on the
  // zero-cost lane as well, exactly as the global run cap does. Putting it after the
  // `runCost === 0` return would have exempted the free lane from a ceiling the operator
  // explicitly configured.
  //
  // `runCost` is passed as 0 when it is not finite. That under-projects the caller's
  // spend by at most this run's own cost, and it cannot admit anything: a non-finite
  // runCost is refused further down by E_UNKNOWN_COST (or E_SPEND_DISABLED), so this
  // path never reaches an admission with an unknown cost.
  if (caller) {
    const refusal = callerRefusal({
      ...caller,
      runCostUsd: Number.isFinite(runCost) ? runCost : 0,
    });
    if (refusal) throw new SpendGuardError(refusal.code, refusal.message);
  }

  if (runCost === 0) {
    // Free local generation. The volume ceiling above still applies; there is no spend
    // to check, and refusing here would block the zero-cost path this lane exists for.
    return { allowed: true, projectedSpendUsd: spent, runCost: 0 };
  }

  // An unreadable ledger means the spend total is unknown, and an unknown total cannot be
  // compared against a ceiling. Free generation continues; billing stops until it is fixed.
  if (usage.degraded) {
    throw new SpendGuardError('E_LEDGER_DEGRADED',
      `The usage ledger could not be read, so today's spend is unknown and "${caps.provider}" `
      + 'cannot be billed safely. Free local generation is unaffected. Repair or delete the '
      + 'ledger file to resume paid runs.');
  }

  if (limits.maxSpendUsdDaily === 0) {
    throw new SpendGuardError('E_SPEND_DISABLED',
      `"${caps.provider}" bills per run and no spend ceiling is configured, so paid generation is off. `
      + 'Set SWAN_VIDEO_MAX_SPEND_USD_DAILY to a real number to enable it.');
  }

  if (!Number.isFinite(runCost)) {
    throw new SpendGuardError('E_UNKNOWN_COST',
      `"${caps.provider}" has no recorded per-run price, so its spend cannot be bounded. `
      + 'Record costPerRunUsd in the catalogue before enabling it.');
  }

  const projected = spent + runCost;
  if (projected > limits.maxSpendUsdDaily) {
    throw new SpendGuardError('E_SPEND_CAP',
      `This run would reach $${projected.toFixed(2)} today, over the $${limits.maxSpendUsdDaily.toFixed(2)} ceiling. `
      + 'Raise SWAN_VIDEO_MAX_SPEND_USD_DAILY or wait for the UTC day to roll over.');
  }

  return { allowed: true, projectedSpendUsd: projected, runCost };
}

// ── RE-EXPORTS, SO NO IMPORT PATH CHANGES ───────────────────────────────────
// The ledger moved to `usageLedger.mjs` for rule 4. Every existing
// `import { makeFileLedger, dayKey } from '.../spendGuard.mjs'` keeps working, which is
// the same bridge `catalogue.mjs` uses for `assertSpecShape` and `specShape.mjs`.
export { makeFileLedger, dayKey } from './usageLedger.mjs';

export { SpendGuardError };
