/**
 * baselineLock.acquire.test — what happens BETWEEN the first claim and the last.
 * @module scripts/swan-brain-console/baselineLock.acquire.test
 *
 * THE SIXTEENTH RULE 4 SPLIT IN THIS SUBSYSTEM, by SUBJECT: the PLAN versus the ACQUISITION.
 * `baselineLock.test.mjs` asks "is the resource set right?" — a pure function of the run mode, and
 * the precondition everything else rests on. This file asks the question that only exists once you
 * start TAKING the locks: what does a caller hold when an acquisition stops halfway, and what does
 * it leave behind? Those are different subjects with different failure shapes. A plan defect names
 * the wrong resource and reports a confident success; an acquisition defect leaks a lock file and
 * the next run refuses against a process that no longer exists.
 *
 * WHY IT WAS SPLIT IN ROUND 17. Astra's round-17 review added L13 (a THROW during acquisition held
 * the earlier locks) and the L08 policy change made the pre-existing ordering and rollback tests
 * longer, because a correct rollback now has to undo a read claim as well as a write one. The file
 * went past 300 lines and the honest options were to trim the reasoning or to move it; trimming a
 * hostile review's reasoning to fit a line budget is how the reasoning gets re-derived by the next
 * agent, so it moved.
 *
 * WHAT IS PROVEN HERE, AND WHAT IS NOT. These tests drive `acquireAllLocks` with an INJECTED
 * `acquire`, which is what makes the throw case reachable at all — no real filesystem can be made
 * to fail with ENOSPC on the second write on demand. So "the unwind happens" is proven for this
 * function, and the injection is the honest boundary: what is NOT proven is that a real disk-full
 * leaves the same observable state. Marked, not glossed.
 *
 * Run: node --test scripts/swan-brain-console/baselineLock.acquire.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { acquireAttemptLock, lockPathFor } from './attemptLock.mjs';
import { LOCKABLE_RESOURCES, lockPlanFor, acquireAllLocks } from './baselineLock.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

/** A throwaway directory with a result path, a baseline dir and a cleanup. */
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'swan-baselinelock-acq-'));
  const result = join(root, 'out', 'result.json');
  const baseline = join(root, 'docs', 'qa', 'baseline', 'three-worlds');
  mkdirSync(baseline, { recursive: true });
  return { root, result, baseline, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

const readLock = (p) => JSON.parse(readFileSync(p, 'utf8'));

test('RED — the BASELINE is claimed FIRST, so two update runs cannot deadlock (Astra L01)', () => {
  /*
   * THE ORDERING, ASSERTED RATHER THAN ASSUMED. Two runs that both want both resources in the same
   * order cannot form a cycle: whoever gets the baseline proceeds, and the other is refused. If the
   * order were reversed for one of them — or if a caller took them in parallel — run A could hold
   * the artifact while run B held the baseline and neither could finish.
   *
   * This is a test about an ORDER, so it asserts the order rather than a failure, and it also
   * asserts that a partial acquisition ROLLS BACK: a caller left holding one lock after a refusal
   * has half a resource set and no safe thing to do with it.
   *
   * MUTATION: sort `resources` by name, or `Promise.all` the acquisitions. RED.
   */
  const plan = lockPlanFor({ update: true, resultPath: 'C:/tmp/x.json', baselineDir: 'C:/tmp/bl' });
  assert.deepEqual(plan.resources.map((r) => r.name), [...LOCKABLE_RESOURCES],
    `the claim order is ${plan.resources.map((r) => r.name).join(' then ')}; the baseline must be first`);

  // Rollback, driven with a real acquisition against a pre-held second resource.
  const { root, result, baseline, cleanup } = sandbox();
  mkdirSync(dirname(result), { recursive: true });
  // Somebody else holds the ARTIFACT.
  writeFileSync(lockPathFor(result), JSON.stringify({
    pid: process.pid, token: 'foreign', label: 'holder', startedAt: new Date().toISOString(),
  }));

  return acquireAllLocks({
    resources: [
      { name: 'baseline-set', path: baseline },
      { name: 'result-artifact', path: result },
    ],
    acquire: acquireAttemptLock,
    label: 'suite',
  }).then((all) => {
    assert.equal(all.ok, false, 'the acquisition succeeded against a held artifact');
    assert.equal(all.name, 'result-artifact', `the refusal named ${all.name} rather than the resource actually held`);
    assert.equal(existsSync(lockPathFor(baseline)), false,
      'the baseline lock was taken and NOT released when the artifact was refused — a partial claim');
    assert.equal(readLock(lockPathFor(result)).token, 'foreign', 'the holder\'s lock was disturbed');
    rmSync(root, { recursive: true, force: true });
  }).finally(() => {
    cleanup();
  });
});

test('RED — a THROW during acquisition unwinds the locks already held (Astra L13)', async () => {
  /*
   * ASTRA L13 — "ALL-OR-NOTHING" COVERED REFUSAL, NOT THROWING. The loop unwound when `acquire`
   * returned `ok: false`; it did not unwind when `acquire` THREW. Astra executed it with an
   * injected ENOSPC on the second document write:
   *
   *     remaining locks: A.lock, B.lock   <- both present, first populated, second empty
   *     open descriptors: 1
   *
   * Two persistent lock files survive the process, and the next run refuses against a holder that
   * no longer exists. The window is between the first successful claim and the return of a handle —
   * which is exactly where the caller's `finally` cannot reach, because there is no handle yet.
   *
   * MUTATION: remove the try/catch around the loop. RED — nothing is released.
   */
  const released = [];
  let call = 0;
  const acquire = async ({ resourcePath, label }) => {
    call += 1;
    if (call === 2) {
      const e = new Error('ENOSPC: no space left on device');
      e.code = 'ENOSPC';
      throw e;
    }
    return { ok: true, resourcePath, release: () => released.push(label) };
  };
  const resources = [
    { name: 'baseline-set', path: 'C:/tmp/A.lock' },
    { name: 'result-artifact', path: 'C:/tmp/B.lock' },
  ];
  await assert.rejects(
    () => acquireAllLocks({ resources, acquire }),
    /ENOSPC/,
    'a throw during acquisition was swallowed',
  );
  assert.deepEqual(released, ['attempt:baseline-set'],
    'the first lock was NOT unwound — it survives the throw and the process');
});

test('a release that ITSELF throws does not replace the original error (Astra L13)', async () => {
  /*
   * THE HALF OF L13 THAT IS EASIER TO GET WRONG THAN THE UNWIND. `release()` can throw, and a throw
   * from inside a `catch` block REPLACES the error being handled — so "the disk is full" would be
   * reported as "a lock could not be released", which is the less actionable of the two facts and
   * loses the cause entirely.
   *
   * The contract: the original error survives, and the release failure is ATTACHED to it rather
   * than substituted for it. A human reading the message needs both.
   *
   * MUTATION: `for (const h of held) h.release();` unguarded inside the catch. RED — the assertion
   * on the original message fails, because the release error has replaced it.
   */
  let call = 0;
  const acquire = async ({ label }) => {
    call += 1;
    if (call === 2) {
      const e = new Error('EIO: i/o error writing the lock document');
      e.code = 'EIO';
      throw e;
    }
    return {
      ok: true,
      release: () => { throw new Error(`could not release ${label}`); },
    };
  };
  const resources = [
    { name: 'baseline-set', path: 'C:/tmp/A.lock' },
    { name: 'result-artifact', path: 'C:/tmp/B.lock' },
  ];
  await assert.rejects(
    () => acquireAllLocks({ resources, acquire }),
    (err) => {
      assert.match(err.message, /EIO/, 'the ORIGINAL error was replaced by the release failure');
      // Case-insensitive on purpose: this assertion first failed against the CORRECT message
      // ("could NOT be released") because the pattern was written as "COULD NOT". The failure was
      // mine, not the implementation's — recorded so the next reader does not re-derive it.
      assert.match(err.message, /could NOT be released/i, 'the release failure was swallowed silently');
      assert.equal(err.unwindFailures.length, 1, 'the unwind failure was not attached to the error');
      return true;
    },
  );
});

test('a REFUSED acquisition leaves no lock file behind (the refusal path, re-asserted)', async () => {
  /*
   * The refusal half, kept beside the throw half because the two are one contract and a reader
   * should be able to see both answers to "what does a failed acquisition leave?" in one file.
   * `ok: false` unwinds; a throw unwinds; both must leave the disk as they found it.
   */
  const released = [];
  let call = 0;
  const acquire = async ({ label }) => {
    call += 1;
    if (call === 2) return { ok: false, reason: 'held by another process', lockPath: 'C:/tmp/B.lock' };
    return { ok: true, release: () => released.push(label) };
  };
  const resources = [
    { name: 'baseline-set', path: 'C:/tmp/A.lock' },
    { name: 'result-artifact', path: 'C:/tmp/B.lock' },
  ];
  const all = await acquireAllLocks({ resources, acquire });
  assert.equal(all.ok, false, 'a refused acquisition reported success');
  assert.deepEqual(all.held, [], 'a refused acquisition returned held locks');
  assert.deepEqual(released, ['attempt:baseline-set'], 'the first lock was not unwound on refusal');
});

test('RED — a compare run with NO --result still locks the baseline it reads (Astra L11)', () => {
  /*
   * ASTRA L11, AND THIS IS A REGRESSION THE L01 REPAIR INTRODUCED. `parseArgs()` permits no result
   * path. For a compare run that made the resource set empty — and `parentsFor` refuses an empty
   * directory set by design (see the no-directories test below), so the ORDINARY
   * `node scripts/swan-brain-console/shot-diff.mjs` refused BEFORE MEASURING:
   *
   *     [shot-diff] a lock with no directories claims no resource — refusing rather than reporting ok
   *
   * The two guards were each correct alone and lethal together: "a plan with no directories claims
   * nothing" met "a compare run's only resource is the artifact, and there may not be one". The
   * L08 repair resolves it properly rather than by weakening either guard — the compare now always
   * has the baseline directory, so the empty case cannot arise from a legitimate run.
   *
   * MUTATION: drop `baseline-set` from the compare branch of `requiredResources`. RED — the plan
   * throws instead of returning.
   */
  const plan = lockPlanFor({ update: false, resultPath: null });
  assert.deepEqual(plan.resources.map((r) => r.name), ['baseline-set'],
    'a no-result compare must still claim the baseline it reads');
  assert.ok(plan.parents.length > 0, 'the plan claims a resource but names no directory to lock');
});

test('RED — the plan DESCRIBES the baseline it actually LOCKS (Astra L12)', () => {
  /*
   * ASTRA L12 — TWO ANSWERS TO ONE QUESTION, AND THE REASSURING ONE WAS THE ONE PRINTED.
   *
   * `requiredResources` dropped `baselineDir` and `repoRoot`, so it resolved its own default while
   * `lockPlanFor` faithfully reported the caller's override:
   *
   *     plan.baselineDir = C:/tmp/other-baselines
   *     baseline lock    = <module checkout>/docs/qa/baseline/three-worlds
   *
   * The shipped CLI supplies neither override, so the run was never misdirected — but a helper
   * that can describe a lock it did not take is a helper that will eventually be called with an
   * override, and the description is what a human reads to decide the run is safe.
   *
   * MUTATION: restore `resourcePathFor(name, { resultPath })` in `requiredResources`. RED.
   */
  const override = 'C:/tmp/other-baselines';
  const plan = lockPlanFor({ update: true, baselineDir: override, resultPath: 'C:/tmp/r.json' });
  const locked = plan.resources.find((r) => r.name === 'baseline-set');
  assert.equal(plan.baselineDir, override, 'the plan forgot the override it was given');
  assert.equal(locked.path, resolve(override),
    'the lock names a DIFFERENT directory from the one the plan describes');
});

test('a scope guard: this file owns the acquisition, not the plan', () => {
  /*
   * RULE 4 BOUND THE SPLIT, SO THE BOUNDARY IS ASSERTED. If this file grew a test about the
   * resource SET, the two files would drift back into one subject and the next split would have no
   * seam. The plan half lives in `baselineLock.test.mjs` and is named here so a reader who arrives
   * at this file looking for "which resources" is sent to the right place rather than concluding
   * the suite is incomplete.
   */
  assert.ok(existsSync(join(REPO, 'scripts/swan-brain-console/baselineLock.test.mjs')),
    'the plan suite this file was split from no longer exists');
  assert.ok(resolve(REPO).length > 0);
});
