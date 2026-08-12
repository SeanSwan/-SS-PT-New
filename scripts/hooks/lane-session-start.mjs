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

try {
  if (!existsSync(LANE)) {
    console.log(`[lane] orientation unavailable — ${LANE} not found.`);
  } else {
    const out = execFileSync(process.execPath, [LANE, 'digest'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000,
    }).trim();
    if (out) {
      console.log(out);
      console.log('[lane] claim before your first edit: node scripts/lane.mjs claim --task "<one line>" --files "a,b"');
    }
  }
} catch (err) {
  // Say so rather than vanish — a silent orientation hook is indistinguishable
  // from a healthy one, which is how the ledger went unread for weeks.
  console.log(`[lane] orientation check failed (${err.code || err.message}) — run \`node scripts/lane.mjs digest\` manually.`);
}
process.exit(0);
