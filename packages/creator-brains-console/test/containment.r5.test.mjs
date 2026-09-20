/*
 * R5-02 — ONLY AN ACTUAL ABSENCE MAY BYPASS A CONTAINMENT CHECK (Astra round 5, 2026-09-20).
 *
 * THE DEFECT. Two broad catches turned every real-path RESOLUTION FAILURE into the
 * same value they use for "there is nothing here":
 *
 *   brainsStore()    a bare `catch` commented "no store yet"  -> realRoot = null
 *   realpathOrNull() a bare `catch { return null; }`          -> null
 *
 * `containedPath()` then skips the real-path check whenever either is null:
 *
 *   if (real !== null && realRoot !== null && !inside(realRoot, real)) throw ...
 *
 * Astra drove this with an INJECTED EACCES and measured the consequence: the read
 * proceeded, count 1, no damage named. One EACCES on the store root disables
 * real-path containment for the WHOLE request, leaving only the lexical `inside()`
 * — the check `realpathSync` exists to supplement, because it cannot see a junction.
 *
 * WHY THIS FILE INJECTS RATHER THAN CONSTRUCTS. Astra's rows need EACCES, which needs
 * privileges this host does not have. The constructible alternatives do not work, and
 * both were MEASURED before this seam was added (2026-09-20):
 *
 *   a path beneath a FILE  -> realpathSync reports **ENOENT**, because the LEAF does
 *                             not exist; it never reaches ENOTDIR
 *   a Windows junction LOOP -> realpathSync resolves it cleanly; no ELOOP is raised
 *
 * So the failure branch is unreachable by real filesystem means here, and the choice
 * was to ship the fix **unverified** or to add a seam. `lib/containment.mjs` now
 * exports `setRealpathForTest`, mirroring the existing `setProbeWorkerForTest`. The
 * seam is what makes this fix testable at all; Astra reached the same branch by
 * substituting filesystem responses in memory and recorded the reachability limit as
 * [UNKNOWN] rather than as a demonstrated disclosure.
 *
 * @module creator-brains-console/test/containment.r5
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';
import {
  brainsStore, containedPath, realpathOrNull, setRealpathForTest,
} from '../lib/containment.mjs';

/** A resolver that fails the way a denied ACL fails. */
function denied(code = 'EACCES') {
  return () => {
    const err = new Error(`${code}: injected denial`);
    err.code = code;
    throw err;
  };
}

/** A real directory, so the lexical checks have something honest to work with. */
function dir(label) {
  const d = tempRoot(label);
  mkdirSync(d, { recursive: true });
  return d;
}

test.after(() => { setRealpathForTest(null); });

test('R5-02a: a genuinely ABSENT path is still null, not damage', () => {
  const d = dir('r502a');
  // The control. Absence must keep meaning absence, or every missing generation
  // directory becomes a store fault and the drawer can never report one.
  assert.equal(realpathOrNull(join(d, 'nothing-here')), null);
});

test('R5-02b: a NON-ABSENCE resolution failure is damage, not null', () => {
  setRealpathForTest(denied('EACCES'));
  try {
    assert.throws(
      () => realpathOrNull('anything'),
      (err) => {
        assert.equal(err.code, 'STORE_DAMAGED', 'a resolution failure is store damage');
        assert.match(err.message, /could not be resolved/);
        assert.match(err.message, /EACCES/, 'and it NAMES the errno rather than hiding it');
        return true;
      },
    );
  } finally {
    setRealpathForTest(null);
  }
});

test('R5-02c: containedPath does not SKIP the check when resolution fails', () => {
  const d = dir('r502c');
  const realRoot = realpathOrNull(d); // resolved with the REAL resolver, first
  assert.ok(realRoot, 'precondition: the root resolves, so the skip cannot be blamed on it');

  setRealpathForTest(denied('EACCES'));
  try {
    // Before the fix this returned the target unchanged — the guard switched itself
    // off exactly when it could not do its job. It must refuse instead.
    assert.throws(
      () => containedPath(d, realRoot, join(d, 'gen-0001'), 'a denied target', 'current.json'),
      (err) => { assert.equal(err.code, 'STORE_DAMAGED'); return true; },
    );
  } finally {
    setRealpathForTest(null);
  }
});

test('R5-02d: a target that simply does not exist is still permitted', () => {
  const d = dir('r502d');
  const realRoot = realpathOrNull(d);
  // The other direction of the control: narrowing the catch must not turn every
  // absent generation directory into a fault. `containedPath` still returns the
  // target, and the CALLER distinguishes absence from damage on the read.
  const target = join(d, 'gen-0001');
  assert.equal(containedPath(d, realRoot, target, 'an absent generation', 'current.json'), target);
});

test('R5-02e: brainsStore refuses a root it cannot resolve for a non-absence reason', () => {
  const d = dir('r502e');
  setRealpathForTest(denied('EACCES'));
  try {
    // The old catch swallowed this and returned `realRoot: null`, which disables
    // real-path containment for the whole request.
    assert.throws(
      () => brainsStore(d),
      (err) => {
        assert.equal(err.code, 'STORE_DAMAGED');
        assert.match(err.message, /could not be resolved/);
        return true;
      },
    );
  } finally {
    setRealpathForTest(null);
  }
});

test('R5-02f: a store that does not exist yet is still not a fault', () => {
  const d = dir('r502f');
  const store = brainsStore(join(d, 'no-store-yet'));
  assert.equal(store.realRoot, null, 'ENOENT means no store, which is not damage');
  assert.ok(store.root, 'and the lexical root is still returned');
});

test('R5-02g: the seam itself is honest — it restores the real resolver', () => {
  const d = dir('r502g');
  setRealpathForTest(denied());
  setRealpathForTest(null);
  // A seam that cannot be disarmed would leave every later test in the process
  // resolving against a stub — the failure mode that makes an injected probe
  // untrustworthy rather than merely limited.
  assert.equal(realpathOrNull(d), realpathOrNull(d));
  assert.ok(realpathOrNull(d), 'the real resolver is back in place');
  writeFileSync(join(d, 'marker'), 'x', 'utf8');
  assert.equal(realpathOrNull(join(d, 'marker')), join(d, 'marker'));
});
