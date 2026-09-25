/**
 * baselineLock.test — which resources an attempt must hold, and in what order (Astra L01).
 * @module scripts/swan-brain-console/baselineLock.test
 *
 * WHY THIS SUITE EXISTS
 * `shot-diff.mjs` locked `resultPath ?? baselineDir` — ONE path, chosen as a fallback. Astra's L01
 * is that this is the wrong resource in the ORDINARY case, not an edge case:
 *
 *   `--update --result X`   writes X AND `docs/qa/baseline/three-worlds/*.png`. Locked only X, so
 *                           two such runs with different `--result` values hold two different locks
 *                           over ONE shared baseline directory and interleave freely.
 *   `--update` (no --result) locks the directory — accidentally right, and for the wrong reason.
 *   `--result X` (compare)  writes X only and locks X — right.
 *
 * A `??` reads as "either/or". The run's actual requirement is "one or both", so the fix is to
 * derive the SET from the mode. **This is a unit suite rather than a subprocess suite** because the
 * property is a pure function of the mode: a real two-process interleave needs two browsers and is
 * marked UNVERIFIED, so what is proven here is that the resource set is right — which is the
 * precondition the rest of the mechanism depends on.
 *
 * THE ORDERING IS ALSO TESTED, because it is the deadlock argument rather than a preference. Both
 * update runs claim the baseline first, so neither can hold the artifact while waiting for the
 * baseline. A `Promise.all` at the call site would delete that property silently.
 *
 * WHAT THIS FILE NO LONGER OWNS (round 17, Rule 4 split). The ORDERING of the claims, the rollback
 * of a refused acquisition, and the unwind of a THROWN one moved to `baselineLock.acquire.test.mjs`.
 * Those are questions about the ACQUISITION — what a caller holds when taking stops halfway, and
 * what it leaves on disk. This file is the PLAN: which resources the mode requires, and whether the
 * plan describes the lock it actually takes. A plan defect names the wrong resource and reports a
 * confident success; an acquisition defect leaks a lock file. Different failure shapes, so different
 * files — and the seam is asserted in the sibling so the two cannot quietly merge back.
 *
 * Run: node --test scripts/swan-brain-console/baselineLock.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { acquireAttemptLock, lockPathFor } from './attemptLock.mjs';
import {
  LOCKABLE_RESOURCES, requiredResources, resourcePathFor, declaredBaselineDir, childrenFor,
  parentsFor, fleetIdsFromManifest, lockPlanFor, acquireAllLocks, baselineChildrenFor,
} from './baselineLock.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

/** A throwaway directory standing in for the repo, with a resource path inside it. */
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'baseline-lock-'));
  return {
    root,
    result: join(root, '.qa', 'gate-results', 'three-worlds-render.json'),
    baseline: join(root, 'docs', 'qa', 'baseline', 'three-worlds'),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

test('RED — an --update run locks the BASELINE and the artifact, not one of them (Astra L01)', () => {
  /*
   * THE FINDING, AS AN ASSERTION. This is the discriminating regression Astra's approval condition
   * asks for, and the assertion that goes RED under the old shape is the FIRST one: the old code
   * passed exactly one path to `acquireAttemptLock`, so `resources` had length 1.
   *
   * The two runs that must exclude each other are spelled out rather than implied, because the
   * whole point is that they disagree about `--result`:
   *
   *   run A: --update --result a.json     run B: --update --result b.json
   *
   * Under the old code A locked `a.json.lock` and B locked `b.json.lock` — two locks, no shared
   * resource, both writing the same PNGs.
   *
   * MUTATION: `requiredResources` returns only the result artifact for update mode. RED here.
   */
  const a = lockPlanFor({ update: true, resultPath: 'C:/tmp/a.json', baselineDir: 'C:/tmp/baselines' });
  const b = lockPlanFor({ update: true, resultPath: 'C:/tmp/b.json', baselineDir: 'C:/tmp/baselines' });

  assert.deepEqual(a.resources.map((r) => r.name), ['baseline-set', 'result-artifact'],
    'an --update run must claim BOTH resources it writes — this is the L01 finding');
  const shared = a.resources.filter((r) => b.resources.some((o) => o.path === r.path));
  assert.deepEqual(shared.map((r) => r.name), ['baseline-set'],
    'two update runs with different --result values share no resource, so they cannot exclude');

  // Each run has its OWN artifact, which is why the artifact alone was never sufficient.
  assert.notEqual(a.resources[1].path, b.resources[1].path, 'the premise is wrong: the artifacts are the same path');
  // And the baseline is the SAME resource for both, which is what makes the lock meaningful.
  assert.equal(a.resources[0].path, b.resources[0].path,
    'the baseline resource differs between two runs that write the same directory');
});

test('RED — a COMPARE run DOES claim the baseline, READ-ONLY (Astra L01 then L08)', () => {
  /*
   * ── THIS TEST USED TO ASSERT THE OPPOSITE, AND THAT WAS THE DEFECT ────────────────────────
   *
   * The round-16 version of this test read:
   *
   *     a compare run writes only the artifact, so it must lock only the artifact
   *     assert.equal(plan.locksBaseline, false, 'the plan claims a read-only resource');
   *
   * The reasoning was about WRITES — "a compare does not modify the baselines" — and it silently
   * became a claim about SAFETY. Astra executed the consequence through the shipped `measureFleet`:
   *
   *     compare checks the incomplete-generation marker is absent
   *     compare reads   old-alpha
   *     update  publishes both new baselines, removes its marker
   *     compare reads   new-beta        <- and BOTH ROWS PASSED
   *
   * A comparison that matches neither generation, reporting success, with
   * `shared lock resources: []`. **The guard I wrote to prevent an over-correction became the
   * thing that authorised the under-correction.** A test cannot be evidence for a policy it
   * encodes; it can only be evidence that the policy is implemented.
   *
   * THE CORRECT POLICY. Reading a directory while another process rewrites it is a race whether or
   * not the reader writes. A compare claims the baseline `mode: 'read'`; an update claims it
   * `mode: 'write'`; both name the SAME PATH, so one lock file governs them and the writer and the
   * reader exclude each other. Many concurrent readers would be fine — that is the real
   * over-correction risk, and the fix for it is read-sharing in the ACQUISITION, not the removal of
   * the read claim.
   *
   * MUTATION: drop `baseline-set` from the compare branch of `requiredResources`. RED — both
   * assertions below fail, and the L08 schedule test in `fleetMeasure`'s contract would too.
   */
  const comparePlan = lockPlanFor({ update: false, resultPath: 'C:/tmp/r.json' });
  const updatePlan = lockPlanFor({ update: true, resultPath: 'C:/tmp/r.json' });

  assert.deepEqual(comparePlan.resources.map((r) => r.name), ['baseline-set', 'result-artifact'],
    'a compare run READS the baseline, so the writer must be able to see it claim the resource');
  assert.equal(comparePlan.locksBaseline, true,
    'a compare that claims no baseline resource can read a generation an update is rewriting');

  const cb = comparePlan.resources.find((r) => r.name === 'baseline-set');
  const ub = updatePlan.resources.find((r) => r.name === 'baseline-set');
  assert.equal(cb.mode, 'read', 'the compare claim must be READ, not write');
  assert.equal(ub.mode, 'write', 'the update claim must be WRITE — it rewrites the generation');
  assert.equal(cb.path, ub.path,
    'the reader and the writer must name the SAME path, or they take two lock files and exclude nobody');
});

test('the mode derives the resource set, and an unknown resource name is REFUSED', () => {
  /*
   * `resourcePathFor` is a closed vocabulary. A typo would otherwise resolve to `undefined`, and a
   * lock on an undefined path is a lock that protects nothing while reporting success — the same
   * shape as the defect. Throwing is the only answer that cannot be mistaken for a working lock.
   *
   * MUTATION: return null for an unknown name. RED.
   */
  assert.throws(() => resourcePathFor('baseline-set-typo'), /not a lockable resource/,
    'an unknown resource name resolved to a path instead of being refused');
  const { root, result, cleanup } = sandbox();
  assert.equal(resourcePathFor('result-artifact', { resultPath: result }), result,
    'the artifact resource is not the caller\'s own path');
  assert.equal(resourcePathFor('baseline-set', { repoRoot: root }),
    join(root, declaredBaselineDir()),
    'the baseline resource is not derived from the declared BASELINE_DIR');
  cleanup();
});

test('RED — a lock with NO directories is refused rather than reported ok', () => {
  /*
   * THE GUARD THAT MAKES THE PLAN HONEST. An empty directory set means the lock claims nothing, and
   * a mechanism that claims nothing and returns `ok: true` is indistinguishable from a working one
   * by its return value alone — which is how `#fff` passed a contrast guard and how the wrong
   * resource passed a lock.
   *
   * `allowEmpty` exists because `[]` is sometimes a legitimate answer (a plan for a mode that locks
   * nothing), and the default is false so that case has to be DECLARED rather than arrived at.
   *
   * MUTATION: drop the guard in `parentsFor`. RED.
   */
  assert.throws(() => parentsFor({}), /no directories/,
    'an empty directory set produced a plan rather than a refusal');
  assert.deepEqual(parentsFor({ allowEmpty: true }), [],
    'an explicitly-empty plan was refused, so the guard cannot be satisfied');

  /*
   * The real case: a compare run's directories come from the RESOURCE, not from a baseline dir.
   *
   * THIS ASSERTION CHANGED IN ROUND 17 (Astra L08) AND THE CHANGE IS THE POINT. It used to expect
   * `[resolve('C:/tmp/dir')]` — the artifact's directory ONLY — because a compare run claimed no
   * baseline. Now a compare claims the baseline READ-ONLY as well, so its plan names BOTH
   * directories. The old expectation is not merely stale; asserting it would re-encode the unsafe
   * policy that let a comparison read a generation an update was rewriting.
   */
  const plan = lockPlanFor({ update: false, resultPath: 'C:/tmp/dir/result.json' });
  assert.ok(plan.parents.length >= 2,
    'a compare run must name the artifact directory AND the baseline it reads');
  assert.ok(plan.parents.includes(resolve('C:/tmp/dir')),
    'a compare run derived no directory from its own resource, so its lock would claim nothing');
  assert.ok(plan.parents.includes(resolve(plan.baselineDir)),
    'a compare run did not name the baseline directory it reads');
});

test('the manifest ids are read from the CANONICAL source and fail loudly', () => {
  /*
   * `fleetIdsFromManifest` is a TEXT read rather than `loadFleetIds()`, and the reason is ordering:
   * this is called from inside the lifecycle (round 15's K03 requires the manifest read to be
   * guarded), and a dynamic `import()` of a TypeScript module is a heavier first act than a regex
   * over a literal array. **What must not happen is a SHORT LIST** — `['v01']` would lock one
   * twentieth of the baseline set and report success.
   *
   * So the reader throws on a manifest it cannot parse, and this runs it against the REAL manifest
   * and against three damaged ones. The real read is what makes the rest of this suite meaningful:
   * a reader that always threw would pass the negative cases and lock nothing.
   *
   * MUTATION: `return ids` without the length check, or swallow the read error. RED.
   */
  const ids = fleetIdsFromManifest({ repoRoot: REPO });
  assert.ok(ids.length >= 20, `only ${ids.length} ids were read from the real manifest`);
  assert.ok(ids.every((id) => /^v\d+$/.test(id)), `a non-variant id was read: ${ids.join(', ')}`);
  assert.deepEqual([...ids], [...new Set(ids)], 'the reader returned a duplicate id');

  const { root, cleanup } = sandbox();
  const manifest = join(root, 'frontend', 'src', 'pages', 'HomePage', 'three-worlds', 'skeletons.ts');
  mkdirSync(dirname(manifest), { recursive: true });

  writeFileSync(manifest, 'export const SOMETHING_ELSE = [];');
  assert.throws(() => fleetIdsFromManifest({ source: manifest }), /no longer declares SKELETONS/,
    'a manifest without the declaration was accepted');

  writeFileSync(manifest, 'export const SKELETONS: SkeletonContract[] = [];');
  assert.throws(() => fleetIdsFromManifest({ source: manifest }), /found no ids/,
    'an empty manifest produced an empty lock set rather than a refusal');

  assert.throws(() => fleetIdsFromManifest({ source: join(root, 'absent.ts') }), /ENOENT/,
    'a missing manifest was silently tolerated');

  // Exclusion is the caller's, and it must not be able to empty the set silently.
  writeFileSync(manifest, "export const SKELETONS = [{ id: 'v01' }, { id: 'v02' }];");
  assert.deepEqual(fleetIdsFromManifest({ source: manifest, excluded: ['v02'] }), ['v01'],
    'exclusion did not remove the named id');
  assert.deepEqual(fleetIdsFromManifest({ source: manifest }), ['v01', 'v02'],
    'the reader dropped ids it was not asked to drop');
  cleanup();
});

test('the children and parents name real paths, and a plan with children covers them', () => {
  /*
   * The path arithmetic, kept small because it is not where the defect was — but it is what makes
   * `parentsFor` non-empty for an update run, and an update run whose directory set were empty
   * would refuse (correctly) and never lock anything.
   *
   * MUTATION: `childrenFor` returns absolute paths from a different root. RED.
   *
   * THE EXPECTATIONS ARE `resolve()`d, AND THAT IS NOT A CONCESSION TO THE PLATFORM. `dirname` does
   * not preserve spelling — `dirname(join('C:/tmp/bl','v01.png'))` is `'C:\\tmp\\bl'` while the
   * literal is `'C:/tmp/bl'` — so an un-normalised `Set` counts ONE directory TWICE and the parents
   * test below fails on a string comparison while the directory set is in fact correct. What the
   * contract promises is that one directory is one member, so the assertion normalises its own
   * expectations rather than asserting a separator.
   *
   * MUTATION: drop the `resolve()` around `parentsFor`'s three contributions. This test goes RED
   * with two members for one directory, and the compare-run test (2) reports it on the path that
   * matters — the one whose only directory arrives through `resources`.
   */
  const dir = 'C:/tmp/bl';
  const children = childrenFor({ baselineDir: dir, ids: ['v01', 'v02'] });
  assert.deepEqual(children, [join(dir, 'v01.png'), join(dir, 'v02.png')], 'the child paths are wrong');
  assert.deepEqual(parentsFor({ baselineDir: dir, children }), [resolve(dir)],
    'the directories are not the single baseline dir');
  assert.deepEqual(childrenFor({ baselineDir: dir, ids: [] }), [], 'an empty id list made a child');

  /*
   * AND THE COMPARE RUN, WHOSE PARENTS COME ONLY FROM `resources`. This is the case that made the
   * two-spellings defect visible: its artifact path has to be a FILE for `dirname` to yield its
   * directory, so an un-normalised set yields the artifact's directory and nothing else — right
   * answer, but the resource path itself is where the second spelling would have hidden.
   */
  const artifactParents = parentsFor({
    resources: [{ name: 'result-artifact', path: 'C:/tmp/r.json' }],
  });
  assert.deepEqual(artifactParents, [resolve('C:/tmp')], 'a compare run named the wrong directory');

  // The plan's own children are id-scoped and usually empty — the manifest is read inside the
  // lifecycle — and `baselineChildrenFor` is how a caller that HAS the ids extends it.
  const plan = lockPlanFor({ update: true, resultPath: 'C:/tmp/r.json', baselineDir: dir });
  assert.deepEqual(plan.children, [], 'the plan read ids it was not given');
  assert.deepEqual(baselineChildrenFor(plan, ['v01']), [join(dir, 'v01.png')],
    'a plan with ids did not produce their children');
  // A plan with ids did not produce their children.
  assert.deepEqual(baselineChildrenFor(lockPlanFor({ update: true, resultPath: 'C:/tmp/r.json' }), ['v01']),
    [join(resolve(join(REPO, 'docs/qa/baseline/three-worlds')), 'v01.png')],
    'an update plan with ids did not produce their children');
  assert.equal(basename(dir), 'bl', 'the fixture drifted');
});

/* L11 and L12 MOVED TO baselineLock.acquire.test.mjs (round 17, Rule 4): they assert that the
 * plan's LOCK and the plan's DESCRIPTION cannot diverge, which is the acquisition seam. */
