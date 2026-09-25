/**
 * attemptLock.test — the cross-process lock, EXECUTED.
 * @module scripts/swan-brain-console/attemptLock.test
 *
 * WHY THIS FILE EXISTS (Astra round 15, K01)
 * `renderAttempt.mjs`'s publication fence orders two writes that have already happened and decides
 * it from a clock. Astra executed THREE SCHEDULES it does not close, and her decision was to
 * require cross-process synchronization over the whole attempt. `attemptLock.mjs` is that
 * mechanism; this suite proves it behaves, and proves the parts that CAN be executed rather than
 * asserting the file mentions them.
 *
 * THE THREE SCHEDULES, STATED HERE BECAUSE THIS IS WHERE A READER MEETS THEM. They are why the
 * mechanism exists, and none of them is a race in the timing sense — each is a SEQUENCE the
 * timestamp comparison cannot see:
 *
 *   1. EQUAL TIMESTAMPS. A and B start in the same millisecond; B fails; A completes. The fence
 *      compares `at <= now`, sees equality, and ALLOWS the write — so A's PASS overwrites B's
 *      failure. Distinct attempt ids do not help: the comparison is on the timestamp, not the id.
 *   2. STALE READ. Two PROCESSES whose read/write windows overlap: A reads the artifact, B
 *      publishes its failure, A writes using its earlier observation. Inside one process there is
 *      no `await` between the read and the write, so this cannot happen there; across processes it
 *      can, and `publishIfNewest` cannot see it.
 *   3. BASELINE OWNERSHIP. `--update` writes the baseline PNGs INSIDE the attempt and only the
 *      RESULT passes through the fence. So A's result publication can be correctly refused while
 *      A's baseline bytes are already on disk: the artifact names attempt B and the baseline is
 *      A's. **A correctly-refused write does not undo a side effect that preceded it.**
 *
 * ROUND 16 ADDED FOUR MORE, and each has a `RED —` test below naming its identifier: the abandoned
 * lock was RECLAIMED by a delete that could hit a fresh lock (Astra L02 — see the schedule test),
 * only `ESRCH` establishes death (L04), and a release was unbound to its acquisition (L07).
 * L01 — the wrong RESOURCE being locked — is in `baselineLock.test.mjs`, because it is about which
 * resources an attempt holds rather than how one lock behaves.
 *
 * THE ONE TEST THAT MATTERS MOST is the subprocess: a real `shot-diff.mjs` started against a
 * resource another process holds must exit 3, publish NOTHING, and leave the holder's lock alone.
 * That is the whole "busy is not failed" contract, and it is a subprocess because the thing being
 * tested is a process boundary.
 *
 * WHAT IS NOT PROVEN HERE, NAMED: that two real concurrent attempts racing on real PNG writes
 * cannot interleave. Astra marked that UNVERIFIED and so is it — proving it needs two processes
 * and a browser, and this suite proves the MECHANISM (exclusion, refusal, release) instead. The
 * release-on-a-red-exit path is proven structurally below and by the primitive tests, not by
 * driving a failing browser run.
 *
 * Run: node --test scripts/swan-brain-console/attemptLock.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, mkdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/*
 * THE OBSERVATION HALF MOVED TO `lockState.mjs` (round 16's tenth Rule 4 split), and its tests to
 * `lockState.test.mjs`. `readLock` and `DEFAULT_STALE_MS` are still imported FROM THIS MODULE
 * because they are re-exported here — which is the point of the re-export: the split changed where
 * the code lives, not this module's public surface.
 */
import {
  acquireAttemptLock, reclaimLock, releaseLock, readLock, lockPathFor, DEFAULT_STALE_MS,
} from './attemptLock.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

/** A throwaway directory with a resource path inside it. */
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'attempt-lock-'));
  return { root, resource: join(root, 'resource.json'), cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('a free resource is acquired, and the lock names this process', async () => {
  const { resource, cleanup } = sandbox();
  const lock = await acquireAttemptLock({ resourcePath: resource, label: 'suite' });
  assert.equal(lock.ok, true, `acquisition failed: ${lock.reason}`);
  const holder = readLock(lockPathFor(resource));
  assert.equal(holder.pid, process.pid, 'the lock does not name the acquiring process');
  assert.equal(holder.label, 'suite');
  lock.release();
  assert.equal(existsSync(lockPathFor(resource)), false, 'release did not remove the lock');
  cleanup();
});

test('RED — a held lock refuses, and says BUSY rather than failed', async () => {
  /*
   * The distinction Astra's decision asks for. A second attempt must be told it did not start, so
   * the caller can exit without publishing a failure over the holder's in-progress artifact.
   *
   * MUTATION: make `tryAcquire` succeed on EEXIST. RED.
   */
  const { resource, cleanup } = sandbox();
  const first = await acquireAttemptLock({ resourcePath: resource, label: 'first' });
  assert.equal(first.ok, true);
  const second = await acquireAttemptLock({ resourcePath: resource, label: 'second' });
  assert.equal(second.ok, false, 'a held lock was acquired twice');
  assert.match(second.reason, /another attempt is running/, `refusal reads: ${second.reason}`);
  assert.match(second.reason, new RegExp(String(process.pid)), 'the refusal does not name the holder');
  assert.match(second.reason, /did NOT start/, 'the refusal does not say the run did not start');
  first.release();
  cleanup();
});

test('a SUSPECT lock is refused, NOT reclaimed — stealing from a live process is a race', async () => {
  /*
   * A live holder that has held the lock past the stale threshold may be a hung browser. Reclaiming
   * would put two attempts on one resource, which is the defect the lock removes, so the honest
   * answer is a loud refusal that names the file.
   *
   * MUTATION: reclaim on age instead of refusing. RED.
   */
  const { resource, cleanup } = sandbox();
  writeFileSync(lockPathFor(resource), JSON.stringify({
    pid: process.pid, label: 'wedged', startedAt: new Date(Date.now() - DEFAULT_STALE_MS - 60_000).toISOString(),
  }));
  const lock = await acquireAttemptLock({ resourcePath: resource, label: 'second' });
  assert.equal(lock.ok, false, 'a live, over-age lock was stolen');
  assert.match(lock.reason, /still running/, `refusal reads: ${lock.reason}`);
  assert.match(lock.reason, /NOT reclaimed/, 'the refusal does not say the lock was left in place');
  cleanup();
});

test('an UNREADABLE lock is refused, NOT deleted', async () => {
  /*
   * A lock file we cannot parse might belong to a live process mid-write. Deleting it would let two
   * attempts run, so the safe reading is to refuse and name the file.
   *
   * MUTATION: treat a parse failure as "no lock". RED.
   */
  const { resource, cleanup } = sandbox();
  writeFileSync(lockPathFor(resource), 'not json at all');
  const lock = await acquireAttemptLock({ resourcePath: resource, label: 'second' });
  assert.equal(lock.ok, false, 'an unreadable lock was treated as free');
  assert.match(lock.reason, /not a readable lock document/, `refusal reads: ${lock.reason}`);
  cleanup();
});

test('release is a no-op when another process holds the lock', async () => {
  /*
   * The mirror of the reclaim rule: a process that lost or never held a lock must not unlink the
   * file. Without this, a reclaimer that raced a real owner could delete a live claim.
   *
   * MUTATION: unlink unconditionally in `releaseLock`. RED.
   */
  const { resource, cleanup } = sandbox();
  const path = lockPathFor(resource);
  writeFileSync(path, JSON.stringify({ pid: 999_998, label: 'someone-else', startedAt: new Date().toISOString() }));
  assert.equal(releaseLock(path), false, 'release claimed to have removed a foreign lock');
  assert.equal(existsSync(path), true, 'release removed a lock this process does not own');
  cleanup();
});

test('a bounded acquisition gives up instead of waiting forever', async () => {
  /*
   * `timeoutMs` defaults to 0 — one try — because a second CI attempt must not queue behind a
   * fifteen-minute browser run. This pins that the bound is honoured rather than the loop running.
   *
   * MUTATION: ignore `timeoutMs` and loop. RED (the assertion on elapsed time, not on the outcome).
   */
  const { resource, cleanup } = sandbox();
  const first = await acquireAttemptLock({ resourcePath: resource, label: 'first' });
  const started = Date.now();
  const second = await acquireAttemptLock({
    resourcePath: resource, label: 'second', timeoutMs: 50, pollMs: 10,
  });
  const elapsed = Date.now() - started;
  assert.equal(second.ok, false, 'the bounded acquisition succeeded against a held lock');
  assert.ok(elapsed < 5000, `the bounded acquisition took ${elapsed}ms, so the bound was not honoured`);
  first.release();
  cleanup();
});

test('RED — a REAL busy process exits 3, publishes nothing, and leaves the holder alone', async () => {
  /*
   * THE CONTRACT, END TO END, ACROSS A PROCESS BOUNDARY.
   *
   * Astra's K01 decision distinguishes "busy, not started" from "executed and failed". This starts
   * the shipped entry point against a resource this test holds, and asserts the three consequences
   * that distinction implies:
   *
   *   1. exit code 3 — distinct from 1 (comparison failed) and 2 (attempt failed)
   *   2. the holder's lock is still on disk — a busy run must not clean up after someone else
   *   3. NO artifact was published — the holder's own in-progress state is still the answer
   *
   * It is a subprocess because the boundary is the subject. It needs no browser and no manifest,
   * because the lock is taken BEFORE the lifecycle — which is itself the ordering K01 requires.
   *
   * MUTATION: move the lock acquisition after `runAttempt`. RED (the run then needs a browser and
   * this exits 2, or publishes).
   */
  const rel = join('.qa', 'attempt-lock-suite', 'result.json');
  const abs = join(REPO, rel);
  const lockPath = `${abs}.lock`;
  mkdirSync(dirname(abs), { recursive: true });
  rmSync(abs, { force: true });
  writeFileSync(lockPath, JSON.stringify({
    pid: process.pid, label: 'suite-holder', startedAt: new Date().toISOString(),
  }));

  try {
    const res = spawnSync(process.execPath, [join(HERE, 'shot-diff.mjs'), '--result', rel], {
      // stdin is 'ignore', NOT the default pipe — the failing configuration is a piped stdin
      // (reproducible 10/10: `{ encoding: 'utf8' }` alone gives EBUSY). No stdin is fed here.
      // Configuration-level claim only; the CAUSE is unproven. See round 18, 2026-09-24.
      cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 60_000,
    });
    assert.equal(res.status, 3, `expected exit 3 (busy), got ${res.status}. stderr: ${res.stderr}`);
    assert.match(res.stderr, /not started/, `stderr reads: ${res.stderr}`);
    assert.equal(existsSync(abs), false, 'a run that never started published a result artifact');
    assert.equal(existsSync(lockPath), true, 'the busy run removed the holder\'s lock');
    assert.equal(JSON.parse(readFileSync(lockPath, 'utf8')).pid, process.pid,
      'the holder\'s lock was overwritten');
  } finally {
    rmSync(dirname(abs), { recursive: true, force: true });
  }
});

test('main() releases the lock on every path, because it never calls process.exit', () => {
  /*
   * THE STRUCTURAL HALF OF THE RELEASE GUARANTEE, AND IT IS A MECHANISM RATHER THAN A WORDING.
   *
   * `process.exit` terminates the process immediately and does NOT unwind, so a `process.exit`
   * inside `main()` would skip the `finally` that releases the lock — on exactly the paths that
   * are most common, because red exits are the ones an operator sees. The release therefore
   * depends on `main()` RETURNING its exit code and the single `process.exit` living at the entry
   * point, after the `finally`.
   *
   * This is a source assertion, and it is the right shape for this particular claim: what is being
   * protected is an ordering property of the file itself, and a browser cannot be started to prove
   * it. Named as structural rather than presented as behavioural.
   *
   * MUTATION: put `process.exit(2)` back in the failure branch. RED.
   */
  const src = readFileSync(join(HERE, 'shot-diff.mjs'), 'utf8');
  const mainStart = src.indexOf('async function main()');
  const mainEnd = src.indexOf('\nconst isEntryPoint');
  assert.ok(mainStart !== -1 && mainEnd > mainStart, 'the shape of shot-diff.mjs changed — re-derive');
  const body = src.slice(mainStart, mainEnd);
  assert.equal(
    (body.match(/process\.exit\(/g) ?? []).length, 0,
    'main() calls process.exit, which does not unwind — the finally that releases the lock would '
    + 'be skipped on every red exit',
  );
  assert.match(body, /finally \{[\s\S]*lock\.release\(\)/, 'main() has no finally that releases the lock');
  // Both exits belong to the ENTRY POINT (the resolved value and the rejection handler), which runs
  // after the `finally`. Two is correct; zero before the entry point is the property.
  const entry = src.slice(mainEnd);
  assert.match(entry, /main\(\)\.then\(/, 'the entry point does not consume main()\'s exit code');
  assert.ok((entry.match(/process\.exit\(/g) ?? []).length >= 1,
    'the entry point never exits — the script would run and report nothing');
});
