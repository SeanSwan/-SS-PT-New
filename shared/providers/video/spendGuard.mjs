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
 *   VOLUME defaults to a finite number, never unlimited. There is always a cap;
 *          an unset variable yields a real ceiling rather than permission.
 *
 * The result: the zero-cost local path Sean asked for runs today, and nothing can
 * spend a dollar without an explicit decision.
 */

/** Default daily run ceiling. Finite by construction — "unset" must never mean "unlimited". */
export const DEFAULT_MAX_RUNS_DAILY = 50;

/** Default daily spend ceiling. Zero: paid generation requires an explicit decision. */
export const DEFAULT_MAX_SPEND_USD_DAILY = 0;

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

export function readLimits(env = process.env) {
  return Object.freeze({
    maxRunsDaily: numberFrom(env.SWAN_VIDEO_MAX_RUNS_DAILY, DEFAULT_MAX_RUNS_DAILY),
    maxSpendUsdDaily: numberFrom(env.SWAN_VIDEO_MAX_SPEND_USD_DAILY, DEFAULT_MAX_SPEND_USD_DAILY),
  });
}

/** UTC day key. UTC rather than local so a timezone shift cannot silently reset a ledger. */
export function dayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * Decide whether one run may proceed.
 *
 * @param {object} caps    resolved provider capabilities (carries costPerRunUsd)
 * @param {object} usage   {runs, spendUsd} already consumed TODAY
 * @param {object} limits  from readLimits()
 * @returns {{allowed:true, projectedSpendUsd:number, runCost:number}}
 * @throws  {SpendGuardError} with a message naming the variable that raises the ceiling
 */
export function checkRunAllowed(caps, usage = { runs: 0, spendUsd: 0 }, limits = readLimits()) {
  const runs = Number(usage.runs) || 0;
  const spent = Number(usage.spendUsd) || 0;

  if (runs >= limits.maxRunsDaily) {
    throw new SpendGuardError('E_RUN_CAP',
      `Daily run cap reached (${runs}/${limits.maxRunsDaily}). `
      + 'Raise SWAN_VIDEO_MAX_RUNS_DAILY or wait for the UTC day to roll over.');
  }

  // An unknown price is treated as a real cost, not a free one. `null` here means the
  // vendor's rate was never recorded, and guessing zero is how an unpriced provider
  // becomes an unbounded one.
  const runCost = caps.costPerRunUsd === null ? Number.POSITIVE_INFINITY : Number(caps.costPerRunUsd) || 0;

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

/**
 * A tiny day-scoped usage ledger on local disk.
 *
 * Deliberately not a database. The thing being counted is one operator's runs on one
 * machine, and a schema migration to hold two integers would be a worse trade than a
 * JSON file that a human can read and delete.
 *
 * KNOWN LIMIT, stated rather than discovered: two agents on the same machine sharing a
 * ledger file can interleave a read and a write and undercount. For one operator on one
 * workstation that is not a real scenario; if it becomes one, this is the piece that
 * moves server-side, which is where the commitment pointed in the first place.
 */
export function makeFileLedger(path, fs) {
  let degraded = false;
  const read = () => {
    try {
      const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
      degraded = false;
      return (raw && typeof raw === 'object') ? raw : {};
    } catch (err) {
      // A MISSING ledger is simply a fresh day and reads as zero.
      //
      // A CORRUPT one is different, and conflating them was the defect: truncating this
      // file to "{" resets the day's usage, and anyone with disk access to the worker can
      // do that. Blanket fail-open turned a counter into an unlimited-quota exploit.
      //
      // So corruption is recorded and the ceiling degrades ASYMMETRICALLY: the free local
      // path keeps running (a bookkeeping problem must not become an outage) while
      // anything that spends money is refused until the ledger is readable again.
      degraded = err && err.code !== 'ENOENT' && !/ENOENT/.test(String(err.message));
      return {};
    }
  };

  return {
    usageFor(day) {
      const all = read();
      const rec = all[day] || {};
      return {
        runs: Number(rec.runs) || 0,
        spendUsd: Number(rec.spendUsd) || 0,
        // True only when the file existed and could not be parsed. Consumed by
        // checkRunAllowed to refuse billing providers while leaving free ones alone.
        degraded,
      };
    },
    record(day, { runs = 1, spendUsd = 0 } = {}) {
      // MONOTONIC. A negative delta buys back headroom — an external reviewer probed this
      // and drove a recorded 5 runs / $5 back down to 1 / $1, which would let any caller
      // that can reach the ledger mint unlimited quota. Usage only ever goes up; a refund
      // is not a spend-guard concern, and if it ever becomes one it needs its own audited
      // path rather than a sign flip on the counter.
      const dRuns = Math.max(0, Number(runs) || 0);
      const dSpend = Math.max(0, Number(spendUsd) || 0);
      const all = read();
      const rec = all[day] || { runs: 0, spendUsd: 0 };
      const next = { runs: (Number(rec.runs) || 0) + dRuns, spendUsd: (Number(rec.spendUsd) || 0) + dSpend };
      // Keep only the last 30 days. An append-forever ledger is a slow leak, and older
      // rows answer no question this guard asks.
      const trimmed = Object.fromEntries(
        Object.entries({ ...all, [day]: next }).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 30),
      );
      fs.writeFileSync(path, JSON.stringify(trimmed, null, 2));
      return next;
    },
  };
}

export { SpendGuardError };
