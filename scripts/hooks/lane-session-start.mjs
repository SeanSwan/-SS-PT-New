#!/usr/bin/env node
/**
 * lane-session-start.mjs — SessionStart orientation for the Coordination Ledger
 * =============================================================================
 * Purpose: orient an agent before its first edit. Boundary: it resolves its own
 * root, calls orient(), and exits. All classification lives in
 * `scripts/lib/lane-orientation.mjs` so it can be tested through seams; all
 * ledger truth lives in `lane.mjs`. This file owns neither.
 *
 * HISTORY — four layers of ONE bug, each fixed while the next silently defeated it:
 *   v2.1  fixed NAMING the path. `execSync('node scripts/lane.mjs digest')` only
 *         resolved when cwd happened to be the repo root; a session started in
 *         `backend/` got ENOENT, the catch swallowed it, and NOTHING printed.
 *   v3.0  fixed WHERE THE CHILD RUNS. The script path was absolute, but the
 *         delegate inherited the caller's cwd and `lane.mjs digest` needs git.
 *         Measured: from `backend/` -> ETIMEDOUT; from `/tmp` -> "not a git
 *         repository". cwd is now pinned to the root.
 *   v3.1  fixed WHETHER IT IS ALLOWED TO RUN LONG ENOUGH. `.codebuddy/settings.json`
 *         shipped `"timeout": 15` (seconds) while this file allowed 25 s for the
 *         child. The platform would kill the hook BELOW the child's own floor, so
 *         the inner timeout could never fire. An outer limit shorter than the
 *         inner one makes the inner one a comment.
 *   v4.0  fixed WHAT COUNTS AS SUCCESS, and stopped the hook from writing.
 *         The old test was `if (out) {...}`: ANY non-empty stdout was treated as
 *         a healthy ledger, so a diagnostic printed with exit 0 would have been
 *         presented as orientation (Astra F03). And this hook — which presents
 *         itself as read-only orientation — invoked `coordination-prune.mjs`,
 *         performing real deletion on a session-start path, and its own
 *         regression test reached that deletion six times per run (Astra F05).
 *         Pruning is removed; retention is a separate maintenance operation.
 *
 * The load-bearing lesson is not any one layer but that each looked finished:
 * naming a path, then running in the right directory, then being allowed to run
 * long enough, then knowing what success even means. A guard that cannot say
 * WHICH of those failed is a guard that reports on itself.
 *
 * Fail-open on handled failures, but never fail-SILENT: a broken guard says so.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { orient } from '../lib/lane-orientation.mjs';

// <root>/scripts/hooks -> <root>. Resolved from THIS FILE, never from cwd, an
// environment variable, or a branch label.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

try {
  orient({ root: ROOT });
} catch (err) {
  // orient() classifies its own child failures and never throws for them, so
  // reaching here means a defect in this file or its imports. Say so rather than
  // vanish: a silent orientation hook is indistinguishable from a healthy one.
  console.log(`[lane] orientation failed to start (${err?.code || err?.message}) — run the root-pinned entry point by hand.`);
}
process.exit(0);
