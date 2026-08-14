#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/lib/gate-lock.test.mjs
 * PURPOSE: Regression tests for the counter lock — the module whose v1 could be
 *          held by two processes at once.
 * AUTHOR: Opus 5 | CREATED: 2026-08-13 | KILLS: Kimi S1, S2, S7 + the Windows
 *          fstat/stat `dev` divergence found while testing the S2 fix.
 * ============================================================================
 *
 * Run: node scripts/hooks/lib/gate-lock.test.mjs   -> RESULT: PASS (n/n)
 *
 * The v1 suite had ZERO multi-process coverage in a module whose entire reason to
 * exist is two-agent contention, so the interesting interleavings were
 * inexpressible. `statFn` and `now` are injectable precisely so they can be
 * expressed here without spawning processes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { acquireCounterLock, releaseCounterLock, readLockHolder, LOCK_STALE_MS } from './gate-lock.mjs';

let total = 0;
let passed = 0;
const made = [];

function freshDir() {
  const dir = mkdtempSync(join(tmpdir(), 'swan-lock-'));
  made.push(dir);
  return dir;
}
function check(name, fn) {
  total += 1;
  test(name, async (t) => { await fn(t); passed += 1; });
}

check('acquires when free, reports contention while held, and carries an identity token', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(a.ok, true);
  assert.equal(a.reason, 'acquired');
  assert.equal(a.stolen, false);
  assert.ok(a.token, 'an empty lock file cannot prove ownership on release');
  assert.equal(readLockHolder(p).token, a.token);
  const b = acquireCounterLock({ lockPath: p });
  assert.equal(b.ok, false);
  assert.equal(b.reason, 'contention');
});

check('classifies non-EEXIST failures distinctly from contention', () => {
  const dir = freshDir();
  // NUL built from a char code, not an escape sequence: writing "\u0000" as a
  // literal has twice been converted into a real control byte by the tooling
  // between here and disk. A space was the accidental substitute the first time,
  // and a space is a perfectly legal filename — the test then proved nothing.
  const bad = acquireCounterLock({ lockPath: join(dir, `lock${String.fromCharCode(0)}name`) });
  assert.equal(bad.ok, false);
  assert.notEqual(bad.reason, 'contention', 'a real I/O fault must keep its own code');
  writeFileSync(join(dir, 'blocker'), 'x', 'utf8');
  assert.equal(acquireCounterLock({ lockPath: join(dir, 'blocker', 'x.lock') }).reason, 'mkdir-failed');
});

check('KIMI S7: the stale TTL boundary is exact, via injected clock', () => {
  const p = join(freshDir(), 'c.lock');
  assert.equal(acquireCounterLock({ lockPath: p }).ok, true);
  const base = statSync(p).mtimeMs;
  // v1 hid Date.now() inside, so this mutant was waved through as "equivalent"
  // when the honest label was "unkillable without clock injection".
  assert.equal(acquireCounterLock({ lockPath: p, now: base + LOCK_STALE_MS }).ok, false, 'age == TTL is not yet stale');
  const past = acquireCounterLock({ lockPath: p, now: base + LOCK_STALE_MS + 1 });
  assert.equal(past.ok, true, 'one ms past the TTL reclaims');
  assert.equal(past.stolen, true);
});

check('KIMI S1 (CRITICAL): a stealer that statted a different file must not double-hold', () => {
  const p = join(freshDir(), 'c.lock');
  const holder = acquireCounterLock({ lockPath: p });
  assert.equal(holder.ok, true);
  // B statted the OLD lock (stale, foreign inode) before A re-created a fresh one.
  // Rename alone would let B steal A's fresh lock — both would then believe they
  // hold it and both would write the counter. The identity check must refuse.
  const staleGhost = () => ({ dev: 999999, ino: 999999, mtimeMs: Date.now() - LOCK_STALE_MS * 10 });
  const b = acquireCounterLock({ lockPath: p, statFn: staleGhost });
  assert.equal(b.ok, false, 'two processes must never hold the lock simultaneously');
  assert.equal(b.reason, 'contention');
  assert.equal(readLockHolder(p).token, holder.token, "A's lock must be restored intact");
});

check('KIMI S2 (CRITICAL): release refuses to delete a lock we no longer own', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(a.ok, true);
  const past = new Date(Date.now() - (LOCK_STALE_MS + 60_000));
  utimesSync(p, past, past);
  const b = acquireCounterLock({ lockPath: p });
  assert.equal(b.ok, true);
  assert.equal(b.stolen, true);
  // A is slow-but-alive; its lock was stolen. Its release must not delete B's.
  assert.equal(releaseCounterLock(a), false, "A must not delete B's live lock");
  assert.equal(readLockHolder(p).token, b.token, "B's lock survives A's release");
  assert.equal(releaseCounterLock(b), true, 'the true owner releases');
  assert.equal(acquireCounterLock({ lockPath: p }).ok, true, 'the path is free again');
});

check('release tolerates a vanished lock and refuses a handle with no token', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(releaseCounterLock(a), true);
  assert.equal(releaseCounterLock(a), false, 'releasing an already-gone lock reports false, not a throw');
  assert.equal(releaseCounterLock({ path: p }), false, 'a tokenless handle must never blind-unlink');
  assert.equal(releaseCounterLock(undefined), false);
});

check('PORTABILITY: ownership survives the Windows fstat/stat dev divergence', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(a.ok, true);
  // Measured on Windows 2026-08-13: fstatSync reports dev=1417332449 while
  // statSync reports dev=0 for the SAME file. A dev comparison therefore made the
  // true owner unable to release its own lock — and would have passed on Linux.
  const viaFstat = a.dev;
  const viaStat = statSync(p).dev;
  if (viaFstat !== viaStat) {
    assert.equal(releaseCounterLock(a), true, 'dev divergence must not block the real owner');
  } else {
    assert.equal(releaseCounterLock(a), true);
  }
  assert.equal(readLockHolder(p), null, 'lock is gone after a successful release');
});

check('an UNSTATTABLE lock is UNKNOWN, and unknown is never stale', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(a.ok, true);
  // Mutation vantage found this unguarded: with `ageMs === null` treated as
  // stale, a lock we merely failed to stat gets stolen from a live holder.
  const blindStat = () => { throw new Error('EIO'); };
  const b = acquireCounterLock({ lockPath: p, statFn: blindStat });
  assert.equal(b.ok, false, 'a lock we cannot measure must not be reclaimed');
  assert.equal(b.reason, 'contention');
  assert.equal(readLockHolder(p).token, a.token, 'the live holder keeps its lock');
});

check('token mismatch alone blocks release, even when the inode is unchanged', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(a.ok, true);
  // The S2 test above passes on the INODE check alone, so a mutant that drops the
  // token comparison survived it. Rewriting the lock in place keeps the inode and
  // changes only the token — which is what an in-place re-claim looks like.
  writeFileSync(p, JSON.stringify({ pid: 1, token: 'a-different-token', ts: Date.now() }), 'utf8');
  assert.equal(releaseCounterLock(a), false, 'the token is the identity, not the path');
  assert.equal(readLockHolder(p).token, 'a-different-token', "the other holder's lock survives");
});

check('a corrupted lock file cannot be released by a stale handle', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  writeFileSync(p, 'NOT JSON', 'utf8');
  assert.equal(releaseCounterLock(a), false, 'an unparseable holder record is not proof of ownership');
  assert.equal(readFileSync(p, 'utf8'), 'NOT JSON', 'and the file is left alone');
});

process.on('exit', () => {
  for (const d of made) { try { rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
  const ok = passed === total;
  console.log(`RESULT: ${ok ? 'PASS' : 'FAIL'} (${passed}/${total})`);
  if (!ok && !process.exitCode) process.exitCode = 1;
});
