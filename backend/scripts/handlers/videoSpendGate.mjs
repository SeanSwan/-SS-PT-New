/**
 * videoSpendGate.mjs — the video lane's ceilings, checked before submission.
 *
 * Split out of generateVideo.mjs when that file hit its 300-line cap, and worth its own
 * module regardless: it now carries policy, not just arithmetic. The rule it encodes is
 * that a BILLED provider without a ledger is refused outright — a control that can be
 * omitted by accident is not a control, and "ledger defaults to null" is exactly how the
 * video ceiling came to be compared against zero on every job for months.
 */

import { readLimits, checkRunAllowed, dayKey } from '../../../shared/providers/video/spendGuard.mjs';

/** Spend + volume ceilings. E_BAD_CAP is permanent (fix the environment); a cap breach
 * is a fact about the DAY and stays retryable — tomorrow genuinely succeeds. */
/** `markPermanence` is INJECTED rather than re-derived here: it consults the handler's
 *  PERMANENT_CODES set, and a second copy of that judgement would drift. Errors thrown by
 *  `checkRunAllowed` deliberately propagate unmarked, exactly as before this split — a cap
 *  breach is a fact about the DAY and stays retryable. */
export function spendGate({ caps, env, ledger, now, markPermanence = (e) => e }) {
  let limits;
  try { limits = readLimits(env); } catch (err) { throw markPermanence(err); }
  const day = dayKey(now());
  const usage = ledger ? ledger.usageFor(day) : { runs: 0, spendUsd: 0 };
  const allowance = checkRunAllowed(caps, usage, limits);
  // FAIL CLOSED ON MONEY. `ledger` has always defaulted to null — "count nothing" — and
  // for a long time NOTHING passed one, so the daily ceiling was compared against zero on
  // every job. Wiring the one known caller does not fix the shape: the next caller (a CLI,
  // a second agent, a refactored handler) inherits an uncapped lane silently, which is how
  // this defect happened the first time. A control that can be omitted by accident is not
  // a control. A FREE provider still runs without one — there is no money to count.
  if (!ledger && allowance.runCost > 0) {
    throw markPermanence(Object.assign(
      new Error(`Refusing to run billed provider "${caps.provider}" without a spend ledger: `
        + 'its cost could not be counted against the daily ceiling. Pass `ledger` (see laneLedger.mjs).'),
      { code: 'E_LEDGER_REQUIRED', permanent: true },
    ));
  }
  return { day, allowance, usage, limits };
}
