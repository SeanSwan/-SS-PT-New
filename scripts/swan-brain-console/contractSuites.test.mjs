/**
 * contractSuites.test — is the gate's list of suites actually complete?
 * @module scripts/swan-brain-console/contractSuites.test
 *
 * WHY THIS SUITE EXISTS
 * `npm run verify` runs a hand-written list of suites. Round 6 compared that list against the
 * directory it claims to cover and found SIX suites it did not name — 92 passing tests that
 * the gate had never run. The list had already been wrong once before, for
 * `gateHealth.test.mjs`, and the lesson recorded at the time ("a suite nothing invokes is a
 * suite that never runs") did not prevent it recurring, because nothing checked the list
 * against reality.
 *
 * This suite is that check, pinned from both directions:
 *   GREEN — the shipped list names every suite under this gate's roots.
 *   RED   — an incomplete list is actually reported, so the check cannot be a no-op that
 *           happens to return empty for every input.
 *
 * The RED half matters more than the GREEN one. A guard only ever seen green is a guard
 * nobody has read, and a `missingSuites` that returned `[]` unconditionally would satisfy
 * every green assertion here.
 *
 * Run: node --test scripts/swan-brain-console/contractSuites.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NODE_CONTRACT_SUITES, OWNED_SUITE_ROOTS, suitesOnDisk, missingSuites,
} from './contractSuites.mjs';
import { SUITE_RATIONALE } from './contractSuites.rounds.mjs';
import { SUITE_RATIONALE_16_17 } from './contractSuites.rounds-16-17.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

/*
 * THE RATIONALE MAP, MERGED. Two files because they grow at different rates: rounds 11–15 are
 * closed regression cover, rounds 16–17 are the engagement still under review. The check below
 * treats them as one map, so a suite cannot hide by being filed in neither.
 *
 * THE LEGACY GAP IS COUNTED, NOT FAILED. 24 of the 53 suites predate the rationale map and their
 * reasons live only in their own headers. A check that failed on all 24 would be switched off
 * within a round — and a check nobody runs protects nothing. So: a NEW name with no entry FAILS
 * (that is the drift this exists to stop), and the legacy gap is asserted as a NUMBER, so it can
 * only shrink or be consciously raised.
 */
const RATIONALE = { ...SUITE_RATIONALE, ...SUITE_RATIONALE_16_17 };
const LEGACY_GAP = 24;

/* ── GREEN: the shipped list is complete ──────────────────────────────────── */

test('the shipped list names every suite under this gate\'s own roots', () => {
  // This is the assertion that would have caught the seven. If it is red, a suite exists
  // that `npm run verify` will never run — add it to NODE_CONTRACT_SUITES.
  const missing = missingSuites();
  assert.deepEqual(missing, [], `unrun suites: ${missing.join(', ')}`);
});

test('every suite the list names actually exists', () => {
  // The other direction: a stale entry would make the whole stage fail with
  // "Cannot find module", which reads as a broken gate rather than a stale list.
  for (const rel of NODE_CONTRACT_SUITES) {
    assert.ok(existsSync(join(REPO, rel)), `${rel} is named but does not exist`);
  }
});

test('the list has no duplicates', () => {
  // A duplicate is harmless to `node --test` but means two entries drifted apart somewhere,
  // and it makes the "is it complete" question harder to read than it needs to be.
  assert.equal(new Set(NODE_CONTRACT_SUITES).size, NODE_CONTRACT_SUITES.length);
});

test('this suite is itself named, so the check cannot be excluded from the run', () => {
  // A completeness check that is not run by the thing it checks is the same defect it exists
  // to catch. `contractSuites.test.mjs` must be in the list it validates.
  assert.ok(
    NODE_CONTRACT_SUITES.includes('scripts/swan-brain-console/contractSuites.test.mjs'),
    'contractSuites.test.mjs is not in NODE_CONTRACT_SUITES — this check would never run',
  );
});

test('the owned roots are non-empty, relative, and really exist', () => {
  assert.ok(OWNED_SUITE_ROOTS.length > 0);
  for (const root of OWNED_SUITE_ROOTS) {
    assert.ok(!root.startsWith('/') && !/^[A-Za-z]:/.test(root), `${root} is not repo-relative`);
    assert.ok(existsSync(join(REPO, root)), `${root} does not exist`);
  }
});

test('the scan finds a plausible number of suites, so it is not silently empty', () => {
  // If the walk silently returned nothing — a bad root, a permissions change, a refactor of
  // `readdirSync` usage — every other assertion here would still pass.
  const onDisk = suitesOnDisk();
  assert.ok(onDisk.length >= NODE_CONTRACT_SUITES.length, `scan found only ${onDisk.length} suites`);
  assert.ok(onDisk.every((f) => f.endsWith('.test.mjs')));
  assert.ok(onDisk.every((f) => !f.includes('\\')), 'paths must use forward slashes');
});

/* ── RED: the check actually fires ────────────────────────────────────────── */

test('RED — an incomplete list is reported, not silently accepted', () => {
  /*
   * The whole point. `missingSuites` takes the list as a parameter precisely so this can be
   * tested: hand it a list missing most of the suites and it must name them. Without this,
   * a `missingSuites` that always returned `[]` would pass every GREEN assertion above.
   */
  const truncated = ['scripts/swan-brain-console/engine-contract.test.mjs'];
  const missing = missingSuites(truncated);
  assert.ok(missing.length > 0, 'an incomplete list reported nothing missing');
  assert.ok(missing.includes('scripts/swan-brain-console/gateHealth.test.mjs'));
  assert.ok(missing.includes('scripts/swan-brain-console/shot-diff.test.mjs'));
  assert.ok(missing.includes('scripts/swan-brain-console/app/app-gates.test.mjs'));
  // And nothing named may be reported as missing.
  assert.ok(!missing.includes('scripts/swan-brain-console/engine-contract.test.mjs'));
});

test('RED — an empty list reports every suite on disk', () => {
  assert.equal(missingSuites([]).length, suitesOnDisk().length);
});

/* ── the failure message has to be actionable ─────────────────────────────── */

test('the gate reports the missing suites by name, not just a count', () => {
  // A failure that says "3 suites missing" sends the reader hunting. `verify-all.mjs` must
  // name them. Asserted against the source, because the message only exists on the failure
  // path and cannot be reached from here without breaking the real list.
  const src = readFileSync(join(HERE, 'verify-all.mjs'), 'utf8');
  assert.match(src, /NEVER RUN by this gate/);
  assert.match(src, /missing\.join/);
});

/* ── the rationale map, and its drift ─────────────────────────────────────── */

test('a suite added to the list without a rationale is REFUSED', () => {
  /*
   * The drift this exists to stop is one-directional and easy to do by accident: add a name to
   * `NODE_CONTRACT_SUITES`, forget the entry, and the list gains an entry nobody can retire.
   *
   * MUTATION: append a new path to `NODE_CONTRACT_SUITES` and nothing else. This goes RED, and
   * the message names the suite rather than the count — a count tells you a thing is wrong, a
   * name tells you which file to open.
   */
  const unexplained = NODE_CONTRACT_SUITES.filter((rel) => !(rel in RATIONALE));
  assert.equal(unexplained.length, LEGACY_GAP,
    'the set of suites with no rationale changed. If you ADDED a suite, add its entry to '
    + '`contractSuites.rounds-16-17.mjs`; if you BACKFILLED legacy ones, lower LEGACY_GAP. '
    + `Unexplained suites: ${unexplained.join(', ')}`);
});

test('the legacy gap only shrinks — backfilling is progress, not a budget', () => {
  // The assertion above pins an exact count, which would also pass if someone swapped one
  // explanation for another. This one is the direction: the gap may not GROW.
  const unexplained = NODE_CONTRACT_SUITES.filter((rel) => !(rel in RATIONALE));
  assert.ok(unexplained.length <= LEGACY_GAP,
    `the unexplained set grew from ${LEGACY_GAP} to ${unexplained.length} — new suites must ship with an entry`);
});

test('no rationale names a suite the list does not contain', () => {
  // The other direction, and the one that rots silently: retire a suite, leave its paragraph,
  // and the file now documents something that does not run. That reads as covered work.
  const stray = Object.keys(RATIONALE).filter((rel) => !NODE_CONTRACT_SUITES.includes(rel));
  assert.deepEqual(stray, [], `rationale entries naming no suite in the list: ${stray.join(', ')}`);
});

test('every rationale entry is real prose, not an empty string', () => {
  // A key with an empty value satisfies every check above and explains nothing — the shape of a
  // check that passes by having nothing to check.
  const empty = Object.entries(RATIONALE)
    .filter(([, text]) => typeof text !== 'string' || text.trim().length < 80)
    .map(([rel]) => rel);
  assert.deepEqual(empty, [], `rationale entries that explain nothing: ${empty.join(', ')}`);
});

/* ── Rule 4 ──────────────────────────────────────────────────────────────── */

test('Rule 4: this module and its runner stay within 300 lines', () => {
  // `verify-all.mjs` was 310 lines before the suite list moved out of it. It is named here
  // because no other suite in this subsystem covered it, so the file was over budget with
  // nothing saying so.
  //
  // `contractSuites.list.mjs` is named for the same reason in reverse: round 16's two additions
  // pushed `contractSuites.mjs` to 315 lines, and the list moved out rather than the budget being
  // widened. The new file is the half that will keep growing — one entry per suite, forever — so
  // it is exactly the file that needs a budget naming it before it needs one.
  for (const f of [
    'contractSuites.mjs', 'contractSuites.list.mjs', 'contractSuites.test.mjs', 'verify-all.mjs',
    'contractSuites.rounds.mjs', 'contractSuites.rounds-16-17.mjs',
  ]) {
    const lines = readFileSync(join(HERE, f), 'utf8').split('\n').length;
    assert.ok(lines <= 300, `${f} is ${lines} lines`);
  }
});
