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

import { spawn } from 'node:child_process';

import { acquireCounterLock, releaseCounterLock, readLockHolder, LOCK_STALE_MS, stillOwnsLock } from './gate-lock.mjs';

const lockModuleUrl = new URL('./gate-lock.mjs', import.meta.url).href;

let total = 0;
let passed = 0;
const made = [];

function freshDir() {
  const dir = mkdtempSync(join(tmpdir(), 'swan-lock-'));
  made.push(dir);
  return dir;
}
function lockPath() { return join(freshDir(), 'c.lock'); }
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

/* ==========================================================================
 * GLM-5.3 hostile review (2026-08-16).
 * ========================================================================== */

check('GLM Q10b (HIGH): the bare-path release form is GONE, not merely discouraged', () => {
  const p = lockPath();
  const victim = acquireCounterLock({ lockPath: p });
  assert.equal(victim.ok, true);
  // Before the fix: releaseCounterLock(p) unlinked a LIVE holder's lock from any
  // caller that could import the module, and returned true. Verified by probe.
  assert.throws(() => releaseCounterLock(p), TypeError, 'a bare path must be refused loudly');
  assert.equal(stillOwnsLock(victim), true, "the honest holder still holds it");
  assert.equal(releaseCounterLock(victim), true);
});

check('GLM Q6: stillOwnsLock catches the seconds-wide steal a long section invites', () => {
  const p = lockPath();
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(a.ok, true);
  assert.equal(stillOwnsLock(a), true, 'the holder owns it immediately after acquiring');

  // A critical section outruns the TTL; B legitimately reclaims. No race is
  // needed — this is the ordinary case for a review that runs over two minutes.
  // Staleness is judged against the lock file real mtime, so the simulated
  // clock must be an offset from the real one, not an absolute epoch value.
  const b = acquireCounterLock({ lockPath: p, now: Date.now() + LOCK_STALE_MS + 1000 });
  assert.equal(b.ok, true);
  assert.equal(b.stolen, true);

  // A now finishes and is about to write the protected state. Before this
  // helper existed there was no way for A to discover it had been displaced.
  assert.equal(stillOwnsLock(a), false, 'A must be able to learn it no longer holds the lock');
  assert.equal(stillOwnsLock(b), true);
  assert.equal(releaseCounterLock(a), false, 'and A still must not delete B lock');
  assert.equal(releaseCounterLock(b), true);
});

check('GLM Q6: stillOwnsLock is false for a vanished lock and a tokenless handle', () => {
  const p = lockPath();
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(releaseCounterLock(a), true);
  assert.equal(stillOwnsLock(a), false, 'a released lock is not owned');
  assert.equal(stillOwnsLock({ path: p }), false, 'no token, no ownership');
  assert.equal(stillOwnsLock(undefined), false);
  assert.equal(stillOwnsLock(null), false);
});

check('GLM Q9: TWO REAL PROCESSES contend for the counter and no increment is lost', async () => {
  // The gap GLM called the one that worries it most: not one multi-process test
  // in a module whose reason to exist is two-process mutual exclusion. Every
  // prior test faked the second party with an injected stat.
  const dir = freshDir();
  const p = join(dir, 'storm.lock');
  const counter = join(dir, 'storm-counter.json');
  writeFileSync(counter, JSON.stringify({ n: 0 }), 'utf8');

  const worker = join(dir, 'worker.mjs');
  writeFileSync(worker, [
    "import { readFileSync, writeFileSync } from 'node:fs';",
    "import { acquireCounterLock, releaseCounterLock, stillOwnsLock } from " + JSON.stringify(lockModuleUrl) + ";",
    "const [lockPath, counterPath, iters] = process.argv.slice(2);",
    "let done = 0;",
    "for (let i = 0; i < Number(iters); i += 1) {",
    "  let h = null;",
    "  for (let attempt = 0; attempt < 20000 && !h; attempt += 1) {",
    "    const r = acquireCounterLock({ lockPath });",
    "    if (r.ok) { h = r; break; }",
    "  }",
    "  if (!h) continue;",
    "  const cur = JSON.parse(readFileSync(counterPath, 'utf8'));",
    "  cur.n += 1;",
    "  if (stillOwnsLock(h)) { writeFileSync(counterPath, JSON.stringify(cur), 'utf8'); done += 1; }",
    "  releaseCounterLock(h);",
    "}",
    "process.stdout.write(String(done));",
  ].join('\n'), 'utf8');

  const ITER = 100;
  const run = (id) => new Promise((resolve) => {
    const cp = spawn(process.execPath, [worker, p, counter, String(ITER)], { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    cp.stdout.on('data', (d) => { out += d; });
    cp.on('close', () => resolve(Number(out || 0)));
  });

  const [d1, d2] = await Promise.all([run(1), run(2)]);
  const final = JSON.parse(readFileSync(counter, 'utf8')).n;
  // The invariant: the counter equals the number of increments actually
  // committed under the lock. A lost update shows up as final < d1 + d2.
  assert.equal(final, d1 + d2, 'two real processes must not lose an increment (' + d1 + '+' + d2 + ' vs ' + final + ')');
  assert.ok(final > 0, 'the storm must actually have done work');
});

check('stillOwnsLock rests on the TOKEN, not the inode (mutation-found gap)', () => {
  const p = join(freshDir(), 'c.lock');
  const a = acquireCounterLock({ lockPath: p });
  assert.equal(stillOwnsLock(a), true);
  // Every other stillOwnsLock assertion is satisfied by the inode check alone, so
  // a mutant that made the token comparison `return true` SURVIVED the suite.
  // Rewriting in place keeps the inode and changes only the token.
  writeFileSync(p, JSON.stringify({ pid: 1, token: 'someone-elses-token', ts: Date.now() }), 'utf8');
  assert.equal(stillOwnsLock(a), false, 'an in-place re-claim must revoke ownership');
  // And a corrupt body is not ownership either.
  writeFileSync(p, 'not json', 'utf8');
  assert.equal(stillOwnsLock(a), false);
});

process.on('exit', () => {
  for (const d of made) { try { rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
  const ok = passed === total;
  console.log(`RESULT: ${ok ? 'PASS' : 'FAIL'} (${passed}/${total})`);
  if (!ok && !process.exitCode) process.exitCode = 1;
});
