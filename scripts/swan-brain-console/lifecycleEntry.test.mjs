/**
 * lifecycleEntry.test — a run that could not START is a failed attempt, not silence.
 * @module scripts/swan-brain-console/lifecycleEntry.test
 *
 * WHY THIS SUITE EXISTS
 * `shot-diff.mjs` wraps its whole run in `runAttempt`, which publishes an in-progress artifact
 * before the thunk is invoked and a terminal failure if it throws. Round 15's K03 was that
 * `loadFleetIds()` sat OUTSIDE that region: seed a fresh PASS, make the manifest unreadable, run —
 * and the process exited with the previous artifact UNTOUCHED, so the console reported PASS for a
 * gate the operator had just asked to verify. The file was lying about now.
 *
 * WHY IT IS A SUBPROCESS IN A COPY OF THE TREE
 * The defect is an ORDERING property of `shot-diff.mjs` — whether the manifest read happens inside
 * the guarded region — and ordering is not visible from any exported function. What IS visible is
 * its consequence: on a manifest failure, does a failed attempt appear at the result path, or does
 * nothing appear at all? Proving that requires the manifest read to fail, and it must not be made
 * to fail by damaging the real repository.
 *
 * So the console scripts are copied into a throwaway root, beside a `frontend/node_modules` that is
 * a JUNCTION to the real one. `fleetData.mjs` resolves the repo as `dirname(import.meta.url)/../..`,
 * so inside the copy that root is the temp directory and the manifest is simply absent — while
 * `fleetMeasure.mjs`'s `require('playwright')` still resolves to the real package. Nothing is
 * stubbed: the browser dependency is genuine and is provably never reached, because the manifest
 * read fails first and the second test here asserts that the recorded failure names the manifest.
 *
 * WHY THIS REPLACES A SOURCE-TEXT ASSERTION
 * `fleet-population.test.mjs` guarded this call site with `assert.match(src, /loadFleetIds\(\)/)`
 * — it proved the NAME occurs, not that the call sits inside the lifecycle. Moving the call back
 * above `runAttempt` would have left that assertion green. Astra's K05 is exactly this: a guard
 * that survives the deletion of the behaviour it claims to cover is not a guard. This suite fails
 * on that mutation because the artifact it demands stops being written.
 *
 * Run: node --test scripts/swan-brain-console/lifecycleEntry.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, mkdirSync, cpSync, rmSync, existsSync, readFileSync, statSync,
  symlinkSync, lstatSync, unlinkSync,
} from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

/** The real dependency tree, and the path the fixture's junction points at. */
const REAL_NODE_MODULES = join(REPO, 'frontend', 'node_modules');

/** The manifest `loadFleetIds()` reads; absent in every fixture, which is the whole mechanism. */
const MANIFEST = join('frontend', 'src', 'pages', 'HomePage', 'three-worlds', 'skeletons.ts');

/**
 * Remove a fixture WITHOUT ever recursing into the junction.
 *
 * `frontend/node_modules` in the fixture is a reparse point to the real dependency tree. A
 * recursive delete that followed it would destroy the repository's installed packages, so the
 * link is unlinked EXPLICITLY and first, and `lstat` (not `stat`) is what identifies it — `stat`
 * follows the link and would report a directory. The suite then asserts the target survived.
 */
function removeFixture(root) {
  const link = join(root, 'frontend', 'node_modules');
  try {
    if (lstatSync(link).isSymbolicLink()) unlinkSync(link);
  } catch { /* the link was already removed, or the fixture never got that far */ }
  rmSync(root, { recursive: true, force: true });
}

/** A throwaway repo containing the console's scripts and a real dependency junction. */
function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'lifecycle-entry-'));
  cpSync(HERE, join(root, 'scripts', 'swan-brain-console'), {
    recursive: true,
    filter: (src) => {
      const name = basename(src);
      if (name === '.qa' || name === 'node_modules') return false;
      if (statSync(src).isDirectory()) return true;
      return src.endsWith('.mjs');
    },
  });
  mkdirSync(join(root, 'frontend'), { recursive: true });
  symlinkSync(REAL_NODE_MODULES, join(root, 'frontend', 'node_modules'), 'junction');
  return root;
}

/** Run the copied `shot-diff.mjs` against `rel`, returning the child's result. */
function runShotDiff(root, rel) {
  // `fileWriter` creates the result's directory, but the attempt LOCK is created beside it and
  // does not — an absent directory would make the lock `unwritable` and exit 3 instead of 2.
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  return spawnSync(
    process.execPath,
    [join(root, 'scripts', 'swan-brain-console', 'shot-diff.mjs'), '--result', rel],
    // stdin is 'ignore', NOT the default pipe — the failing configuration is a piped stdin
    // (reproducible 10/10: `{ encoding: 'utf8' }` alone gives EBUSY). No stdin is fed here.
    // Configuration-level claim only; the CAUSE is unproven. See round 18, 2026-09-24.
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 60_000 },
  );
}

/* ── round 15 (K03): the manifest read is inside the guarded region ────────── */

test('RED — a run whose manifest cannot be read publishes a FAILED attempt, not silence (K03)', () => {
  /*
   * THE DISCRIMINATING ASSERTION. `runAttempt` publishes an in-progress artifact before the thunk
   * runs and a terminal failure when it throws, so with the shipped ordering a manifest failure
   * leaves `attempt.state === 'failed'` at the result path.
   *
   * With the mutation — `const expectedIds = await loadFleetIds()` hoisted above `runAttempt` —
   * the throw happens before the lifecycle exists, so NOTHING is published: the result path stays
   * absent, and a stale PASS from an earlier run would have stayed on disk in the real repository.
   * The `existsSync` assertion is therefore the one that goes RED.
   *
   * MUTATION: hoist the `loadFleetIds()` call above `runAttempt`. RED.
   */
  const root = fixtureRoot();
  const rel = join('.qa', 'lifecycle-entry-suite', 'result.json');
  const abs = join(root, rel);
  try {
    // The premise, asserted rather than assumed: without this the failure below could be
    // anything, and the test would be measuring the wrong error.
    assert.equal(existsSync(join(root, MANIFEST)), false,
      'the fixture gained a manifest, so the read would not fail');
    assert.equal(
      statSync(join(root, 'scripts', 'swan-brain-console', 'shot-diff.mjs')).isFile(), true,
      'the console was not copied into the fixture',
    );

    const res = runShotDiff(root, rel);

    assert.equal(res.status, 2,
      `expected exit 2 (attempt failed), got ${res.status}. stderr: ${res.stderr}`);
    assert.equal(existsSync(abs), true,
      'a run that was requested and could not start published NOTHING — the previous artifact '
        + 'would still be the console\'s answer');

    const doc = JSON.parse(readFileSync(abs, 'utf8'));
    assert.equal(doc.attempt?.state, 'failed', 'the published artifact does not record a failure');
    assert.ok(
      Array.isArray(doc.variants) && doc.variants.some((r) => r.status === 'fail'),
      'the failed attempt carries no failing row, so the reader has nothing to report',
    );
  } finally {
    removeFixture(root);
  }
});

test('the recorded failure names the manifest, so this detects the manifest read (K03)', () => {
  /*
   * SPECIFICITY CONTROL. The test above passes for ANY error that reaches the lifecycle — a
   * missing module, a bad argument, a broken import in the copy. That would make it a test about
   * "shot-diff fails somehow", which is not the property K03 is about.
   *
   * The failure has to name the manifest it could not read. This is what makes the suite an
   * assertion about the manifest read being INSIDE the guarded region, and it is also what proves
   * the browser was never reached: a failure from playwright would not mention `skeletons.ts`.
   *
   * MUTATION: make the fixture provide a readable manifest — the detail stops naming it. RED.
   */
  const root = fixtureRoot();
  const rel = join('.qa', 'lifecycle-entry-suite', 'result.json');
  try {
    const res = runShotDiff(root, rel);
    assert.equal(res.status, 2, `expected exit 2, got ${res.status}. stderr: ${res.stderr}`);

    const doc = JSON.parse(readFileSync(join(root, rel), 'utf8'));
    const detail = JSON.stringify(doc);
    assert.match(detail, /skeletons\.ts/,
      `the recorded failure does not name the manifest it could not read — it reads: ${detail}`);
  } finally {
    removeFixture(root);
  }
});

test('the fixture junction is unlinked, never recursed into (K03 safety)', () => {
  /*
   * The fixture puts a junction to the REAL `frontend/node_modules` inside a tree that is then
   * deleted recursively. If that delete followed the link, this suite would uninstall the
   * repository's dependencies — a test that can destroy the thing it is testing.
   *
   * So the safety property is asserted rather than trusted: build a fixture, remove it, and
   * require the real package to still be there. `playwright` is named because it is the module
   * `fleetMeasure.mjs` requires, so its absence would also break every other suite.
   *
   * MUTATION: replace `removeFixture` with a bare `rmSync(root, { recursive: true, force: true })`
   * and drop the explicit unlink — RED on a platform that follows junctions.
   */
  const root = fixtureRoot();
  assert.equal(existsSync(join(root, 'frontend', 'node_modules', 'playwright')), true,
    'the fixture did not resolve playwright through the junction');
  removeFixture(root);

  assert.equal(existsSync(root), false, 'the fixture was not removed');
  assert.equal(existsSync(join(REAL_NODE_MODULES, 'playwright')), true,
    'the fixture cleanup removed the REAL playwright package — the junction was recursed into');
});
