#!/usr/bin/env node
/**
 * lane-session-start.test.mjs — the orientation hook that fires in every session.
 * ==============================================================================
 * WHY THIS EXISTS, and why it exists NOW: `lane-session-start.mjs` is the one
 * coordination hook wired into a session's FIRST moment, and it was the only hook
 * in this directory with no test file. Both of its shipped bugs were the same
 * class, one layer apart:
 *
 *   v1 -> v2.1: it ran `execSync('node scripts/lane.mjs digest')`, a RELATIVE
 *   path. From `backend/` that is ENOENT, the catch swallowed it, and the hook
 *   printed NOTHING — orientation silently absent, which is indistinguishable
 *   from "no conflicts, carry on".
 *
 *   v2.1 -> v3.0: the script path was fixed, but the CHILD'S WORKING DIRECTORY
 *   was never pinned. `lane.mjs digest` shells out to git, so from a non-repo cwd
 *   it fails outright, and from a subdirectory it was slow enough that the old
 *   10 s cap could turn it into ETIMEDOUT. Measured before the fix: from
 *   `backend/` -> "orientation check failed (ETIMEDOUT)"; from `/tmp` ->
 *   "not a git repository — no ledger."
 *
 * The generalisable lesson, and the reason this test is cwd-shaped rather than
 * logic-shaped: **fixing how you NAME a path does not fix where the process
 * RUNS.** A test that only ever ran the hook from the repo root would have passed
 * against all three versions. So every case below varies the cwd.
 *
 * THE ASYMMETRY: a hook that fails loudly is annoying but safe; a hook that
 * "succeeds" while printing no orientation is the failure this whole ledger
 * exists to prevent. So the load-bearing assertions are (a) real digest content
 * appears from EVERY cwd, and (b) the hook NEVER exits non-zero — a session-start
 * hook that blocks a session gets deleted, taking the orientation with it.
 *
 * Run: node scripts/hooks/lane-session-start.test.mjs   (exit 0 = pass)
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(HERE, 'lane-session-start.mjs');
const ROOT = resolve(HERE, '..', '..');

let pass = 0;
const failures = [];
const check = (name, cond, detail = '') => {
  if (cond) { pass++; return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

/**
 * Run the hook with a given cwd. Returns { out, code }.
 * Never throws: a non-zero exit is a RESULT to assert on, not a test error.
 */
const runHook = (cwd) => {
  try {
    const out = execFileSync(process.execPath, [HOOK], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 90_000,
    });
    return { out, code: 0 };
  } catch (e) {
    return { out: `${e.stdout || ''}${e.stderr || ''}`, code: e.status ?? -1 };
  }
};

// Structural markers that mean "real orientation happened", chosen so the test
// does not depend on which seats happen to be live at run time.
const ORIENTED = (out) => out.includes('[lane] ledger') && out.includes('[lane] me:');
const BROKEN = (out) => /orientation check failed|not a git repository|orientation unavailable|digest produced no output/i.test(out);

// ---- 1. The regression: the SAME hook must orient from every cwd -----------
{
  const scratch = mkdtempSync(resolve(tmpdir(), 'lane-hook-'));
  try {
    const cases = [
      ['1a repo root', ROOT],
      ['1b subdirectory (backend/)', resolve(ROOT, 'backend')],
      ['1c outside the repo entirely', scratch],
    ];
    for (const [name, cwd] of cases) {
      const { out, code } = runHook(cwd);
      check(`${name}: exits 0`, code === 0, `exit ${code}`);
      check(`${name}: prints real orientation`, ORIENTED(out), out.slice(0, 160));
      check(`${name}: does not report a broken run`, !BROKEN(out), out.slice(0, 160));
    }
  } finally {
    // Best-effort; a leftover temp dir is not worth failing the suite over.
    try { rmSync(scratch, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

// ---- 2. The hint must be an ABSOLUTE path, or it re-teaches the v1 bug -----
{
  const { out } = runHook(ROOT);
  const hint = out.split('\n').find((l) => l.includes('claim before your first edit')) || '';
  check('2a claim hint present', hint.length > 0);
  // A bare `node scripts/lane.mjs ...` hint is the v1 bug restated as advice:
  // pasted from `backend/`, it fails. The hint must name a resolved path.
  check('2b hint uses a resolved path, not a relative one', /node ".*lane\.mjs"/.test(hint), hint);
}

// ---- 3. Orientation is incomplete without the review queue -----------------
{
  const { out } = runHook(ROOT);
  check('3a names review-queue.md', out.includes('review-queue.md'));
}

// ---- 4. It must never block a session -------------------------------------
{
  // Run from the least friendly cwd we can construct; exit must still be 0.
  const scratch = mkdtempSync(resolve(tmpdir(), 'lane-hook-bare-'));
  try {
    const { code } = runHook(scratch);
    check('4a never non-zero, even outside the repo', code === 0, `exit ${code}`);
  } finally {
    try { rmSync(scratch, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

if (failures.length) {
  console.error(`lane-session-start: ${failures.length} FAILED, ${pass} passed`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`lane-session-start: ${pass} passed`);
