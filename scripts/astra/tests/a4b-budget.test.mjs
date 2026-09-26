/**
 * a4b-budget.test.mjs — Rule 4 as a MEASURED invariant, not a remembered one.
 *
 * WHY THIS EXISTS. Every prior claim that the tree was within budget was made by
 * running `wc -l` by hand and typing the result into an evidence file. The first
 * time it mattered, it was wrong: adding tests to `a4-routes.test.mjs` took it to
 * 323 lines, and nothing in the suite noticed — the number was in a document, and
 * a document does not run. This is the same defect class the rest of A4/A4b is
 * about, applied to the project's own housekeeping:
 *
 *     A COUNT IS A CLAIM ABOUT COMPLETENESS.
 *
 * So the count is now a test. It walks the trees from DISK rather than a
 * hand-maintained list, because a list of files to check is a list that silently
 * stops covering the file someone added yesterday.
 *
 * SCOPE, MEASURED BEFORE IT WAS WRITTEN: `scripts/astra` was 37 `.mjs` modules and
 * `shared` was 49, and at the time of writing NEITHER tree contained a file over the
 * cap. The widest honest scope was therefore also the zero-false-positive one — the
 * guard covers both trees whole.
 *
 * THE SCOPE WAS ALSO WRONG, AND THIS GUARD IS WHAT FOUND IT. Every prior slice's
 * "0 modules over 300" counted `.mjs` files, and said nothing about the two SHIPPED
 * STATIC ASSETS the browser actually loads — `static/astra.js` and `static/astra.css`.
 * Writing this guard with `.js`/`.css` included immediately showed `astra.js` at 320
 * lines: the override editor had pushed a 255-line client past the cap, and nothing
 * was watching. That is `A COUNT IS A CLAIM ABOUT COMPLETENESS` applied to the
 * project's own housekeeping — the claim was true of the set measured and silent about
 * the set excluded. The client is now three modules (plumbing / actions / entry), and
 * the assets are IN scope, so the number means what it says.
 *
 * MEASURE. `readFileSync(p, 'utf8').split('\n').length` — the house measure. It
 * counts a trailing newline as opening one more (empty) line, so a file whose
 * last line is text and which ends with `\n` measures one more than `wc -l`.
 * That is the number every other Rule 4 guard in this repo asserts, so it is the
 * number asserted here; changing the measure would silently re-baseline the tree.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const ASTRA = join(HERE, '..');
const SHARED = join(REPO, 'shared');
/**
 * The shared compiler's own test home.
 *
 * IN SCOPE because Rule 4 is about the modules under work, and A1's measurement counted
 * `shared/swanLawFilter.mjs` — whose tests live here. A4b found this tree by the same route
 * that found the shipped assets: by widening the scope and seeing what it had been silent
 * about. `swanLawFilter.test.mjs` was at 321 lines after A4b's guard landed, and nothing was
 * watching it, because "every shared module" had quietly meant "not the shared modules'
 * tests".
 */
const SHARED_TESTS = join(REPO, 'backend', 'tests', 'node-runner');

/** Rule 4's budget. A file AT the cap is legal — 300 lines, not 299. */
const CAP = 300;

/** Subtrees the walker must actually reach. A walker that skips one is silent. */
const ASTRA_SUBTREES = ['core', 'surface', 'mcp', 'tests', 'static'];

/**
 * The extensions each tree is held to. The Astra tree includes the two SHIPPED
 * ASSETS the browser loads — a client script or stylesheet is as much a module as
 * anything else here, and `astra.js` was the file that proved it by exceeding the cap
 * while out of scope.
 */
const ASTRA_EXTS = Object.freeze(['.mjs', '.js', '.css']);
const SHARED_EXTS = Object.freeze(['.mjs']);
const SHARED_TESTS_EXTS = Object.freeze(['.mjs']);

/**
 * Files that ARE over the cap and are NOT this slice's to split, named so they are visible
 * rather than omitted. Keyed by repo-relative path, in the shape `UNWIRED_CONTROLS` uses —
 * the same pattern for the same reason: an exception written down in a note is an exception
 * nobody re-reads, and this list is asserted in BOTH directions below.
 *
 * NO LINE COUNT IS RECORDED. A remembered number reported as a measurement is the `T-M-03`
 * defect this project keeps naming; the number is read from disk when the test runs, and the
 * staleness check is what keeps the entry honest.
 */
const DECLARED_EXCEPTIONS = Object.freeze({
  'backend/tests/node-runner/variantRun.test.mjs': {
    why: 'over the cap BEFORE A4b touched anything (committed at 015eac6c3), so it is a '
      + 'pre-existing overflow, not one this slice introduced. Splitting it would mean '
      + 'editing another workstream\'s test file in a slice about the override editor.',
    owner: 'the variant-store workstream (EX-0 / SWA-231) — not Astra',
  },
});

/** Every file with one of `exts` under `dir`, recursively, skipping dep dirs. */
function walk(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => entry.endsWith(e))) out.push(p);
  }
  return out;
}

const lineCount = (p) => readFileSync(p, 'utf8').split('\n').length;

/**
 * The checker, as a pure function of a file list — so it can be pointed at a
 * synthetic tree and made to FAIL. A guard that has never been observed failing
 * is a guard whose green means nothing.
 */
function offenders(paths) {
  return paths
    .map((p) => ({ path: p, lines: lineCount(p) }))
    .filter((x) => x.lines > CAP)
    .sort((a, b) => b.lines - a.lines);
}

const astraFiles = walk(ASTRA, ASTRA_EXTS);
const sharedFiles = walk(SHARED, SHARED_EXTS);
const sharedTestFiles = walk(SHARED_TESTS, SHARED_TESTS_EXTS);

/** A repo-relative path, so an exception key is portable across worktrees. */
const rel = (p) => relative(REPO, p).split(/[\\/]/).join('/');

test('Rule 4: every Astra module AND shipped asset is within 300 lines', () => {
  const over = offenders(astraFiles);
  assert.deepEqual(over.map((o) => `${rel(o.path)} — ${o.lines} lines`), [],
    `these Astra files exceed Rule 4's ${CAP}-line budget — split at a real seam, never by trimming:`);
});

test('Rule 4: every shared module is within 300 lines', () => {
  const over = offenders(sharedFiles);
  assert.deepEqual(over.map((o) => `${rel(o.path)} — ${o.lines} lines`), [],
    `these shared modules exceed Rule 4's ${CAP}-line budget:`);
});

test('Rule 4: the shared compiler\'s TESTS are within budget, except where declared', () => {
  // The tree that was silently out of scope. A4b's guard landed here and pushed
  // `swanLawFilter.test.mjs` to 321 without anything noticing — because "every shared
  // module" had meant "not the shared modules' tests". It is split now (the 7 LAW 3
  // carriage tests live in `swanLawFilterKillList.test.mjs`), and this is what holds it.
  const over = offenders(sharedTestFiles);
  const excused = new Set(Object.keys(DECLARED_EXCEPTIONS));
  const unexplained = over.filter((o) => !excused.has(rel(o.path)));
  assert.deepEqual(unexplained.map((o) => `${rel(o.path)} — ${o.lines} lines`), [],
    `these test files exceed Rule 4's ${CAP}-line budget and have no declared exception:`);
  // And the excused ones are REPORTED, so the exception is visible in a failing run rather
  // than being a hole nobody can see.
  const excusedNow = over.filter((o) => excused.has(rel(o.path)));
  assert.ok(excusedNow.length > 0,
    'no declared exception is currently over the cap — the list is stale, delete the entries');
});

test('Rule 4: a declared exception is never STALE — the list must not outlive its reasons', () => {
  // Both directions, as `UNWIRED_CONTROLS` is checked. An exception whose file has been
  // split (or deleted) is an exception that will silently excuse the NEXT overflow of that
  // path, which is exactly how a dead-control list becomes permanent.
  const overPaths = new Set(offenders([...astraFiles, ...sharedFiles, ...sharedTestFiles]).map((o) => rel(o.path)));
  for (const [path, entry] of Object.entries(DECLARED_EXCEPTIONS)) {
    assert.ok(overPaths.has(path),
      `${path} is excused from Rule 4 but is NOT over the cap — delete the exception`);
    assert.ok(entry.why && entry.why.length > 60, `${path} needs a real reason, not a label`);
    assert.ok(entry.owner, `${path} needs an owner, or nobody will ever split it`);
  }
});

test('Rule 4: the walker really reaches the trees — an empty inventory cannot pass', () => {
  // The failure this catches: a wrong path or a broken walk yields zero files,
  // `offenders([])` is `[]`, and the two tests above go GREEN while checking
  // nothing. A budget guard that passes on an empty tree is worse than no guard.
  assert.ok(astraFiles.length >= 30, `expected the Astra modules, found ${astraFiles.length}`);
  assert.ok(sharedFiles.length >= 30, `expected the shared modules, found ${sharedFiles.length}`);
  // The tree added by the widening that found `swanLawFilter.test.mjs` at 321.
  assert.ok(sharedTestFiles.length >= 10,
    `expected the shared compiler's tests, found ${sharedTestFiles.length} — the third scope is not being walked`);
  assert.ok(sharedTestFiles.some((p) => p.endsWith('swanLawFilterKillList.test.mjs')),
    'the split-out LAW 3 suite must be inside the walked scope, or the split is unguarded');

  // And it reaches each subtree, not just the root of each.
  for (const sub of ASTRA_SUBTREES) {
    const inSub = astraFiles.filter((p) => relative(ASTRA, p).split(/[\\/]/)[0] === sub);
    assert.ok(inSub.length > 0, `the walker found no files under scripts/astra/${sub}`);
  }
  // The SHIPPED ASSETS specifically — this is the subtree that was out of scope until
  // the guard was widened, and `astra.js` was over the cap the whole time.
  assert.ok(astraFiles.some((p) => p.endsWith('.js')), 'the walker did not reach the client scripts');
  assert.ok(astraFiles.some((p) => p.endsWith('.css')), 'the walker did not reach the stylesheet');
  // The shared tree is deeper than one level and must be walked that far.
  assert.ok(sharedFiles.some((p) => relative(SHARED, p).includes(join('providers'))),
    'the walker did not descend into shared/providers');
});

test('Rule 4: the cap is INCLUSIVE — 300 lines is legal, 301 is not', () => {
  // This test USED to assert that some real module sat at exactly 300 lines, on the
  // grounds that a real file exercises the boundary better than a fixture. That was a
  // check on a COINCIDENCE: it held only while `server.mjs` happened to be 300 lines,
  // and it went red the moment A4b split that file for room. The boundary is a
  // property of the CHECKER, so it is proven against fixtures below — see
  // "the checker CAN fail" — where 300 and 301 are written deliberately.
  //
  // Kept as its own test because the failure it caused is worth recording: an
  // assertion about the current tree's incidental shape, dressed as an assertion
  // about a rule, fails for the wrong reason and teaches nothing.
  assert.equal(CAP, 300, 'the cap is 300 lines');
  assert.deepEqual(offenders([]), [], 'an empty file list has no offenders');
});

test('Rule 4: the checker CAN fail — a synthetic 301-line module is reported', () => {
  // The whole point. Without this, the two green tests above are a claim that the
  // checker works, made by the checker.
  const dir = mkdtempSync(join(tmpdir(), 'astra-budget-'));
  try {
    const okFile = join(dir, 'exactly-300.mjs');
    const overFile = join(dir, 'one-over.mjs');
    writeFileSync(okFile, Array.from({ length: CAP }, (_, i) => `// line ${i}`).join('\n'), 'utf8');
    writeFileSync(overFile, Array.from({ length: CAP + 1 }, (_, i) => `// line ${i}`).join('\n'), 'utf8');

    // No trailing newline in the fixtures, so the count is exactly as written.
    assert.equal(lineCount(okFile), CAP, 'the fixture must be exactly at the cap');
    assert.equal(lineCount(overFile), CAP + 1);

    const found = offenders([okFile, overFile]);
    assert.equal(found.length, 1, 'exactly the over-cap file must be reported');
    assert.equal(found[0].path, overFile);
    assert.equal(found[0].lines, CAP + 1);

    // And the same checker run over the real trees reports nothing — the same
    // function, both directions, in one test. The exception is subtracted because a
    // declared exception is a recorded decision, not a passing check.
    const real = offenders([...astraFiles, ...sharedFiles, ...sharedTestFiles])
      .filter((o) => !Object.hasOwn(DECLARED_EXCEPTIONS, rel(o.path)));
    assert.deepEqual(real, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
