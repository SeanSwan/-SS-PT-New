/*
 * R6-02 — RESOLVER DIAGNOSTICS, FALSY THROWS, AND UNRESOLVED-ROOT AUTHORITY
 * (Astra round 6, 2026-09-20).
 *
 * THE DEFECT, in three parts, all inside the R5-02 fix itself:
 *
 *   1. `brainsStore` and `realpathOrNull` called `damaged()` with NO `file`, so a root
 *      EACCES surfaced through `countPublished()` as damage to **`current.json`** — a
 *      filename that is not the problem.
 *   2. `if (err && err.code !== 'ENOENT')` is a FALSY test used as a PRESENCE test —
 *      the exact shape R5-01 removed from `pointer.mjs`, reintroduced one function over.
 *      A non-`Error` throw (`undefined`, `null`, `false`, `0`, `''`) made the guard read
 *      as "the store does not exist": a confident absence over a fault.
 *   3. `containedPath` required BOTH the target and the root to be non-null, so the one
 *      combination where skipping means the check never ran for a target that DOES exist
 *      — a resolved target against an unresolved root — was the one it skipped.
 *
 * The r5 package states all three as requirements (P/17-astra-mega-reply-r5.md:617-621):
 * *"Root failures name `brains`. … Leaf failures retain their leaf filename. … A
 * successfully resolved target cannot be authorized against an unresolved root."*
 *
 * WHY THE ROOT RULE CANNOT SIMPLY REFUSE EVERY NULL ROOT. An honestly absent store is
 * not a fault — there is nothing to escape from — so R6-02d pins the both-absent case as
 * the control. A fix that refused it would break every first run.
 *
 * @module creator-brains-console/test/containment.r6
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import { brainsStore, containedPath, setRealpathForTest } from '../lib/containment.mjs';
import { countPublished } from '../lib/read-surface.mjs';
import { fixtureRoot } from './fixtures.mjs';

/** A real directory, so the lexical checks have something honest to work with. */
function dir(label) {
  const d = tempRoot(label);
  mkdirSync(d, { recursive: true });
  return d;
}

/** A resolver that fails the way a denied ACL fails. */
function denied(code = 'EACCES') {
  return () => {
    const err = new Error(`${code}: injected denial`);
    err.code = code;
    throw err;
  };
}

test.after(() => { setRealpathForTest(null); });

/* ── 1. every refusal names a file ─────────────────────────────────────────── */

test('R6-02a: a root resolution failure NAMES `brains`, not `current.json`', () => {
  const d = dir('r602a');
  setRealpathForTest(denied('EACCES'));
  try {
    assert.throws(
      () => brainsStore(d),
      (err) => {
        assert.equal(err.code, 'STORE_DAMAGED');
        assert.equal(err.extra.file, 'brains', 'the file named is the one that failed');
        return true;
      },
    );
  } finally {
    setRealpathForTest(null);
  }
});

test('R6-02e: a leaf resolution failure keeps the CALLER\'s filename', () => {
  const d = dir('r602e');
  const realRoot = realpathSync(d);
  setRealpathForTest(denied('EACCES'));
  try {
    assert.throws(
      () => containedPath(d, realRoot, join(d, 'gen-0001'), 'the leaf', 'rules.jsonl'),
      (err) => {
        assert.equal(err.code, 'STORE_DAMAGED');
        assert.equal(err.extra.file, 'rules.jsonl', 'the leaf keeps its own name');
        return true;
      },
    );
  } finally {
    setRealpathForTest(null);
  }
});

test('R6-02f: the status count blames `brains` when the root cannot be resolved', () => {
  const r = fixtureRoot('r602f');
  setRealpathForTest(denied('EACCES'));
  try {
    // Astra's own reproduction path: the misleading diagnostic is observable through
    // the composite status instrument, not only through the helper.
    const { count, damage } = countPublished(r);
    assert.equal(count, null, 'a count that cannot be taken is null, never 0');
    assert.ok(damage, 'and the damage is named');
    assert.equal(damage.file, 'brains', 'the file named is the one that failed');
  } finally {
    setRealpathForTest(null);
  }
});

/* ── 2. a falsy thrown value is a fault, not an absence ────────────────────── */

for (const [label, thrown] of [
  ['undefined', undefined],
  ['null', null],
  ['false', false],
  ['zero', 0],
  ['empty-string', ''],
]) {
  test(`R6-02b/${label}: a FALSY thrown value refuses, and is NOT read as an absent store`, () => {
    const d = dir(`r602b-${label}`);
    setRealpathForTest(() => { throw thrown; });
    try {
      // `err && err.code !== 'ENOENT'` was false for every one of these, so the catch
      // fell through to "no store yet" and returned `realRoot: null`.
      assert.throws(
        () => brainsStore(d),
        (err) => {
          assert.equal(err.code, 'STORE_DAMAGED', 'a fault is a fault whatever was thrown');
          assert.equal(err.extra.file, 'brains');
          return true;
        },
      );
    } finally {
      setRealpathForTest(null);
    }
  });
}

/* ── 3. a resolved target needs a resolved root ────────────────────────────── */

test('R6-02c: a target that RESOLVED is refused when the root did not resolve', () => {
  const d = dir('r602c');
  const target = join(d, 'gen-0001');
  writeFileSync(target, 'x', 'utf8'); // it exists, so it really resolves

  // The old condition required BOTH non-null, so `realRoot === null` skipped the check
  // for a target that exists — the guard switched itself off exactly where it mattered.
  assert.throws(
    () => containedPath(d, null, target, 'a resolved target', 'current.json'),
    (err) => {
      assert.equal(err.code, 'STORE_DAMAGED');
      assert.equal(err.extra.file, 'brains', 'the subject is the store root, so name it');
      return true;
    },
  );
});

test('R6-02d: a target and a root that are BOTH absent are still not a fault', () => {
  const d = dir('r602d');
  const target = join(d, 'gen-0001'); // does not exist, and neither does the store

  // The control that keeps the fix from over-refusing. An absent store is not damage,
  // and every first run has one.
  assert.equal(
    containedPath(d, null, target, 'an absent generation', 'current.json'),
    target,
  );
});

test('R6-02g: a healthy store still counts exactly', () => {
  const r = fixtureRoot('r602g');

  // The other direction of the same control: narrowing the root rule must not turn a
  // readable store into a refusal.
  const { count, damage } = countPublished(r);
  assert.equal(count, 0, 'the seeded store publishes nothing yet, and 0 is a real reading');
  assert.equal(damage, null, 'and nothing is damaged');
});
