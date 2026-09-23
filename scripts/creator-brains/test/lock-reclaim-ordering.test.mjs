#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/lock-reclaim-ordering.test.mjs
 * PURPOSE: E3 — the reclaim must not act on a STALE observation. Both halves of
 *          the fix are forced, not hoped for.
 * PART OF: Creator Brains — SS-PT acquisition engine
 * ADDED: 2026-09-22 (Astra R1 Q1 / R3 E3 — the ordering the race test cannot reach)
 * ============================================================================
 *
 * WHY THIS FILE EXISTS AND `lock-reclaim-race.test.mjs` IS NOT ENOUGH.
 *
 *   The race test starts two reclaimers behind one barrier and lets the
 *   scheduler decide. Both of its removals therefore land BEFORE either
 *   `attempt()` recreates the path — the benign ordering — so its 10/10 green
 *   corroborates the old comment instead of testing the behaviour. Astra R1
 *   named the ordering it cannot reach:
 *
 *     1. A and B both observe the same DEAD holder.
 *     2. A removes the lock, then `attempt()` creates A's LIVE lock.
 *     3. B's removal now targets a path that EXISTS AGAIN — A's live lock — so
 *        it succeeds and takes A's lock away.
 *     4. B `attempt()`s, creates its own lock, and BOTH callers reach `ok: true`.
 *
 *   Whichever primitive does the removal, it is atomic for one pathname
 *   transition and is NOT bound to the holder B *observed*. That is a TOCTOU on
 *   the OBSERVATION, and it is what these two tests force.
 *
 * HOW THE ORDERINGS ARE FORCED WITHOUT TOUCHING ENGINE SOURCE.
 *
 *   The seam is `fs.readFileSync`, because it is the one call BOTH the old and
 *   the new reclaim make between "I read the dead holder" and "I act on it" —
 *   `readLock()` is the observation in each. The child patches it so that a
 *   chosen read of `.lock` performs a whole competing acquisition *after* the
 *   bytes are read but *before* they are returned to `readLock`. The instrument
 *   is identical for both implementations, so old-vs-new is an apples-to-apples
 *   comparison rather than a test written to fit the fix. The same patch
 *   mechanism as the E4 gate is used, for the same reason: a static `node:fs`
 *   import in the child would instantiate the ESM namespace before the patch and
 *   the patch would never reach `lock.mjs` (measured).
 *
 *   TEST 1 (read #1 — the observation) forces the STALE OBSERVATION half: the
 *     competitor takes the store entirely before the outer call can act on what
 *     it read. This is the regression the handoff asked for — "delay the second
 *     removal until after the first `attempt()` succeeds".
 *   TEST 2 (read #2 — the verify inside the claim) forces the EXCLUSION half:
 *     the competitor arrives WHILE the claim is held. Without an exclusive
 *     claim, both entrants verify the dead token, both remove, both `attempt()`,
 *     and two holders result. This half is NOT covered by test 1, where the
 *     competitor finishes long before the second claim is taken.
 *
 * WHAT THEY ASSERT. Exactly ONE caller may end up holding the store, and the
 *   token on disk must be that caller's. Test 2 additionally asserts its own
 *   instrument FIRED: if the reclaim stops re-reading while holding its claim,
 *   the test must fail loudly rather than pass vacuously.
 *
 * RUN: node --test scripts/creator-brains/test/lock-reclaim-ordering.test.mjs
 * @module creator-brains/test/lock-reclaim-ordering
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ensureStore } from '../lib/store.mjs';
import { lockStatus } from '../lib/lock.mjs';

const LIB = fileURLToPath(new URL('../lib/', import.meta.url));
const LOCK_HREF = pathToFileURL(join(LIB, 'lock.mjs')).href;

/**
 * The forcing child. Obeys the two rules the E4 gate records: no static
 * `node:fs` import, and every pre-patch fs call through the `require`d CJS
 * object, so the wrapper is the only `readFileSync` in play.
 *
 * CB_ARM_READ = which read of `.lock` fires the competing acquisition (1-based).
 */
const CHILD = `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const fs = require('node:fs');
const { join } = require('node:path');

const root = process.env.CB_ROOT;
const lockFile = join(root, '.lock');
const originalRead = fs.readFileSync;
const armOn = Number(process.env.CB_ARM_READ || '1');

let mod = null;
let armed = true;
let reads = 0;
let nested = null;

fs.readFileSync = function patchedRead(p, ...rest) {
  const out = originalRead.call(this, p, ...rest);
  // The outer caller's observation is complete at this point. The competitor
  // now takes the store — entirely (test 1), or as far as the claim allows
  // (test 2) — before the outer caller can act on what it read.
  if (armed && mod && String(p) === lockFile) {
    reads += 1;
    if (reads === armOn) {
      armed = false;
      try { nested = mod.acquireLock(root, { runId: process.env.CB_INNER }); }
      catch (e) { nested = { ok: false, reason: 'THREW:' + (e && e.message) }; }
    }
  }
  return out;
};

mod = await import(${JSON.stringify(LOCK_HREF)});

const outer = mod.acquireLock(root, { runId: process.env.CB_OUTER });
const onDisk = (() => { try { return JSON.parse(fs.readFileSync(lockFile, 'utf-8')).token; } catch { return null; } })();
process.stdout.write('R' + JSON.stringify({
  outerOk: !!outer.ok,
  outerReason: outer.reason || null,
  outerToken: outer.token || null,
  innerOk: !!(nested && nested.ok),
  innerReason: (nested && nested.reason) || null,
  innerToken: (nested && nested.token) || null,
  fired: nested !== null,
  reads,
  onDisk,
}));
`;

function runChild(root, { outer, inner, armRead }) {
  const dir = mkdtempSync(join(tmpdir(), 'cb-e3-child-'));
  const file = join(dir, 'stale-reclaimer.mjs');
  writeFileSync(file, CHILD, 'utf-8');
  try {
    const stdout = execFileSync(process.execPath, [file], {
      encoding: 'utf-8',
      timeout: 30_000,
      env: { ...process.env, CB_ROOT: root, CB_OUTER: outer, CB_INNER: inner, CB_ARM_READ: String(armRead) },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    return JSON.parse(stdout.slice(stdout.indexOf('R') + 1));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** A dead owner's lock: a real child takes it and exits WITHOUT releasing, which
 *  is exactly what a killed process leaves behind. Written to a file rather than
 *  passed to `-e`, because `node -e` is CommonJS and its top-level `await` fails. */
function seedOrphanLock(root) {
  const dir = mkdtempSync(join(tmpdir(), 'cb-e3-orphan-'));
  const file = join(dir, 'orphan.mjs');
  writeFileSync(file, `
    import { acquireLock } from ${JSON.stringify(LOCK_HREF)};
    const l = acquireLock(process.env.CB_ROOT, { runId: 'orphan' });
    if (!l.ok) { process.stdout.write('ORPHAN_FAILED:' + l.reason); process.exit(3); }
    process.stdout.write(String(l.holder.pid));
    // no release(): simulate a kill
  `, 'utf-8');
  try {
    const pid = execFileSync(process.execPath, [file], {
      encoding: 'utf-8', env: { ...process.env, CB_ROOT: root }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.match(pid, /^\d+$/, `orphan child did not take the lock: ${pid}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const st = lockStatus(root);
  assert.equal(st.held, true, "precondition: the dead owner's lock is on disk");
  assert.equal(st.alive, false, 'precondition: its owner is provably dead');
}

/** The property both tests share: one holder, and the store names that holder. */
function assertExactlyOneHolder(payload, what) {
  const holders = [payload.outerOk ? 'outer' : null, payload.innerOk ? 'inner' : null].filter(Boolean);
  assert.equal(holders.length, 1,
    `EXACTLY ONE caller may hold the store, got ${JSON.stringify(holders)}. Two means the second `
    + `reclaimer acted on a path the first had already repopulated — ${what}. `
    + `payload=${JSON.stringify(payload)}`);
  const winnerToken = payload.outerOk ? payload.outerToken : payload.innerToken;
  assert.equal(payload.onDisk, winnerToken,
    'the token on disk must belong to the single holder — anything else means the store is owned '
    + `by a caller that did not win. payload=${JSON.stringify(payload)}`);
  const loserReason = payload.outerOk ? payload.innerReason : payload.outerReason;
  assert.ok(loserReason, `the losing caller must report a reason, got ${JSON.stringify(payload)}`);
}

test('E3a a reclaim must not act on a STALE observation — exactly one holder', () => {
  const root = mkdtempSync(join(tmpdir(), 'cb-e3a-'));
  try {
    ensureStore(root);
    seedOrphanLock(root);
    // The competitor completes its WHOLE acquisition at the outer call's first
    // read of `.lock` — i.e. after the dead holder was read, before it is acted
    // on. Pre-fix, the outer call then removes the competitor's LIVE lock.
    const payload = runChild(root, { outer: 'B-stale', inner: 'A-nested', armRead: 1 });
    assertExactlyOneHolder(payload, 'a TOCTOU on the observation, not on the removal');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('E3b a second reclaimer arriving WHILE a claim is held cannot also proceed', () => {
  const root = mkdtempSync(join(tmpdir(), 'cb-e3b-'));
  try {
    ensureStore(root);
    seedOrphanLock(root);
    // The competitor arrives at the outer call's SECOND read of `.lock` — the
    // verify that happens INSIDE the reclaim claim. Two entrants are only
    // possible if that claim is not exclusive, and then both verify the dead
    // token, both remove, both `attempt()`, and two holders result.
    const payload = runChild(root, { outer: 'A-claim', inner: 'B-claim', armRead: 2 });

    assert.ok(payload.fired,
      'this test did not run: the reclaim never re-read `.lock` inside its claim, so the competing '
      + 'acquisition was never injected and nothing was proved. If the reclaim stopped re-reading '
      + 'while holding its claim, that is the finding — do not delete this assertion. '
      + `payload=${JSON.stringify(payload)}`);
    assertExactlyOneHolder(payload, 'the reclaim claim is not exclusive to one reclaimer');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
