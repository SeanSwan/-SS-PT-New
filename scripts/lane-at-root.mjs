#!/usr/bin/env node
/**
 * lane-at-root.mjs — root-pinned entry point for the coordination ledger
 * ======================================================================
 * Purpose: run a ledger command against THIS checkout, from any cwd.
 * Boundary: it owns no ledger truth. It resolves a root, forwards argv, and
 * propagates the result. It does not parse lanes, decide ownership, or retry.
 *
 * WHY THIS FILE EXISTS (Astra hostile review, 2026-09-20 — F04):
 *   The orientation hook was fixed to pin its child's cwd (v3.0), but the
 *   RECOVERY COMMAND IT PRINTED was still `node scripts/lane.mjs digest` with a
 *   resolved script path. That is the same bug one layer out: an absolute script
 *   path does not make the process RUN in the repo, and `lane.mjs` shells out to
 *   git. Pasted from `backend/`, it fails. The fix is a wrapper that pins cwd, so
 *   the command an agent is TOLD to run is the same shape as the command the hook
 *   actually runs.
 *
 * Root resolution is from THIS FILE's location, never from caller cwd, a harness
 * environment variable, a branch label, or an agent's short name. Consequence:
 * invoking checkout A's wrapper from checkout B targets A. That is deliberate —
 * the invoked checkout owns the command.
 *
 * argv is passed as an ARRAY to spawnSync. It never goes through a shell, so
 * spaces, quotes, `$(...)` and backticks in an argument are inert data. This
 * matters because `--files` and `--task` carry arbitrary text.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LANE = resolve(ROOT, 'scripts', 'lane.mjs');

/** Read-only operations get a deadline. Mutations do not: a wrapper timeout on
 *  a claim/release could interrupt a write, and an interrupted mutation must be
 *  inspected by hand rather than retried automatically. */
const READ_OPS = new Set(['digest', 'whoami', 'orientation']);
const MUTATION_OPS = new Set(['claim', 'release']);
const READ_TIMEOUT_MS = 25_000;

const USAGE = `usage: lane-at-root.mjs <${[...READ_OPS, ...MUTATION_OPS].join('|')}> [args...]`;

const [op, ...rest] = process.argv.slice(2);

if (!op || !(READ_OPS.has(op) || MUTATION_OPS.has(op))) {
  // Exit 64 (EX_USAGE) and do NOT invoke the child. A wrapper that forwards an
  // unknown op is a wrapper that can trigger an unintended mutation.
  console.error(`[lane-at-root] unsupported operation: ${op ?? '(none)'}`);
  console.error(`[lane-at-root] ${USAGE}`);
  process.exit(64);
}

const result = spawnSync(process.execPath, [LANE, op, ...rest], {
  cwd: ROOT,                                  // THE POINT: cwd is pinned, not inherited
  stdio: 'inherit',                           // child's stdout/stderr pass through unaltered
  ...(READ_OPS.has(op) ? { timeout: READ_TIMEOUT_MS } : {}),
});

// A launch failure or a signal-terminated child has status === null. Map both to
// 1 rather than letting `undefined` reach process.exit (which would exit 0 and
// read as success). A real exit code is preserved exactly, so callers can rely
// on lane.mjs's own 0/1/2/3 contract.
if (result.error || result.status === null) {
  console.error(`[lane-at-root] delegate did not complete (${result.signal || result.error?.code || 'unknown'})`);
  process.exit(1);
}
process.exit(result.status);
