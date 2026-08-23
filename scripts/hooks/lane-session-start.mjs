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
 * Delegates to lane.mjs so there is one implementation of ledger truth.
 * Fail-open on any error, but not fail-SILENT: a broken guard says so.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LANE = resolve(HERE, '..', 'lane.mjs');
const PRUNE = resolve(HERE, '..', 'coordination-prune.mjs');

try {
  if (!existsSync(LANE)) {
    console.log(`[lane] orientation unavailable — ${LANE} not found.`);
  } else {
    const out = execFileSync(process.execPath, [LANE, 'digest'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000,
    }).trim();
    if (!out) console.log('[lane] digest produced no output — ledger may be empty or unreadable.');
    if (out) {
      console.log(out);
      // Print the RESOLVED path. Advertising a relative command reintroduced, in the
      // hint, the exact cwd bug this hook was rewritten to fix.
      console.log(`[lane] claim before your first edit: node "${LANE}" claim --task "<one line>" --files "a,b"`);
    }
  }
  /* Trim the append logs while we are here. The script has existed since June and
   * nothing ever invoked it, so activity.log.md grew unbounded and doctor would have
   * flagged it forever — a permanent unclearable warning is its own fatigue source.
   * Best-effort and silent on failure: retention is not worth failing orientation. */
  try {
    if (existsSync(PRUNE)) execFileSync(process.execPath, [PRUNE], { stdio: 'ignore', timeout: 60_000 });
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
