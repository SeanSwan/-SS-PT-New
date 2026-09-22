/**
 * ceilings.mjs — the three ceilings, composed in the order the generate handler needs them.
 *
 * Split out of `generateVideo.mjs` for rule 4, and because the seam is real: the handler
 * does transport, provenance and upload, while this file answers one question — "may this
 * particular job run, and what will it cost" — from three separate judgements that live
 * in two shared modules:
 *
 *   GLOBAL     `spendGuard.checkRunAllowed`   — the operator's daily spend/volume cap
 *   PER-CALLER `ceilingGate.callerRefusal`    — one principal's accumulated day
 *   PER-JOB    `ceilingGate.jobRefusal`       — the caller's own `max_cost_usd`
 *
 * They are composed HERE rather than in either shared module because composing them
 * would make `spendGuard` and `ceilingGate` import each other. Keeping the composition at
 * the handler means the dependency runs one way — handler → both — and neither shared
 * module has to know the other exists.
 *
 * ── ORDER, AND WHY IT IS THE ORDER ──────────────────────────────────────────
 *   1. read the operator's caps      — a malformed cap is a fact about the ENVIRONMENT
 *   2. read today's usage            — from the ledger, or a fresh day
 *   3. the global + per-caller gate  — `checkRunAllowed` with the caller scope
 *   4. the per-job gate              — the caller's ceiling against the authorised charge
 *
 * The operator's ceilings are decided before the caller's, so a misconfigured deployment
 * reports the configuration problem rather than blaming the caller. The per-job gate is
 * last because it needs the cost the guard authorised — it is a check on the OUTCOME of
 * step 3, not a fourth input to it.
 *
 * ── WHAT IS PERMANENT ───────────────────────────────────────────────────────
 * `err.permanent` is set here for the two facts about the REQUEST or the ENVIRONMENT:
 * a malformed cap (a human must fix it) and a per-job ceiling refusal (a retry re-reads
 * the same stored ceiling and the same catalogue price). The accumulated ceilings —
 * global run/spend and per-caller run/spend — are deliberately left retryable, because
 * they expire at the UTC day boundary and tomorrow genuinely succeeds.
 */

import { readLimits, dayKey, checkRunAllowed } from '../../../shared/providers/video/spendGuard.mjs';
import { callerScope, jobRefusal } from '../../../shared/providers/video/ceilingGate.mjs';

/**
 * @param {object} a
 * @param {object} a.job     queue job; `owner` names the caller, `maxCostUsd` their ceiling
 * @param {object} a.caps    resolved provider capabilities
 * @param {object|null} a.ledger  usage ledger, or null to count nothing
 * @param {object} a.env     the INJECTED environment (never `process.env` here)
 * @param {Function} a.now   clock, so the day key is testable
 * @returns {{day: string, usage: object, allowance: object, caller: object|null}}
 * @throws  {Error} with `.code`, and `.permanent` set for the two cases named above
 */
export function assertRunAllowed({ job, caps, ledger, env, now }) {
  let limits;
  try {
    limits = readLimits(env);
  } catch (err) {
    err.permanent = true;   // E_BAD_CAP — a human must fix the environment
    throw err;
  }

  const day = dayKey(now());
  const usage = ledger ? ledger.usageFor(day) : { runs: 0, spendUsd: 0 };

  // Null unless a per-caller cap is configured, so an unconfigured deployment behaves
  // exactly as it did before the per-caller ceiling existed.
  const caller = callerScope(job.owner, usage, env);

  const allowance = checkRunAllowed(caps, usage, limits, caller);

  // THE CALLER'S CEILING, AGAINST THE CHARGE. `max_cost_usd` was validated at submission
  // against the quote's ESTIMATE and stored on the job; this applies the same ceiling to
  // the cost the guard just authorised. A retry reproduces both numbers, so it is
  // permanent — and it can only ever refuse, never widen, like the check it mirrors.
  const overCeiling = jobRefusal({ maxCostUsd: job.maxCostUsd, runCostUsd: allowance.runCost });
  if (overCeiling) {
    const e = new Error(overCeiling.message);
    e.code = overCeiling.code;
    e.permanent = true;
    throw e;
  }

  return { day, usage, allowance, caller };
}
