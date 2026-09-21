/*
 * R6-01 — THE ORDINARY-FILE SKIP MUST PRECEDE THE CHILD RESOLUTION
 * (Astra round 6, 2026-09-20).
 *
 * THE DEFECT. R5-02 narrowed `realpathOrNull` so that ONLY `ENOENT` means absence and
 * every other resolution failure is damage. `resolvePointer` was not moved with it: it
 * contained the pointer path BEFORE asking what kind of entry the namespace was, so a
 * child beneath an ordinary file — which reports ENOTDIR, not ENOENT, on POSIX —
 * became STORE_DAMAGED instead of being skipped. The r5 package required the opposite
 * order in three places (P/17-astra-mega-reply-r5.md:105, :200, :585-590), and this is
 * the fourth round running in which a fix closed the row the review named and left the
 * neighbouring row of the same class standing.
 *
 * WHY IT WAS INVISIBLE ON THIS HOST. Measured 2026-09-20: a path beneath a FILE reports
 * **ENOENT**, because the LEAF does not exist and ENOTDIR is never reached. So the
 * pre-existing ordinary-file control stays green here and cannot see the ordering at
 * all — the defect is platform-conditional, live on POSIX, invisible on Windows.
 *
 * WHY THIS FILE COUNTS RESOLVER CALLS. The seam injects the ENOTDIR, so the assertion
 * has to prove the injection is LIVE — otherwise the test passes when the seam is dead,
 * which is the vacuous-green shape this suite has been bitten by repeatedly. So the
 * child is resolved DIRECTLY first (the injection must fire, exactly once), and the
 * reader is then required NOT to consult it again. The call count is the evidence.
 *
 * @module creator-brains-console/test/pointer.r6
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { realpathOrNull, setRealpathForTest } from '../lib/containment.mjs';
import { resolvePointer } from '../lib/pointer.mjs';
import { BRAIN_NS, fixtureRoot, seedPublishedBrain } from './fixtures.mjs';

/**
 * A resolver that delegates to the real one EXCEPT for one path, which fails with `code`.
 * `onHit` counts the hits, so a caller can prove the injection fired rather than assuming
 * it did — a value-only assertion would pass against a dead seam.
 *
 * Compared case-insensitively after `resolve()`: the path the reader passes is built from
 * `resolve(brainsDir)`, and on Windows a temp root can differ in case from the literal.
 */
function failingFor(victim, code, onHit) {
  const want = resolve(victim).toLowerCase();
  return (p) => {
    if (resolve(String(p)).toLowerCase() === want) {
      if (onHit) onHit();
      const err = new Error(`${code}: injected — the parent is not a directory`);
      err.code = code;
      throw err;
    }
    return realpathSync(p);
  };
}

test.after(() => { setRealpathForTest(null); });

test('R6-01a: an ordinary-file namespace is SKIPPED when its child reports ENOTDIR', () => {
  const r = fixtureRoot('r6-01a');
  const ns = 'stray-file';
  // An ordinary FILE where a namespace directory belongs — the engine drops it, so the
  // console must drop it too, or one stray file kills every query.
  writeFileSync(join(r, 'brains', ns), 'not a directory\n', 'utf8');
  const child = join(r, 'brains', ns, 'current.json');

  let hits = 0;
  setRealpathForTest(failingFor(child, 'ENOTDIR', () => { hits += 1; }));
  try {
    // PRECONDITION: the injection is live. Resolving the child directly IS a refusal —
    // this is the behaviour the ordering exists to avoid reaching.
    assert.throws(
      () => realpathOrNull(child, 'current.json'),
      (err) => {
        assert.equal(err.code, 'STORE_DAMAGED');
        assert.match(err.message, /ENOTDIR/, 'and it names the errno');
        return true;
      },
    );
    assert.equal(hits, 1, 'precondition: the injected resolver really is in force');

    const res = resolvePointer(r, ns);
    assert.deepEqual(
      res,
      { present: false, reason: 'absent' },
      'a stray file in brains/ is dropped, NOT reported as store damage',
    );
    assert.equal(hits, 1, 'and the reader never asked the resolver about that child');
  } finally {
    setRealpathForTest(null);
  }
});

test('R6-01b: the same skip holds with the REAL resolver, so it is not injection-only', () => {
  const r = fixtureRoot('r6-01b');
  const ns = 'stray-file-real';
  writeFileSync(join(r, 'brains', ns), 'not a directory\n', 'utf8');

  // No seam. This host answers ENOENT for the child, which is the other half of the
  // same skip: whichever errno the platform raises, the entry is dropped.
  assert.deepEqual(resolvePointer(r, ns), { present: false, reason: 'absent' });
});

test('R6-01c: a DIRECTORY namespace whose child fails for a real reason is still DAMAGE', () => {
  const r = fixtureRoot('r6-01c');
  const ns = 'broken-brain';
  mkdirSync(join(r, 'brains', ns), { recursive: true });
  const child = join(r, 'brains', ns, 'current.json');

  let hits = 0;
  setRealpathForTest(failingFor(child, 'EACCES', () => { hits += 1; }));
  try {
    // The control in the other direction. Moving the child resolution BELOW the kind
    // check must not make the reader lenient: a namespace that IS a directory, whose
    // pointer path cannot be resolved, is a broken publication and must still refuse.
    assert.throws(
      () => resolvePointer(r, ns),
      (err) => {
        assert.equal(err.code, 'STORE_DAMAGED');
        assert.match(err.message, /could not be resolved/);
        assert.match(err.message, /EACCES/, 'and it names the errno rather than hiding it');
        return true;
      },
    );
    assert.equal(hits, 1, 'the reader DID resolve the child — the namespace is a directory');
  } finally {
    setRealpathForTest(null);
  }
});

test('R6-01d: a healthy published brain still resolves, and names its generation', () => {
  const r = fixtureRoot('r6-01d');
  const seeded = seedPublishedBrain(r, BRAIN_NS);

  // The happy path, unchanged by the reorder.
  const res = resolvePointer(r, BRAIN_NS);
  assert.equal(res.present, true);
  assert.equal(res.generation, seeded.generation);
  assert.equal(res.pointer.creator_id, BRAIN_NS);
});

test('R6-01e: namespace containment still runs BEFORE the ordinary-file skip', () => {
  const r = fixtureRoot('r6-01e');

  // Only the CHILD resolution moved. An escaping namespace must still be refused rather
  // than skipped, or the reorder would have traded an over-refusal for a bypass.
  assert.throws(
    () => resolvePointer(r, '../../outside'),
    (err) => {
      assert.equal(err.code, 'STORE_DAMAGED');
      assert.match(err.message, /does not resolve inside the brains store/);
      return true;
    },
  );
});
