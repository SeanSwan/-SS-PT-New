#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/lock-reclaim-race.test.mjs
 * PURPOSE: Two REAL reclaimers racing on one dead owner's lock — exactly one
 *          may end up holding the store (Astra round 1, P1c).
 * PART OF: Creator Brains — SS-PT acquisition engine
 * ADDED: 2026-09-21 | SPLIT from concurrency.test.mjs 2026-09-21 (rule 4)
 * ============================================================================
 *
 * WHY THIS IS ITS OWN FILE (and not another case in concurrency.test.mjs):
 *
 *   It is the only case in this family that needs a BARRIER. Every other
 *   concurrency case can be satisfied by starting two processes and letting the
 *   scheduler do what it does; this one is about a window that closes in
 *   microseconds, so both children are held until each has taken its stale read.
 *   That is a different test technique from its neighbours, and it pushed the
 *   parent file over rule 4's 300-line cap — so it moved rather than the cap
 *   moving. `concurrency.test.mjs` keeps the HR14 family; this file owns the race.
 *
 * THE DEFECT IT PINS (measured, not argued):
 *
 *   Reclaiming a dead owner's lock used to be `readLock` → `unlinkSync`. The
 *   comment on that unlink called losing the race benign — "someone else got
 *   there". It was not. Two reclaimers that both read the SAME dead holder could
 *   both delete: B unlinks the corpse and acquires, then A unlinks **B's LIVE
 *   lock** using its stale observation and acquires too. Two holders on one
 *   store — the exact failure the lock exists to prevent.
 *
 *   Measured against the unlink implementation, this test caught it as
 *   `[{"who":"A","ok":true},{"who":"B","ok":true}]` — both holding.
 *
 * WHAT THIS TEST DOES **NOT** ESTABLISH (corrected 2026-09-22, Astra R1 Q1).
 *
 *   This header used to end the paragraph above with "Against the rename fix it
 *   is 10 of 10 green. The fix has exactly one winner per race because
 *   `renameSync` fails ENOENT for everyone but the winner." That proof does not
 *   hold, and ten green trials could not corroborate it.
 *
 *   Both reclaimers here are released by ONE barrier, so their removals land
 *   BEFORE either `attempt()` recreates the path — the BENIGN ordering. The
 *   ordering that breaks exclusion is a LATER one: the winner removes, its
 *   `attempt()` succeeds, and only THEN does the loser's removal run — against a
 *   path that exists again and now holds the winner's LIVE lock, which it takes
 *   away. A barrier that releases both at once cannot produce that, so the green
 *   was a fact about the barrier, not about the fix.
 *
 *   That ordering is forced deterministically in `lock-reclaim-ordering.test.mjs`
 *   (E3a: stale observation, E3b: the exclusion claim), which is where the
 *   property is actually pinned. This file keeps what it is uniquely good for —
 *   two GENUINE concurrent processes rather than an injected interleaving — and
 *   it is STRESS-class under the deterministic/stress split in the engine
 *   handoff, not a deterministic gate.
 *
 * RUN: node --test scripts/creator-brains/test/lock-reclaim-race.test.mjs
 * @module creator-brains/test/lock-reclaim-race
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { tempRoot } from './helpers.mjs';
import { ensureStore } from '../lib/store.mjs';
import { lockStatus } from '../lib/lock.mjs';

const LIB = fileURLToPath(new URL('../lib/', import.meta.url));
const LOCK_URL = JSON.stringify(pathToFileURL(join(LIB, 'lock.mjs')).href);

/** A minimal store. This test is about the LOCK, so the seeded content is irrelevant. */
function seedStore(tag) {
  const r = tempRoot(`cb-${tag}`);
  ensureStore(r);
  return r;
}

/** Run a snippet in a real child process; the file is written so quoting is not under test. */
function runChild(source, { env = {}, timeoutMs = 30_000 } = {}) {
  const dir = tempRoot('cb-child');
  const file = join(dir, 'child.mjs');
  writeFileSync(file, source, 'utf-8');
  try {
    const stdout = execFileSync(process.execPath, [file], {
      encoding: 'utf-8',
      timeout: timeoutMs,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout || ''), stderr: String(e.stderr || '') };
  }
}

/** Poll until `cond()` or the deadline; returns whether it became true. */
async function until(cond, ms) {
  const deadline = Date.now() + ms;
  while (!cond() && Date.now() < deadline) await new Promise((res) => setTimeout(res, 25));
  return cond();
}

test('HR14g TWO reclaimers on one dead lock — exactly one may end up holding it', async () => {
  const r = seedStore('hr14-two-reclaimers');

  // A dead owner's lock: a real child takes it and exits WITHOUT releasing, which is
  // exactly what a killed process leaves behind.
  const orphan = runChild(`
    import { acquireLock } from ${LOCK_URL};
    const lock = acquireLock(process.env.CB_ROOT, { runId: 'orphan' });
    process.stdout.write(lock.ok ? String(lock.holder.pid) : 'FAIL');
    // no release(): simulate a kill
  `, { env: { CB_ROOT: r } });
  assert.equal(orphan.code, 0, `orphan child failed: ${orphan.stderr}`);
  const st = lockStatus(r);
  assert.equal(st.held, true, 'precondition: the dead lock is on disk');
  assert.equal(st.alive, false, 'precondition: its owner is provably dead');

  // Each reclaimer reads the stale holder, announces it, waits at the barrier, then
  // reclaims. The winner HOLDS and announces that too, so the loser's verdict is
  // taken while the store is provably still held. (An earlier draft released
  // immediately, which counted two SEQUENTIAL acquisitions as a double-hold — a test
  // defect, not a code one. The property is about overlap, so the winner must wait.)
  const reclaimer = `
    import { existsSync, writeFileSync } from 'node:fs';
    import { acquireLock, lockStatus } from ${LOCK_URL};
    lockStatus(process.env.CB_ROOT);          // the STALE observation, taken before the barrier
    writeFileSync(process.env.CB_READY, '1'); // announce that we hold it
    while (!existsSync(process.env.CB_GO)) { await new Promise((res) => setTimeout(res, 5)); }
    const t = acquireLock(process.env.CB_ROOT, { runId: process.env.CB_WHO });
    if (t.ok) writeFileSync(process.env.CB_HELD, '1');
    process.stdout.write(JSON.stringify({ who: process.env.CB_WHO, pid: process.pid, ok: !!t.ok, reason: t.reason || null, holderPid: (t.holder && t.holder.pid) || null }));
    if (t.ok) {
      while (!existsSync(process.env.CB_DONE)) { await new Promise((res) => setTimeout(res, 5)); }
      t.release();
    }
  `;
  const dir = tempRoot('cb-reclaim');
  const file = join(dir, 'reclaimer.mjs');
  writeFileSync(file, reclaimer, 'utf-8');

  const go = join(r, '.go');
  const done = join(r, '.done');
  const held = { A: join(r, '.heldA'), B: join(r, '.heldB') };
  const ready = { A: join(r, '.readyA'), B: join(r, '.readyB') };
  const spawnReclaimer = (who) => new Promise((resolve) => {
    const p = spawn(process.execPath, [file], {
      env: {
        ...process.env, CB_ROOT: r, CB_WHO: who, CB_READY: ready[who], CB_HELD: held[who], CB_GO: go, CB_DONE: done,
      },
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.on('close', () => resolve(out.trim()));
    p.on('error', () => resolve('SPAWN_ERROR'));
  });

  const a = spawnReclaimer('A');
  const b = spawnReclaimer('B');
  // Both must have taken their stale read before either may proceed. This is what
  // forces the interleaving rather than hoping for it.
  assert.ok(await until(() => existsSync(ready.A) && existsSync(ready.B), 10_000),
    'both reclaimers reached the barrier');
  writeFileSync(go, '1');

  // Let a winner announce, then release everyone. Asserting before this point would
  // race the winner's own release.
  await until(() => existsSync(held.A) || existsSync(held.B), 10_000);
  writeFileSync(done, '1');

  const results = await Promise.all([a, b]);
  const parsed = results.map((s) => { try { return JSON.parse(s); } catch { return { raw: s }; } });
  const winners = parsed.filter((x) => x.ok === true);
  assert.equal(winners.length, 1,
    `EXACTLY ONE reclaimer may hold the store, got ${JSON.stringify(parsed)} — two means both deleted and both acquired. `
    + `orphanPid=${orphan.stdout.trim()} (its liveness was false when asserted at :120). `
    + 'ZERO winners with reason lock_held means a pid that was DEAD became ALIVE between the two observations — '
    + 'compare `holderPid` against each `pid` above: a match is PID REUSE by a reclaimer itself, which is an '
    + 'environment artifact of this test (the engine is refusing, which is the SAFE direction), not a lock defect.');
  assert.equal(lockStatus(r).held, false, 'and the store is free once the winner releases');
});
