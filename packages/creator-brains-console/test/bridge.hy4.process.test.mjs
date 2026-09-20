#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/bridge.hy4.process.test.mjs
 * PURPOSE: Regression tests for the two P1 process-lifecycle findings from the
 *          HY4 independent hostile review.
 * PART OF: Creator Brains Console (blueprint 06-test-plan.md)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THESE TWO FINDINGS SHARE A FILE, AND WHY IT IS NOT bridge.hy4.test.mjs.
 *
 * H1 and H2 are not route-surface defects — they are about the PROCESS. Both
 * describe the same failure end-state, which is why HY4 rated them P1 and why
 * they are grouped here:
 *
 *     the single-instance guard fails to keep one writer off the store, so two
 *     bridges serve `registry.json` and the second `setEnabled` silently
 *     discards the first. No error, no log line, just a lost update.
 *
 * Two different routes reach that state:
 *
 *   H1  the pid CLAIM was a check-then-act race. Two starters within the same
 *       millisecond both observe "absent", both write, and the loser's file
 *       names a process that is not the live bridge — so a later starter sees a
 *       dead pid, reclaims the slot, and runs CONCURRENTLY with the first.
 *       FIXED by making the claim an atomic exclusive create (`openSync('wx')`,
 *       i.e. O_CREAT|O_EXCL), so exactly one caller can win the create itself.
 *
 *   H2  a FAILED BIND left the pid file behind. One attempt on a taken port
 *       wrote a live pid, then threw — and every subsequent start refused until
 *       the operator deleted the file by hand. A single transient port conflict
 *       locked Sean out of his own console. FIXED by releasing the slot when
 *       `listen` rejects.
 *
 * The fix for H1 is subtle enough to deserve its own note: the exclusive create
 * alone is NOT sufficient, because a stale file (holder dead) must still be
 * reclaimable — otherwise one crash locks the console out permanently, which is
 * the very failure H2 is about. So `claimInstance` reads an existing file,
 * judges liveness, removes a stale one, and only then attempts the exclusive
 * create; losing THAT create means a concurrent claimant won legitimately and is
 * honoured rather than clobbered. Both halves are tested below.
 *
 * @module creator-brains-console/test/bridge.hy4.process
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';

import {
  startBridge, claimInstance, releaseInstance, pidPath, consoleDir,
} from '../server.mjs';
import { fixtureRoot, getJson } from './fixtures.mjs';

/* ── H1 · the pid claim is atomic ────────────────────────────────────────── */

test('HY4-H1: a claimant is refused rather than clobbering a live holder', () => {
  const r = fixtureRoot('hy4-race');
  mkdirSync(consoleDir(r), { recursive: true });
  rmSync(pidPath(r), { force: true });

  // Two claimants, distinguished only by the pid they record. The first must
  // win; the second must be REFUSED rather than overwriting the winner.
  const winner = process.pid;
  const loser = process.pid + 999_999;

  claimInstance(r, { pid: winner });

  // The loser's claim must consult the file and refuse — this is the behaviour
  // the old check-then-act version could violate by observing "absent" twice.
  assert.throws(
    () => claimInstance(r, { pid: loser }),
    /already running \(pid \d+\)/,
    'the second claimant must be refused, not silently overwrite the winner',
  );

  // And the file still names the winner — a clobber would be the lost-update bug.
  assert.equal(Number(readFileSync(pidPath(r), 'utf8').trim()), winner);

  releaseInstance(r, { pid: winner });
});

test('HY4-H1: the same pid may re-claim (idempotent restart, not a lockout)', () => {
  const r = fixtureRoot('hy4-excl');
  mkdirSync(consoleDir(r), { recursive: true });
  rmSync(pidPath(r), { force: true });
  claimInstance(r, { pid: process.pid });
  // The guard's job is to stop a DIFFERENT live bridge, not to lock out its own
  // process — a restart within one process would otherwise be impossible.
  assert.doesNotThrow(() => claimInstance(r, { pid: process.pid }));
  releaseInstance(r, { pid: process.pid });
});

test('HY4-H1: a STALE pid file is reclaimed, so one crash is not a permanent lockout', () => {
  const r = fixtureRoot('hy4-stale');
  mkdirSync(consoleDir(r), { recursive: true });
  // A pid that cannot exist: far above any real process id on Windows.
  writeFileSync(pidPath(r), '999999999', 'utf8');

  assert.equal(claimInstance(r, { pid: process.pid }), process.pid,
    'a dead holder must be reclaimed, or a crash locks Sean out with no recourse');
  assert.equal(Number(readFileSync(pidPath(r), 'utf8').trim()), process.pid);

  releaseInstance(r, { pid: process.pid });
});

test('HY4-H1: releasing does not delete a SUCCESSOR\'s pid file', () => {
  // The ownership check in `releaseInstance` is what stops a slow shutdown from
  // unguarding a fresh bridge that started in the meantime.
  const r = fixtureRoot('hy4-release');
  mkdirSync(consoleDir(r), { recursive: true });
  rmSync(pidPath(r), { force: true });

  const mine = process.pid;
  const theirs = process.pid + 1;
  claimInstance(r, { pid: theirs }); // a successor owns the slot now

  releaseInstance(r, { pid: mine }); // our shutdown must be a no-op
  assert.ok(existsSync(pidPath(r)), "a non-owner's release must not remove the successor's file");
  assert.equal(Number(readFileSync(pidPath(r), 'utf8').trim()), theirs);

  releaseInstance(r, { pid: theirs });
});

/* ── H2 · a failed listen must not leave a blocking pid file ─────────────── */

test('HY4-H2: a failed bind releases the slot instead of blocking every future start', async () => {
  const r = fixtureRoot('hy4-eaddrinuse');
  mkdirSync(consoleDir(r), { recursive: true });

  // Occupy a port, then ask the bridge for the same one.
  const squatter = createServer(() => {});
  await new Promise((res) => squatter.listen(0, '127.0.0.1', res));
  const taken = squatter.address().port;

  try {
    await assert.rejects(
      startBridge({ r, port: taken, open: false, log: () => {} }),
      (err) => err.code === 'EADDRINUSE',
      'binding a taken port must reject, not hang',
    );

    // THE ACTUAL BUG: the pid file must NOT survive the failure. If it does, a
    // live pid in that file refuses every later start until the process exits —
    // and the process IS this one, which is still running.
    assert.equal(
      existsSync(pidPath(r)),
      false,
      'a failed bind must release the pid slot, or one failure locks the console out permanently',
    );

    // And it must release the slot for THIS process specifically — the failure
    // path must not have left our own pid behind either.
    assert.doesNotThrow(() => claimInstance(r, { pid: process.pid }),
      'the slot must be claimable again immediately after a failed bind');
    releaseInstance(r, { pid: process.pid });
  } finally {
    await new Promise((res) => squatter.close(res));
  }
});

test('HY4-H2: a later start on a free port succeeds after a failed bind', async () => {
  const r = fixtureRoot('hy4-eaddrinuse-2');
  mkdirSync(consoleDir(r), { recursive: true });

  const squatter = createServer(() => {});
  await new Promise((res) => squatter.listen(0, '127.0.0.1', res));
  const taken = squatter.address().port;

  await assert.rejects(startBridge({ r, port: taken, open: false, log: () => {} }));
  await new Promise((res) => squatter.close(res));

  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  try {
    const { status } = await getJson(b.url, '/api/canary');
    assert.equal(status, 200, 'the slot must be reusable after a failed bind');
  } finally { b.shutdown(); }
});

test('HY4-H2: shutdown releases the slot so the next console can start', async () => {
  const r = fixtureRoot('hy4-shutdown');
  const b = await startBridge({ r, port: 0, open: false, log: () => {} });
  assert.ok(existsSync(pidPath(r)), 'a running bridge must hold the slot');
  b.shutdown();
  assert.equal(existsSync(pidPath(r)), false, 'a clean shutdown must release the slot');
});
