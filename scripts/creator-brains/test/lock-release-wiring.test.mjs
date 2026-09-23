#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/lock-release-wiring.test.mjs
 * PURPOSE: Does `release()` RETRY THE DELETION — proven by running it, not by
 *          reading the source? Plus the pending behavioural regression for E4.
 * PART OF: Creator Brains — SS-PT acquisition engine (additive)
 * ADDED: 2026-09-22 (Astra R1 #2) · REWRITTEN 2026-09-22 (Astra R3 #1/#2/#4)
 * ============================================================================
 *
 * WHY THIS STOPPED BEING A SOURCE-SHAPE GATE — three rounds, each one honest.
 *
 *   Round 1 (Astra R1 #2): `retry-transient.test.mjs` drives the HELPER and never
 *   calls `release()`, so removing `retryTransientSync` from `lock.mjs` left every
 *   test green. Nothing pinned the wiring. Source-shape was the only instrument I
 *   had, and I documented why: two natural injections (chmod 0444, target held by
 *   an open fd) both returned NO_THROW on Windows — measured, not assumed.
 *
 *   Round 2 (Astra R2 #4): two INDEPENDENT matches do not prove nesting —
 *   `retryTransientSync(() => true); unlinkSync(...)` satisfies "calls retry" and
 *   "calls unlink" while retrying nothing. I fixed that by bounding the call and
 *   looking inside its callback. Mutation-proven against that exact counterexample.
 *
 *   Round 3 (Astra R3 #1): searching the callback's TEXT still false-passes an
 *   unlink that is only REFERENCED, never executed:
 *       retryTransientSync(() => { const neverCalled = () => unlinkSync(r); return true; });
 *   and it false-rejects valid wiring if the deletion moved into an intermediate
 *   function. Text can never settle "does it execute". So the gate now RUNS
 *   `release()` in an isolated child with a test-local `unlinkSync` substitution.
 *
 * HOW THE SUBSTITUTION WORKS, AND THE TRAP THAT MAKES IT POSSIBLE.
 *
 *   Measured on this machine (Node v22.22.2): patching `require('node:fs').unlinkSync`
 *   DOES reach `lock.mjs`'s ESM binding — but ONLY if the patch is installed before
 *   the first ESM instantiation of `node:fs`. A probe that statically imported
 *   `node:fs` in its own top-level imports saw `patched=0`: the namespace had already
 *   captured the original bindings. The child below therefore uses `createRequire`
 *   for EVERYTHING until after the patch, and never statically imports `node:fs`.
 *   No engine source is touched — this is test-local, per Astra R3 #1's fix.
 *
 * WHAT EACH TEST PROVES.
 *
 *   1. `release()` is called with ONE injected EPERM on the first unlink. It must
 *      retry, then delete: ≥2 unlink attempts, `true` returned, lock gone.
 *        - bare `retryTransientSync(() => true); unlinkSync(...)` -> one attempt,
 *          EPERM escapes, returns false, lock remains -> RED.
 *        - unlink referenced but never executed (R3 #1) -> zero attempts, lock
 *          remains -> RED.
 *      So the assertion is "the deletion HAPPENED THROUGH the retry", which no
 *      amount of matching text can fake.
 *
 *   2. E4 — exhaust the budget (every unlink EPERMs, 6 attempts), get `false`;
 *      then DISARM the injection and release AGAIN through the SAME handle,
 *      requiring that it attempts deletion and succeeds. The pre-fix code set
 *      `released = true` BEFORE the first attempt, so the second call
 *      short-circuited at the guard with ZERO unlink attempts -> RED.
 *      Landed 2026-09-22 (engine owner): `released` is now latched only after a
 *      successful delete, so the handle stays retryable once contention clears.
 *
 * RUN: node --test scripts/creator-brains/test/lock-release-wiring.test.mjs
 * @module creator-brains/test/lock-release-wiring
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const LOCK = join(HERE, '..', 'lib', 'lock.mjs');
const PATHS = join(HERE, '..', 'lib', 'paths.mjs');
const LOCK_HREF = pathToFileURL(LOCK).href;

/**
 * E4 pending flag. A value that is neither `false` nor `undefined` SKIPS that
 * regression, carrying the reason when it is a string; `false` (or omitting the
 * key) runs it. Set to `false` once the engine owner lands E4 — `released = true`
 * moved to after a successful delete.
 *
 * ⚠️ `null` DOES NOT UN-SKIP. MEASURED 2026-09-22 on Node v22.22.2, one test whose
 * body asserts `1 === 2`:
 *
 *   skip value         reported                      exit
 *   null               `# SKIP`, fail 0, skipped 1     0
 *   '' / 0 / 1         `# SKIP`, fail 0, skipped 1     0
 *   true / 'reason'    `# SKIP`, fail 0, skipped 1     0
 *   false              fail 1                         1
 *   undefined          fail 1                         1
 *   key absent         fail 1                         1
 *
 *   The body DOES execute and the assertion error IS printed — but the test counts
 *   as `# skipped`, not `# failed`, and the run EXITS 0. So the "set SKIP_E4 = null
 *   when fixed" un-skip an earlier version of this comment prescribed would have
 *   shipped a GREEN GATE OVER BROKEN CODE: the flag reads as resolved while still
 *   skipping. `null` is exactly as skipped as a non-empty reason string. Use
 *   `false`, and keep the key ABSENT when running — hence the spread below.
 */
const SKIP_E4 = false;
const E4_OPTS = SKIP_E4 ? { skip: SKIP_E4 } : {};

/**
 * The behavioural child. TWO RULES THIS BODY MUST OBEY, both load-bearing:
 *
 *   - it may NOT statically import `node:fs` — a top-level `import ... from
 *     'node:fs'` instantiates the ESM namespace before the patch and the patch
 *     then never reaches `lock.mjs` (measured: patched=0);
 *   - every fs call before the patch, and every setup call, goes through the
 *     `require`d CJS object so the wrapper is the only `unlinkSync` in play.
 *
 * `RL_FAILS` = how many unlink attempts throw EPERM before one is allowed.
 * `RL_ROUNDS` = how many release() attempts to make (2 for the E4 regression).
 */
const CHILD = `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const fs = require('node:fs');
const { join } = require('node:path');
const dir = process.env.RL_DIR;
const lockPath = join(dir, '.lock');

const original = fs.unlinkSync;
let attempts = 0;
let failsLeft = Number(process.env.RL_FAILS || '0');
fs.unlinkSync = function injectedUnlink(p) {
  attempts += 1;
  if (failsLeft > 0) {
    failsLeft -= 1;
    const e = new Error('injected EPERM for test');
    e.code = 'EPERM';
    throw e;
  }
  return original.call(this, p);
};

// First ESM instantiation of node:fs happens HERE, after the patch, so lock.mjs
// binds the injected unlinkSync. No static 'node:fs' import above this line.
const { acquireLock } = await import(${JSON.stringify(LOCK_HREF)});
const held = acquireLock(dir, { runId: 'behavioural' });
if (!held.ok) {
  process.stdout.write('R' + JSON.stringify({ error: 'acquire_failed', held }));
  process.exit(0);
}
const out = [];
for (let i = 0; i < Number(process.env.RL_ROUNDS || '1'); i += 1) {
  const before = attempts;
  const res = held.release();
  out.push({ res, attempts: attempts - before, lockThere: fs.existsSync(lockPath) });
  // MEASURED 2026-09-22: this loop used to leave the injection ARMED across
  // rounds, so round 2 could never succeed no matter how the handle was wired —
  // RL_FAILS=999 leaves 993 EPERMs armed after round 1 spends its 6-attempt
  // budget. The E4 regression is "retryable once the CONTENTION CLEARS", so the
  // contention has to actually clear: RL_CLEAR_BETWEEN=1 disarms it per round.
  // Without this, the gate fails GREEN as well as RED — an instrument reporting
  // a state it never reached, which is the mistake this file already records twice.
  if (process.env.RL_CLEAR_BETWEEN === '1') failsLeft = 0;
}
process.stdout.write('R' + JSON.stringify({ attempts, out }));
`;

function runChild(dir, fails, rounds, clearBetween = false) {
  const file = join(dir, 'release-child.mjs');
  writeFileSync(file, CHILD, 'utf-8');
  const r = spawnSync(process.execPath, [file], {
    encoding: 'utf-8',
    env: {
      ...process.env,
      RL_DIR: dir,
      RL_FAILS: String(fails),
      RL_ROUNDS: String(rounds),
      RL_CLEAR_BETWEEN: clearBetween ? '1' : '0',
    },
    windowsHide: true,
  });
  const stdout = String(r.stdout || '');
  let payload = null;
  try { payload = JSON.parse(stdout.slice(stdout.indexOf('R') + 1)); } catch { /* reported below */ }
  return { status: r.status, payload, stderr: String(r.stderr || '').slice(0, 600), stdout };
}

// NOTE (Astra R3 #1): a static `node:fs` import is fine in THIS parent file — the
// rule that matters is that the CHILD never statically imports `node:fs`, because the
// substitution must be installed before `node:fs`'s ESM namespace is first created
// (measured: a parent-side static import made lock.mjs see the UNPATCHED binding).
//
// An earlier draft of this file routed child-body writing through a promise-returning
// helper, so the body file was never written, the child died on a missing module, and
// `node --check` still reported clean. Parse-clean is not runnable. A parallel batch of
// edits to this same file then clobbered the import fix — applied in one message, the
// last writer won and the gate failed with `writeFileSync is not defined`. Both mistakes
// are recorded because both are the same failure: an instrument that reports a state it
// never reached.

test('E1 wiring BEHAVIOUR: release() retries the injected EPERM, then deletes the lock', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cb-wiring-'));
  try {
    // One injected EPERM on the first unlink; the retry must absorb it.
    const r = runChild(dir, 1, 1);
    assert.equal(r.payload && r.payload.error, undefined,
      `child could not acquire: ${JSON.stringify(r).slice(0, 400)}`);
    const first = r.payload.out[0];

    assert.ok(r.payload.attempts >= 2,
      `release() made only ${r.payload.attempts} unlink attempt(s) under an injected EPERM — `
      + 'the retry is NOT wrapping the deletion. A bare `retryTransientSync(() => true)` followed '
      + 'by an unlink, or an unlink only referenced inside the callback, both land here. This is '
      + 'the assertion no source-matching can fake: it measures EXECUTION. '
      + `child=${JSON.stringify(r.payload)}`);

    assert.equal(first.res, true,
      `release() did not report success after absorbing one transient EPERM: ${JSON.stringify(first)}`);
    assert.equal(first.lockThere, false,
      'release() reported success but the lock file still exists — deletion did not happen');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('E4: after an exhausted release, the SAME handle still attempts and completes deletion',
  E4_OPTS, () => {
    const dir = mkdtempSync(join(tmpdir(), 'cb-e4-'));
    try {
      // Round 1: every unlink EPERMs -> the ~92 ms budget (6 attempts) exhausts
      // -> must report false, lock still present. The injection is then DISARMED
      // (RL_CLEAR_BETWEEN), so a handle that RETAINS retryability can still
      // delete on round 2; a handle that latched `released = true` before the
      // first attempt cannot (lock.mjs release(): the guard vs the try).
      const r = runChild(dir, 999, 2, true);
      assert.equal(r.payload && r.payload.error, undefined,
        `child could not acquire: ${JSON.stringify(r).slice(0, 400)}`);
      const [exhausted, retry] = r.payload.out;

      assert.equal(exhausted.res, false,
        `an exhausted release must report false, got ${JSON.stringify(exhausted)}`);
      assert.equal(exhausted.lockThere, true,
        'the lock must still be there after a failed deletion');

      assert.ok(retry.attempts > 0,
        'the SECOND release() through the same handle made NO unlink attempt — `released` was '
        + 'latched before the deletion, so the handle can never release the lock it still owns '
        + `(E4: the release() guard short-circuited). attempts=${retry.attempts} payload=${JSON.stringify(r.payload)}`);
      assert.equal(retry.res, true,
        'after the transient failure cleared, the same handle must still be able to delete');
      assert.equal(retry.lockThere, false, 'the lock must be gone after the successful retry');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

test('precondition: lock.mjs still wires release() through the SHARED policy import', () => {
  // Structural only, and deliberately narrow: anchors are re-scope tripwires, not
  // the proof. The proof is the behavioural test above.
  const src = readFileSync(LOCK, 'utf-8');
  const start = src.indexOf('release() {');
  assert.ok(start !== -1, 'release() is gone or renamed — re-scope this gate, do not loosen it');
  const end = src.indexOf('\nexport async function withLock', start);
  assert.ok(end > start, 'the withLock anchor moved — the release() window could not be bounded');
  const body = src.slice(start, end);

  const importLine = src.split(/\r?\n/).find((l) => l.includes('retryTransientSync'));
  assert.ok(importLine && importLine.includes('from \'./paths.mjs\''),
    'lock.mjs must import the policy from paths.mjs so both consumers read ONE definition');
  assert.match(body, /retryTransientSync\s*\(/,
    'release() no longer routes its deletion through retryTransientSync at all');

  const pathsSrc = readFileSync(PATHS, 'utf-8');
  assert.match(pathsSrc, /export function retryTransientSync/,
    'paths.mjs no longer exports retryTransientSync — the shared policy moved or was renamed');
  assert.ok(existsSync(LOCK), 'lock.mjs disappeared while this gate ran');
  void rmSync; void tmpdir;
});
