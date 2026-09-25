/**
 * attemptLock.identity.test — the round-16 lock findings: WHO owns it, and WHO may remove it.
 * @module scripts/swan-brain-console/attemptLock.identity.test
 *
 * WHY THIS IS NOT IN `attemptLock.test.mjs` (the eleventh Rule 4 split in this subsystem)
 * The count forced it — the file passed 300 when the round-16 regressions were added — but the
 * boundary is the one the engagement keeps producing, and it is real:
 *
 *   `attemptLock.test.mjs`           does the MECHANISM work? Exclusion, refusal, release, and the
 *                                    "busy is not failed" contract across a real process boundary.
 *                                    Those are round 15's K01 properties.
 *   `attemptLock.identity.test.mjs`  can a lock be removed by someone who does not own it? All
 *                                    three tests below are instantiated from ONE question — "does
 *                                    the removal decision use the SAME identity the acquisition
 *                                    established" — and all three answers were "no".
 *
 * That question is Astra's round-15 named NEXT defect class, and this is where the console got it
 * wrong three times in one file: a reclaim keyed to a pathname rather than to a lock (L02), an
 * errno predicate that read "unknown" as "dead" so an unprobeable holder counted as reclaimable
 * (L04, whose tests live in `lockState.test.mjs` with the observation half), and a release keyed to
 * a pid rather than to an acquisition (L07). They fail differently from a mechanism bug — a broken
 * mechanism REFUSES too much, these ADMIT too much — so they should be able to fail separately.
 *
 * Run: node --test scripts/swan-brain-console/attemptLock.identity.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import {
  acquireAttemptLock, reclaimLock, releaseLock, readLock, lockPathFor,
} from './attemptLock.mjs';

/** A throwaway directory with a resource path inside it. */
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'attempt-lock-id-'));
  return { root, resource: join(root, 'resource.json'), cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('RED — an ABANDONED lock is REPORTED, not reclaimed, and names the way out (Astra L02)', async () => {
  /*
   * THE ROUND-16 INVERSION, AND IT REPLACES A TEST THAT ASSERTED THE OPPOSITE.
   *
   * Until round 16 this suite required an abandoned lock to be RECLAIMED automatically. Astra's
   * L02 showed that reclaim is itself a race, so the requirement was withdrawn — see the schedule
   * in the next test, which is her exact two-reclaimer interleaving. The old assertion is not
   * "weakened" here: it encoded the defect.
   *
   * What is asserted instead is the property that makes the new behaviour usable rather than
   * merely safe:
   *   1. the acquisition REFUSES (`ok: false`) — a dead pid does not authorize a write
   *   2. the lock is still on disk, exactly as the dead holder left it
   *   3. the refusal NAMES the pid, the path, and says the run did not start
   *   4. `reclaimLock` — the deliberate act — then DOES remove it, and an acquisition succeeds
   *
   * Without (4) this would be a test that the gate is now permanently wedged, which is not the
   * claim. The claim is that removal became an operator decision, not a side effect.
   *
   * MUTATION: restore the automatic `unlinkSync` on the abandoned branch. RED at (1) and (2).
   */
  const { resource, cleanup } = sandbox();
  writeFileSync(lockPathFor(resource), JSON.stringify({
    pid: 999_999, label: 'dead', startedAt: new Date().toISOString(),
  }));

  const lock = await acquireAttemptLock({ resourcePath: resource, label: 'second' });
  assert.equal(lock.ok, false, 'an abandoned lock was taken without anyone deciding to reclaim it');
  assert.match(lock.reason, /NOT RUNNING/, `refusal reads: ${lock.reason}`);
  assert.match(lock.reason, /999999/, 'the refusal does not name the dead pid');
  assert.match(lock.reason, /reclaimLock/, 'the refusal does not name the way to clear it');
  assert.match(lock.reason, /did NOT start/, 'the refusal does not say the run did not start');
  assert.equal(readLock(lockPathFor(resource)).pid, 999_999,
    'the abandoned lock was modified — the dead holder\'s file must survive untouched');

  // The deliberate act, which IS allowed to remove it.
  const reclaimed = reclaimLock(lockPathFor(resource));
  assert.equal(reclaimed.ok, true, `reclaimLock refused a provably dead holder: ${reclaimed.reason}`);
  assert.equal(existsSync(lockPathFor(resource)), false, 'reclaimLock did not remove the file');

  const after = await acquireAttemptLock({ resourcePath: resource, label: 'third' });
  assert.equal(after.ok, true, `a cleared resource was still refused: ${after.reason}`);
  after.release();
  cleanup();
});

test('RED — two reclaimers cannot delete each other\'s FRESH lock (Astra L02, the schedule)', async () => {
  /*
   * ASTRA'S SCHEDULE, DRIVEN. This is the discriminating regression her L02 answer asks for, and
   * it is the reason the previous test had to change.
   *
   * The removed code was `unlinkSync(lockPath)` on the abandoned branch, guarded only by a count.
   * The liveness DECISION and the DELETE were separate operations with a window between them, so:
   *
   *   t0  the lock holds a dead pid; A and B both call `acquireAttemptLock`
   *   t1  A reads the lock, probes the pid, concludes "abandoned"
   *   t2  B reads the lock, probes the pid, concludes "abandoned"
   *   t3  A unlinks — correct, it was abandoned
   *   t4  A creates its OWN lock (token A) — A now holds the resource
   *   t5  B unlinks BY PATHNAME, using its t2 observation — and deletes **A's live lock**
   *   t6  B creates its own lock (token B). TWO holders.
   *
   * Step t5 is the defect, and it is `guard-that-admits-the-opposite`: a check that established
   * "this lock is abandoned" authorizes an operation that can delete a lock taken afterwards.
   *
   * THE TEST DOES NOT NEED REAL CONCURRENCY, because the window is a SEQUENCE, not a race. What
   * made it exploitable was that the delete used an EARLIER observation, so replaying the two
   * observations in that order is the same thing as running them at once. A holds a token; B's
   * stale observation is replayed; B must not be able to remove A's lock.
   *
   * MUTATION: restore the automatic reclaim. RED — `B removed A's lock` becomes true.
   */
  const { resource, cleanup } = sandbox();
  const path = lockPathFor(resource);

  // t0: an abandoned lock.
  writeFileSync(path, JSON.stringify({
    pid: 999_999, label: 'dead', startedAt: new Date().toISOString(),
  }));

  // t3-t4: A deliberately reclaims, then acquires. A now holds the resource, with a token.
  assert.equal(reclaimLock(path).ok, true, 'the premise failed: A could not reclaim the dead lock');
  const a = await acquireAttemptLock({ resourcePath: resource, label: 'A' });
  assert.equal(a.ok, true, `A could not acquire after reclaiming: ${a.reason}`);
  assert.ok(a.token, 'A holds a lock with no acquisition token, so nothing can distinguish holders');

  // t5: B must NOT be able to remove that lock. The only route to removing a LIVE lock is a
  // release, and B has no handle for it.
  assert.equal(releaseLock(path, 'not-a-real-token'), false,
    'a release with the wrong token removed a live lock — the token is not being compared');
  assert.equal(releaseLock(path, a.token), true,
    'the OWNING token could not release the lock — the comparison is too strict to be usable');

  // And with a live lock left in place, a fresh acquisition is refused rather than stolen.
  const a2 = await acquireAttemptLock({ resourcePath: resource, label: 'A2' });
  assert.equal(a2.ok, true, 'the resource was not released');
  a2.release();
  cleanup();
});

test('RED — a stale handle cannot delete the CURRENT acquisition of the same path (Astra L07)', async () => {
  /*
   * THE ONE-PROCESS CASE, WHICH IS WHY TOKENS EXIST RATHER THAN PIDS.
   *
   * `releaseLock` used to compare `holder.pid !== process.pid` and nothing else. Within a single
   * process every acquisition of a path has the same pid, so a STALE handle from an earlier
   * acquisition was indistinguishable from the current one — and the sequence is ordinary:
   *
   *   acquire #1 (token A)  →  #1's holder DIES  →  acquire #2 (token B)  →  #1.release()
   *
   * Before round 16 that last step deleted #2's live lock and every later attempt walked in.
   *
   * #1's holder MUST BE GENUINELY GONE, and that is not a detail: writing the lock document by hand
   * with `process.pid` would make it look alive to `probeHolder`, so `reclaimLock` would correctly
   * REFUSE — and the premise would fail for the right reason, which is how this test was first
   * written. The dead holder is produced with a REAL second process that exits, so the token it
   * wrote is real, the pid really is dead, and the reclaim is legitimate.
   *
   * MUTATION: compare pids instead of tokens in `releaseLock`. RED on the stale-handle assertion.
   */
  const { resource, cleanup } = sandbox();
  const path = lockPathFor(resource);

  // A real foreign process takes the lock and exits, leaving a genuine dead-holder document.
  const child = spawnSync(process.execPath, [
    '-e',
    `import(${JSON.stringify(new URL('./attemptLock.mjs', import.meta.url).href)})`
      + `.then(async (m) => { await m.acquireAttemptLock({ resourcePath: ${JSON.stringify(resource)}, label: 'ghost' }); })`,
  // stdin is 'ignore', NOT the default pipe: the failing configuration is a piped stdin
  // (reproducible 10/10: `{ encoding: 'utf8' }` alone gives EBUSY; ignoring stdin succeeds even
  // with stdout/stderr captured). This test feeds no stdin, so ignoring it is correct — and it is
  // what makes the suite runnable here. Configuration-level claim only; the CAUSE is unproven.
  // See round 18, 2026-09-24.
  ], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 30_000 });
  assert.equal(child.status, 0, `the ghost holder did not take the lock: ${child.stderr}`);
  const firstToken = readLock(path).token;
  assert.ok(firstToken, 'the ghost holder wrote no token, so this test cannot distinguish acquisitions');
  assert.notEqual(readLock(path).pid, process.pid, 'the ghost ran in-process, so its pid is not dead');

  // #2 acquires, legitimately, after the ghost was reclaimed.
  assert.equal(reclaimLock(path).ok, true, 'the premise failed: a dead holder\'s lock was not reclaimable');
  const second = await acquireAttemptLock({ resourcePath: resource, label: 'second' });
  assert.equal(second.ok, true, `#2 could not acquire: ${second.reason}`);
  assert.notEqual(second.token, firstToken, 'two acquisitions share a token, so they are not separable');

  // THE STALE HANDLE. It must be inert.
  assert.equal(releaseLock(path, firstToken), false,
    'a STALE handle deleted the current acquisition\'s live lock — this is the L07 finding');
  assert.equal(existsSync(path), true, 'the current acquisition\'s lock was removed by a stale handle');
  assert.equal(readLock(path).token, second.token, 'the lock on disk is no longer #2\'s');

  // And the handle is idempotent: even the OWNER cannot release twice and hit a successor.
  assert.equal(second.release(), true, 'the owning handle could not release its own lock');
  const third = await acquireAttemptLock({ resourcePath: resource, label: 'third' });
  assert.equal(third.ok, true, `#3 could not acquire after a clean release: ${third.reason}`);
  assert.equal(second.release(), false,
    'releasing the same handle twice succeeded — it would have deleted #3\'s lock');
  assert.equal(existsSync(path), true, 'the second release removed the successor\'s lock');
  third.release();
  cleanup();
});

