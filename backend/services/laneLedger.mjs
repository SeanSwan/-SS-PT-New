/**
 * laneLedger.mjs — the day counter every paid lane is gated on, bound to real disk.
 * ============================================================================
 *
 * WHAT WAS WRONG BEFORE THIS FILE, IN BOTH LANES. `makeFileLedger` has existed
 * and been well tested since the video work: corrupt-vs-missing handled, writes
 * monotonic, thirty days retained. Nothing instantiated it. `runGenerate` takes
 * `ledger = null` and `render-agent.mjs` passed `{ api }`, so the video ceiling
 * was compared against zero forever; the Atelier route returned a literal
 * `{ runs: 0, spendUsd: 0 }` and said so in a docblock. Two lanes, one shared
 * defect: a ceiling only ever compared against zero is a per-request ceiling
 * wearing a day's name. It stops one runaway batch and not fifty separate ones.
 *
 * WHY ONE MODULE FOR BOTH. The cheapest wrong answer was a second ledger for the
 * image lane — two implementations of the same money gate, drifting apart, each
 * with its own corruption semantics. The counter itself is lane-neutral and
 * lives in shared/providers/spendLedger.mjs with its filesystem injected; this
 * file is the part that needs a real disk, and it is written once.
 *
 * SEPARATE FILES PER LANE, THOUGH. The lanes carry separate ceilings on purpose
 * — raising the video budget must not silently raise the image budget, which is
 * why they do not share an env key either. Separate counters follow separate
 * caps.
 *
 * THE FAILURE THAT MATTERS, AND WHICH WAY IT FALLS. Two things go wrong and they
 * are not symmetric:
 *
 *   A CORRUPT READ means today's total is unknown. `makeFileLedger` reports
 *   `degraded`, and the gates already refuse billed models on it while leaving
 *   free local paths alone — a bookkeeping problem must not become an outage on
 *   a lane that spends nothing.
 *
 *   A FAILED WRITE refuses THIS request when it is billed. Because `tryCommit`
 *   records BEFORE the provider is called, nothing has been spent yet at the
 *   moment the write fails — so proceeding would be unbounded spend with no
 *   counter. (The first draft reasoned "throwing would fail a request that
 *   already succeeded". That is true where the record happens AFTER generation,
 *   as in the video handler, and false here. A reviewer caught it.) A FREE
 *   request still proceeds: a bookkeeping problem must not take down a lane that
 *   costs nothing. Later requests are refused only after
 *   WRITE_FAILURES_BEFORE_DEGRADED consecutive failures — one antivirus scanner
 *   holding the file for 200ms is a hiccup, not a broken disk, and degrading on
 *   the first one is a self-inflicted outage on the revenue path.
 *
 * ── TWO DEPLOYMENT INVARIANTS, AND WHAT ACTUALLY ENFORCES THEM ─────────────
 * These are the conditions under which the numbers here mean what they say. The
 * header used to call them "asserted rather than assumed" while NOTHING asserted
 * either one — a reviewer read the claim, looked for the assertion, and filed the
 * gap. They are DOCUMENTED, and the second one now warns at construction when the
 * ledger lands on a path that a deploy can wipe. The first is not checkable from
 * inside a process that cannot see its siblings.
 *
 *   ONE PROCESS PER LANE. `tryCommit` is atomic by construction within a process
 *   (sync read, check and write with no await between them) and NOT across them.
 *   Two replicas each keep their own file and their own budget, so the effective
 *   ceiling becomes N x cap. Crossing that needs a lock file or a row with a
 *   conditional UPDATE — the durable-storage slice.
 *
 *   A DURABLE PATH. The default lives under the repo working tree, so a deploy
 *   that cleans the tree, a container rebuild, or a worktree swap DELETES the
 *   day's counter and silently re-mints the budget — with no signal, because
 *   a missing file reads as a fresh day. Losing a batch record loses history;
 *   losing this file resets a CONTROL. Point SWAN_SPEND_LEDGER_DIR at a volume
 *   that survives deploys. THE TRIGGER for moving these two integers into a
 *   table is the first deploy onto an ephemeral path — not "more than one
 *   operator", which is where the first draft put it and which is too late.
 */

import fs from 'node:fs';
import path from 'node:path';
import { makeFileLedger, dayKey } from '../../shared/providers/spendLedger.mjs';

export const LEDGER_DIR_ENV = 'SWAN_SPEND_LEDGER_DIR';
export const DEFAULT_LEDGER_DIR = '.ai-workflow/spend';
/** Lanes are an allowlist, not free text: a typo must not silently open a fresh
 *  ledger with a fresh budget. */
export const LANES = Object.freeze(['atelier', 'video']);
/** Consecutive failed writes before the billed lane is refused. One is a hiccup; three is a disk. */
export const WRITE_FAILURES_BEFORE_DEGRADED = 3;

export function ledgerPath(lane, env = process.env) {
  if (!LANES.includes(lane)) throw new Error(`Unknown spend lane "${lane}". Known lanes: ${LANES.join(', ')}.`);
  const dir = env[LEDGER_DIR_ENV] || DEFAULT_LEDGER_DIR;
  const base = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  return path.join(base, `${lane}.json`);
}

/**
 * A ledger for one lane, with the write-failure asymmetry described above.
 *
 * The `usageFor(day)` / `record(day, delta)` pair is the shape `generateVideo`
 * already consumes, so the video handler needs no change to start counting; the
 * `*Today` helpers are the same thing for callers that do not compute their own
 * day key. `io` and `now` are injected so every branch is testable without disk
 * or a real clock.
 */
export function makeLaneLedger({ lane, env = process.env, io = fs, now = () => new Date() } = {}) {
  const file = ledgerPath(lane, env);
  // The durable-path invariant, made audible. A default-path ledger lives under the repo
  // working tree, so a container rebuild or a `git clean` deletes the day's counter and a
  // missing file reads as a fresh day — the budget re-minted with no signal at all.
  if (!env[LEDGER_DIR_ENV]) {
    console.warn('[spend-ledger/%s] using the default path %s — under the working tree, so a deploy that cleans it re-mints the day’s budget. Set %s to a durable volume.', lane, file, LEDGER_DIR_ENV);
  }
  const inner = makeFileLedger(file, io);
  // Set after a RUN of failed writes, and not cleared in-process thereafter: a disk
  // that failed three times running is not trustworthy again because the fourth
  // attempt landed. A restart clears it, which is the human act that says someone
  // looked. Note the asymmetry with a CORRUPT READ, which is recomputed on every
  // read and therefore self-heals the moment the file is repaired — the condition
  // is directly observable there, and it is not here.
  let unwritable = null;
  // A transient write error is not a broken disk. Only a run of failures degrades the lane.
  let consecutiveFailures = 0;
  // Runs that happened but could not be written down. A failed write refuses BILLED work
  // (money must not move uncounted) and lets FREE work proceed — but the free lane still
  // has a VOLUME cap, and that cap exists to protect one GPU, not a budget. Without this
  // counter an unwritable disk silently uncapped the free lane entirely: every request
  // read the same stale `runs` and none of them ever advanced it. Per-day and in-process,
  // which is all the file itself claims to be.
  const strandedRuns = new Map();

  const usageFor = (day) => {
    const u = inner.usageFor(day);
    return {
      // Recorded runs PLUS the ones the disk refused to take. Counting only what was
      // written means a broken disk reads as a quiet day.
      runs: u.runs + (strandedRuns.get(day) || 0),
      spendUsd: u.spendUsd,
      // Both failure modes reach the gate as the same word, because the gate asks
      // one question — "is today's total knowable?" — and both answer no.
      degraded: Boolean(u.degraded) || Boolean(unwritable),
      ledger: unwritable ? 'unwritable' : u.degraded ? 'degraded' : 'file',
      ...(unwritable ? { reason: unwritable } : {}),
    };
  };

  /** Never throws — it reports. `tryCommit` decides what a failure means for the
   *  caller; a bare `record` is used by the video handler, which records after it
   *  has already spent and therefore has nothing left to refuse. */
  const record = (day, { runs = 0, spendUsd = 0 } = {}) => {
    if (!runs && !spendUsd) return { skipped: true };
    try {
      io.mkdirSync(path.dirname(file), { recursive: true });
      const out = inner.record(day, { runs, spendUsd });
      consecutiveFailures = 0;                 // the disk answered; forget the near-misses
      return out;
    } catch (err) {
      // TRANSIENT IS NOT CORRUPT. The first draft degraded on the FIRST failed write and
      // never recovered, which on Windows means one antivirus scanner or search indexer
      // holding the file for 200ms refuses every paid render for the life of the process,
      // silently. That is a self-inflicted outage on the revenue path, and it is a worse
      // failure than the one it was guarding against. A real problem — disk full, EROFS, a
      // permissions change — does not resolve itself between three consecutive attempts.
      consecutiveFailures += 1;
      const reason = `The ${lane} spend ledger at ${file} could not be written (${err?.code || err?.message}), `
        + `${consecutiveFailures} time(s) in a row.`;
      if (consecutiveFailures >= WRITE_FAILURES_BEFORE_DEGRADED) {
        unwritable = `${reason} Billed generation is refused until this is fixed; free local lanes are unaffected.`;
        console.error(`[spend-ledger/${lane}] WRITE FAILED ${consecutiveFailures}x — billed lane now refuses:`, unwritable);
      } else {
        console.warn(`[spend-ledger/${lane}] write failed (${consecutiveFailures}/${WRITE_FAILURES_BEFORE_DEGRADED}):`, reason);
      }
      // The CALLER is refused on every failure regardless of the threshold — this request's
      // spend was not recorded, so this request must not spend. The threshold governs only
      // whether LATER requests are refused too.
      return { failed: true, reason, degradedNow: Boolean(unwritable) };
    }
  };

  /**
   * THE ONLY AUTHORITATIVE MONEY GATE. Check and commit as ONE operation.
   *
   * The version this replaced checked the ceiling in one place and appended in another,
   * with awaits in between, and claimed the race was closed. Five reviewers said the same
   * thing independently and they were right: moving the append earlier NARROWED the window
   * from provider-latency to read-to-append. It did not remove it. Fifty requests arriving
   * in one tick each read a total of zero, each passed a cap none of them would have passed
   * together — which is precisely the "fifty separate ones" the original stub docblock
   * admitted it could not stop.
   *
   * This function closes it for one process by construction: `usageFor` and `record` are
   * both SYNCHRONOUS, and there is no `await` between them, so no other request can be
   * scheduled in the middle. Node's single thread is not a hand-wave here — it is the
   * guarantee, and it holds exactly as far as one process.
   *
   * IT DOES NOT CLOSE IT ACROSS PROCESSES. Two replicas, or a backend plus a render agent
   * on another host, each get their own file and their own budget: the effective cap
   * becomes N x cap. That is a deployment invariant, not an accident, and it is asserted
   * rather than assumed — see the header. Crossing it needs a lock file or a row with a
   * conditional UPDATE, which is the durable-storage slice.
   *
   * A FAILED WRITE REFUSES A BILLED REQUEST. This is the correction to the reasoning that
   * shipped in the first draft. "Throwing would fail a request that already succeeded" is
   * true where the record happens AFTER generation — the video lane — and FALSE here,
   * because this commits BEFORE the provider is called. At this point nothing has been
   * spent, so proceeding on an unwritable ledger is unbounded spend with no counter. A
   * free request (spendUsd 0) still proceeds: a bookkeeping problem must not take down a
   * lane that costs nothing.
   */
  const tryCommit = ({ runs = 0, spendUsd = 0, maxRunsDaily, maxSpendUsdDaily } = {}, at = now()) => {
    const day = dayKey(at);
    const before = usageFor(day);

    // NOT-A-NUMBER IS NOT FREE. Every comparison against NaN is false, so an unpriced or
    // corrupted cost sailed through both `spendUsd > 0` (read as free) and
    // `total + NaN > ceiling` (read as under the cap) and spent against a $0 ledger. A
    // money gate whose every test silently answers "fine" for garbage input is not a gate.
    if (!Number.isFinite(spendUsd) || !Number.isFinite(runs) || spendUsd < 0 || runs < 0) {
      return { allowed: false, code: 'E_BAD_COST', usage: before,
        message: `Refusing: a cost of ${spendUsd} and a run count of ${runs} cannot be checked against any ceiling.` };
    }

    // AND THE CEILINGS THEMSELVES. The guard above was written for the COST and stopped
    // there, which left the same hole one parameter over: a NaN ceiling makes
    // `total + cost > ceiling` false, and an ABSENT one used to default to Infinity — so
    // a missing cap read as "unlimited" rather than "unknown". For a gate that guards
    // money, an unreadable ceiling is a refusal, not permission. E_BAD_CAP is the code the
    // video lane already uses for a malformed cap, and it is permanent: retrying does not
    // repair an environment variable.
    if (!Number.isFinite(maxRunsDaily) || !Number.isFinite(maxSpendUsdDaily)
        || maxRunsDaily < 0 || maxSpendUsdDaily < 0) {
      return { allowed: false, code: 'E_BAD_CAP', usage: before,
        message: `Refusing: the ceilings are ${maxRunsDaily} runs and $${maxSpendUsdDaily}, which cannot be compared against anything.` };
    }

    const billed = spendUsd > 0;

    if (billed && before.degraded) {
      return { allowed: false, code: 'E_LEDGER_DEGRADED', usage: before,
        message: before.reason || "The spend ledger could not be read, so today's total is unknown and a billed model cannot be charged safely." };
    }
    if (before.runs + runs > maxRunsDaily) {
      return { allowed: false, code: 'E_RUN_CAP', usage: before,
        message: `This batch of ${runs} would pass the daily run cap (${before.runs}/${maxRunsDaily}).` };
    }
    // `billed &&` matches the degraded check just above it. Without it, FREE work was
    // refused E_SPEND_CEILING once prior spend exceeded a lowered cap — the $0 local lane
    // taken down by a budget it never draws from.
    if (billed && before.spendUsd + spendUsd > maxSpendUsdDaily) {
      return { allowed: false, code: 'E_SPEND_CEILING', usage: before,
        message: `This batch costs $${spendUsd.toFixed(4)} and today's spend is $${before.spendUsd.toFixed(4)}, which passes the $${maxSpendUsdDaily} daily ceiling.` };
    }

    const written = record(day, { runs, spendUsd });
    if (written?.failed && billed) {
      // Refused, so nothing happened and nothing may be counted. Stranding the run here
      // was the bug a reviewer found in the FIRST version of this fix: `record` stranded
      // unconditionally in its catch, which runs BEFORE this decision — so a billed
      // request that was refused still consumed volume headroom it never used, and enough
      // of them would close the free lane on behalf of work that never ran.
      return { allowed: false, code: 'E_LEDGER_UNWRITABLE', usage: before, message: written.reason };
    }
    // The write failed but the caller PROCEEDS (free work). The run genuinely happens, so
    // the volume cap must keep counting even though the ledger could not record it.
    if (written?.failed && runs > 0) strandedRuns.set(day, (strandedRuns.get(day) || 0) + runs);
    return { allowed: true, usage: usageFor(day) };
  };

  return {
    lane,
    path: file,
    usageFor,
    record,
    tryCommit,
    usageToday: (at = now()) => usageFor(dayKey(at)),
    recordToday: (delta, at = now()) => record(dayKey(at), delta),
  };
}

/**
 * The video lane's ledger, constructed here rather than at its call site.
 *
 * Not a style preference: `render-agent.mjs` was over its 300-line cap (it has since been split to 270)
 * and three reviewers flagged that wiring the ledger there pushed an over-cap file further
 * over. Constructing it in the module that owns ledgers makes the agent's change a single
 * import and takes the file back BELOW where it started, which is the shape a wiring slice
 * should have had in the first place.
 *
 * Lazy so that importing this module never touches a disk as a side effect — a test or a
 * CLI that imports it for `ledgerPath` should not create anything.
 */
let _atelierLedger = null;
/**
 * The image lane's ledger, as a singleton — the same shape `videoLedger` already had, and
 * absent here purely because the route happened to construct one at module scope and it
 * worked. A reviewer pointed out the shape was the problem: a second construction gets its
 * own `unwritable` flag and its own stranded-run counter, so one instance could be
 * refusing billed work while another cheerfully allowed it against the same file.
 */
export function atelierLedger() {
  if (!_atelierLedger) _atelierLedger = makeLaneLedger({ lane: 'atelier' });
  return _atelierLedger;
}

let _videoLedger = null;
export function videoLedger() {
  if (!_videoLedger) _videoLedger = makeLaneLedger({ lane: 'video' });
  return _videoLedger;
}
