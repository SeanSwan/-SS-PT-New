#!/usr/bin/env node
/**
 * lane-session-start.mjs — SessionStart orientation for the Coordination Ledger
 * =============================================================================
 * Prints the DELTA digest (who holds locks right now, my delivery state) so an
 * agent is oriented before its first edit. Never blocks.
 *
 * v2.1 — the first version ran `execSync('node scripts/lane.mjs digest')`, which
 * only resolves when the session's cwd happens to be the repo root. A session
 * started in `backend/` got ENOENT, the catch swallowed it, and NOTHING printed
 * (verified: running this from `backend/` produced zero output). That is exactly
 * the failure this hook exists to prevent — orientation believed, not happening.
 * The script path now resolves from THIS FILE's location, so cwd is irrelevant.
 *
 * v3.0 — v2.1 fixed the SCRIPT PATH but not the CHILD'S WORKING DIRECTORY. The
 * delegate inherited the caller's cwd, and `lane.mjs digest` needs git: from a
 * non-repo cwd it fails outright, and from a subdirectory it is slow enough that
 * the old 10 s cap could turn it into ETIMEDOUT. Measured 2026-09-20:
 *   cd backend && node ../scripts/hooks/lane-session-start.mjs
 *     -> "[lane] orientation check failed (ETIMEDOUT)"
 *   cd /tmp && node <abs>/scripts/hooks/lane-session-start.mjs
 *     -> "[lane] not a git repository — no ledger."
 *   (direct) cd backend && node ../scripts/lane.mjs digest -> WORKS, but 6.5 s
 * The delegate now runs with cwd PINNED to the repo root and a timeout with real
 * headroom over the measured cost. Same lesson as v2.1, one layer deeper: fixing
 * how you NAME a path does not fix where the process RUNS.
 *
 * v3.1 — the TIMEOUTS were decorative. `.codebuddy/settings.json` shipped
 * `"timeout": 15`, and WorkBuddy's hook `timeout` is in SECONDS (default 60),
 * enforced per invocation. This file's own budget is 25 s for the digest child
 * plus 60 s for prune — so the platform would kill the hook at 15 s, BELOW the
 * child's own 25 s floor, and the inner timeout could never fire at all. An
 * outer limit shorter than the inner one makes the inner one a comment. Raised
 * to the platform default (60 s) in v3.1. Astra hostile review F06, 2026-09-20.
 *
 * The general lesson, and it is the third layer of the same bug: naming a path,
 * then running in the right directory, then — being ALLOWED TO RUN LONG ENOUGH.
 * Each layer looked fixed while the next one silently defeated it. Note also
 * that no harness hook has been OBSERVED firing on this machine; "configured"
 * and "executed" are different evidence states and only the first is in hand.
 *
 * Delegates to lane.mjs so there is one implementation of ledger truth.
 * Fail-open on any error, but not fail-SILENT: a broken guard says so.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
// <root>/scripts/hooks -> <root>. Pinning the delegate's cwd to the repo root is the
// point of v3.0: `lane.mjs digest` shells out to git, so it must RUN in the repo, not
// merely be FOUND there. Without this, a session starting in `backend/` or outside the
// repo gets a failed orientation and no lane awareness at all.
const ROOT = resolve(HERE, '..', '..');
const LANE = resolve(ROOT, 'scripts', 'lane.mjs');
const PRUNE = resolve(ROOT, 'scripts', 'coordination-prune.mjs');
const REVIEW_QUEUE = resolve(ROOT, '.ai-workflow', 'coordination', 'review-queue.md');
// Measured 6.5 s for `digest` on an idle machine (2026-09-20). Several agents share
// this box, so 10 s was a coin-flip; 25 s clears the real cost with headroom.
const DIGEST_TIMEOUT_MS = 25_000;

try {
  if (!existsSync(LANE)) {
    console.log(`[lane] orientation unavailable — ${LANE} not found.`);
  } else {
    const out = execFileSync(process.execPath, [LANE, 'digest'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      cwd: ROOT, timeout: DIGEST_TIMEOUT_MS,
    }).trim();
    if (!out) console.log('[lane] digest produced no output — ledger may be empty or unreadable.');
    if (out) {
      console.log(out);
      // Print the RESOLVED path. Advertising a relative command reintroduced, in the
      // hint, the exact cwd bug this hook was rewritten to fix.
      console.log(`[lane] claim before your first edit: node "${LANE}" claim --task "<one line>" --files "a,b"`);
      // Orientation is not complete without the review queue. `digest` shows who holds
      // what, but a review request addressed TO THIS SEAT is invisible in it — the
      // 2026-09-20 seat note sat unread in review-queue.md for 40 minutes while both
      // seats ran. Name it explicitly or it does not get read.
      console.log(`[lane] then read ${REVIEW_QUEUE} for requests addressed to you.`);
    }
  }
  /* Trim the append logs while we are here. The script has existed since June and
   * nothing ever invoked it, so activity.log.md grew unbounded and doctor would have
   * flagged it forever — a permanent unclearable warning is its own fatigue source.
   * Best-effort and silent on failure: retention is not worth failing orientation.
   *
   * 20 s, not 60 s, since v3.1. The outer platform limit is 60 s, so a 60 s prune
   * child meant the worst case (25 + 60) exceeded the budget that actually binds —
   * the inner timeouts could not fire before the platform killed the hook. 25 + 20
   * fits inside 60 with room for process startup. PROVISIONAL: Astra F05 and the
   * forged package's R06 both say a read-only orientation hook should not prune at
   * all; when S1 removes this call, this number goes with it. */
  try {
    if (existsSync(PRUNE)) execFileSync(process.execPath, [PRUNE], { stdio: 'ignore', cwd: ROOT, timeout: 20_000 });
  } catch (e) {
    // Not silent. An empty catch here is the exact pattern this file's own error
    // path warns about: prune quietly stops working, doctor's unclearable warning
    // returns, and the fatigue loop that motivated wiring it up resumes.
    console.log(`[lane] log prune failed (${e?.code || e?.message}) — run node scripts/coordination-prune.mjs by hand.`);
  }
} catch (err) {
  // Say so rather than vanish — a silent orientation hook is indistinguishable
  // from a healthy one, which is how the ledger went unread for weeks.
  console.log(`[lane] orientation check failed (${err.code || err.message}) — run \`node scripts/lane.mjs digest\` manually.`);
}
process.exit(0);
