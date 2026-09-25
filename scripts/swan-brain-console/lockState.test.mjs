/**
 * lockState.test — what the OS says about a pid, and what is actually on disk.
 * @module scripts/swan-brain-console/lockState.test
 *
 * WHY THIS IS A SEPARATE SUITE
 * `attemptLock.mjs` split into observation (`lockState.mjs`) and ownership in round 16, and the
 * split was forced by Rule 4 — but the boundary is real rather than a line count, and the tests
 * separate for the same reason the code did: **a bug in observation produces a wrong answer; a bug
 * in ownership produces a race.** They should be able to fail independently.
 *
 * WHY THESE TESTS CANNOT LIVE IN `attemptLock.test.mjs`
 * Every assertion here is about an ERRNO, and the two dangerous ones cannot be produced on demand.
 * `process.kill(pid, 0)` answers `EPERM` only for a live pid owned by another user, and a transient
 * `EACCES`/`EIO` cannot be arranged at all from a suite. So the probe is a PARAMETER and every
 * answer is driven against a synthetic one — which is the only way a branch like this becomes
 * falsifiable. Round 16's mutation harness found the cost of not doing it: treating `EPERM` as
 * "dead" left every test in the sibling suite GREEN, and the direction it erred in was the
 * dangerous one, because "dead" authorizes reclaiming a lock that is very much alive.
 *
 * Run: node --test scripts/swan-brain-console/lockState.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  probeHolder, holderIsAlive, readLock, holderAgeMs, lockSize, DEFAULT_STALE_MS,
} from './lockState.mjs';

/** A throwaway directory holding a path the lock functions can be pointed at. */
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'lock-state-'));
  return { root, file: join(root, 'thing.json.lock'), cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** A probe that always throws the given errno. */
const throwing = (code) => () => {
  const e = new Error(`synthetic ${code}`);
  if (code !== null) e.code = code;
  throw e;
};

test('RED — ONLY ESRCH ESTABLISHES DEATH; every other failure is held (Astra L04)', () => {
  /*
   * THE FINDING. The predicate this replaces returned `false` for every errno except `EPERM`, so
   * `EACCES`, `EIO`, `EINVAL` and any throw with no `code` all read as "the holder is gone" — and
   * "gone" is what AUTHORIZES RECLAIMING A LOCK. A transient probe failure became a licence to
   * delete another process's live claim, silently. Two attempts on one resource is the race the
   * whole mechanism exists to close.
   *
   * The three verdicts are asserted separately rather than as a boolean pair, because the caller
   * takes three different actions: `dead` reclaims, `alive` refuses, `unknown` refuses AND REPORTS
   * that it could not tell. Collapsing `unknown` into either of the others is the bug.
   *
   * MUTATION: `return err.code !== 'EPERM'` for the successor case → the `EIO`/no-code assertions
   * go RED, and `unknown` never occurs.
   */
  assert.deepEqual(
    { v: probeHolder(1, throwing('ESRCH')).verdict },
    { v: 'dead' },
    'ESRCH means no such process — that is the ONE answer that authorizes a reclaim',
  );
  for (const code of ['EPERM', 'EACCES']) {
    assert.equal(probeHolder(1, throwing(code)).verdict, 'alive',
      `${code} means the pid EXISTS and is not ours — reading it as dead steals a live lock`);
  }
  for (const code of ['EIO', 'EINVAL', 'EWHATEVER', null]) {
    const probe = probeHolder(1, throwing(code));
    assert.equal(probe.verdict, 'unknown',
      `${code ?? 'a throw with no code'} is NOT death — we could not tell, and that must be said`);
    assert.match(probe.detail, new RegExp(code ?? 'no code'),
      'the probe result does not name the errno, so an operator cannot act on it');
  }
  assert.equal(probeHolder(1, () => {}).verdict, 'alive', 'a successful probe means alive');
  // And the real probe, so the default is the real call rather than a stub that was never checked.
  assert.equal(probeHolder(process.pid).verdict, 'alive', 'the real probe does not see this process');
});

test('RED — a non-positive pid is DEAD, not unknown: there is nothing to be uncertain about', () => {
  /*
   * `kill(0, 0)` signals the process GROUP and `kill(-1, 0)` signals everything the caller may
   * signal, so a non-positive pid is not a holder at all. Leaving it as `unknown` would make every
   * lock document with a missing or zeroed pid permanently unreclaimable — safe, but wedged, and
   * for the wrong reason: the state is decidable.
   *
   * MUTATION: return `unknown` for `pid <= 0`. RED.
   */
  for (const bad of [0, -1, null, undefined, '5', 1.5, NaN]) {
    assert.equal(probeHolder(bad, () => {}).verdict, 'dead',
      `${JSON.stringify(bad)} is not a pid and must not be treated as an indeterminate holder`);
  }
});

test('the boolean face is CONSERVATIVE — unknown counts as alive', () => {
  /*
   * The compatibility surface, and the direction it errs in. A stale lock is a loud, bounded
   * failure an operator can clear; a race is silent and produces a false PASS. So of the two wrong
   * answers available, this one must choose the recoverable one.
   *
   * MUTATION: make `holderIsAlive` return `probeHolder(...).verdict === 'alive'`. RED — an
   * unprobeable pid would read as reclaimable.
   */
  assert.equal(holderIsAlive(1, throwing('ESRCH')), false, 'ESRCH is dead');
  assert.equal(holderIsAlive(1, throwing('EPERM')), true, 'EPERM is alive');
  assert.equal(holderIsAlive(1, throwing('EIO')), true,
    'an unprobeable holder must count as ALIVE — the other answer authorizes a reclaim');
  assert.equal(holderIsAlive(process.pid), true, 'the real probe does not see this process');
});

test('an absent lock is null, and a corrupt one is malformed rather than absent', () => {
  /*
   * THE TWO ANSWERS MUST NOT COLLAPSE. `null` means "there is no lock, proceed". `malformed` means
   * "something is there and it is not a lock document" — which `attemptLock.mjs` REFUSES on, because
   * a file it cannot parse may belong to a process mid-write. Returning `null` for both would turn
   * an unreadable lock into a free resource, which is the race.
   *
   * MUTATION: return `null` from the catch in `readLock`. RED on the second assertion.
   */
  const { file, cleanup } = sandbox();
  assert.equal(readLock(file), null, 'an absent path is not a malformed lock');

  writeFileSync(file, 'not json at all');
  assert.deepEqual(readLock(file), { malformed: true }, 'unparseable content must be reported, not ignored');

  writeFileSync(file, 'null');
  assert.deepEqual(readLock(file), { malformed: true }, 'a JSON null is not a lock document');

  writeFileSync(file, '["a", "list"]');
  assert.deepEqual(readLock(file), { malformed: true }, 'an array is not a lock document');

  writeFileSync(file, JSON.stringify({ pid: 1, token: 't', startedAt: '2026-09-22T00:00:00Z' }));
  assert.equal(readLock(file).token, 't', 'a well-formed lock document was rejected');
  cleanup();
});

test('holderAgeMs is NULL for an unparseable timestamp, never 0', () => {
  /*
   * The distinction the caller depends on. `tryAcquire` treats a non-finite age as "not suspect",
   * so a lock document with no usable `startedAt` is never reclaimed on age — it falls through to
   * the liveness check instead. Returning `0` would make every such lock look brand new, which is
   * a decidable answer for the wrong reason, and it would flip a lock from "old, needs a look" to
   * "just taken" on the strength of a missing field.
   *
   * MUTATION: `return age || 0`. RED on the first two assertions.
   */
  const now = Date.parse('2026-09-22T12:00:00Z');
  assert.equal(holderAgeMs({ startedAt: 'nonsense' }, now), null, 'an unparseable stamp is not zero age');
  assert.equal(holderAgeMs({}, now), null, 'a missing stamp is not zero age');
  assert.equal(holderAgeMs(null, now), null, 'a missing document is not zero age');
  assert.equal(
    holderAgeMs({ startedAt: new Date(now - 60_000).toISOString() }, now), 60_000,
    'a real stamp was not measured',
  );
  assert.ok(DEFAULT_STALE_MS >= 60_000, 'a stale threshold under a minute would refuse live runs');
});

test('readLock and lockSize never throw, whatever is at the path', () => {
  /*
   * Both are called on paths an operator may have replaced with anything. `readLock` is used on the
   * acquisition path, where a throw would be an unhandled rejection rather than a refusal — the
   * difference between "the gate is busy" and "the gate crashed", which is the distinction the
   * whole exit-code vocabulary is built on.
   *
   * MUTATION: remove the try/catch. RED.
   */
  const { root, file, cleanup } = sandbox();
  assert.equal(lockSize(join(root, 'absent')), -1, 'an absent file must report -1 rather than throw');
  assert.equal(readLock(join(root, 'absent')), null, 'an absent file must report null rather than throw');
  // A DIRECTORY at the path: `statSync` succeeds, `readFileSync` throws — both must be survived.
  const dir = join(root, 'a-directory');
  mkdirSync(dir);
  assert.ok(lockSize(dir) >= 0, 'statSync on a directory should not throw here');
  assert.deepEqual(readLock(dir), { malformed: true }, 'reading a directory must be reported, not thrown');
  cleanup();
});
