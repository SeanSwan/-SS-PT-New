/*
 * store-attacks.r8.test.mjs — R8-07, the containment predicate in the fixture validator.
 *
 * WHY THIS FINDING IS THE HEADLINE OF ROUND 8. R7-01 found a string-prefix containment
 * test in `lib/containment.mjs` — `!rel.startsWith('..')` — and removed it, because a
 * name that merely BEGINS with two dots (`..notes`) is not a parent-directory component
 * and refusing it made a legal store name damage. Round 8 found the SAME class of test
 * still standing one file over, in this harness's `junction()` proof:
 *
 *   !real.toLowerCase().startsWith(realStore.toLowerCase())
 *
 * Six consecutive rounds have now confirmed that a fix aimed at a row is not a fix aimed
 * at a class. The copy survived because the guard's fix was correct and the copy was
 * somewhere else — and because no test asserted the property, only the behaviour that
 * happened to depend on it.
 *
 * WHAT IS ASSERTED HERE. `escapes()` is exercised in BOTH directions, because a prefix
 * test is wrong in both and only one of them is loud:
 *   - OVER-PERMISSIVE: a sibling named `store-evil` was judged INSIDE the store, so a
 *     correctly-constructed attack reported "the attack was not constructed".
 *   - OVER-REFUSING: `..notes` was judged a traversal, which is R7-01's defect verbatim.
 * And then the live one: a real junction to such a sibling must still be recognised as an
 * attack, on a real filesystem, because that is the case the prefix test got wrong.
 *
 * @module creator-brains-console/test/store-attacks.r8
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { escapes } from './path-containment.mjs';
import { junction } from './store-attacks.mjs';
import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';

test('R8-07a: `escapes` is component-wise, in both directions', () => {
  const root = resolve('store');
  const under = (...p) => join(root, ...p);

  // INSIDE — and the first two are the cases a prefix test gets WRONG.
  assert.equal(escapes(root, under('brains')), false);
  assert.equal(escapes(root, under('..notes')), false, 'a name BEGINNING with two dots is an ordinary name');
  assert.equal(escapes(root, root), false, 'the root itself is not outside the root');

  // OUTSIDE — and the first is the case a prefix test gets WRONG.
  assert.equal(escapes(root, `${root}-evil`), true, 'a SIBLING whose name begins with the root name is outside');
  assert.equal(escapes(root, resolve(root, '..')), true, 'a real parent component');
  assert.equal(escapes(root, resolve(root, '..', 'sibling')), true);

  // A DRIVE-LETTER MISMATCH SHARES NO ROOT, so `relative` hands back an ABSOLUTE path.
  // That branch is Windows-only: on POSIX every absolute path shares `/`.
  if (process.platform === 'win32') {
    assert.equal(escapes(root, 'D:\\store'), true, 'a different drive is never inside');
  }
});

test('R8-07b: a junction into a SIBLING named like the store is still an attack', () => {
  // THE PREFIX TEST'S BLIND SPOT, ON A REAL FILESYSTEM. `…/store-evil` starts with
  // `…/store`, so the old proof judged this junction INSIDE the store and the assertion
  // reported "the attack was not constructed" — against a junction that escaped
  // perfectly well. A false alarm that reads as a broken fixture is how a weak guard
  // survives: nobody investigates a test that complains about its own setup.
  const base = tempRoot('r8-07');
  const store = join(base, 'store');
  const target = join(base, 'store-evil', 'gen-0001');
  mkdirSync(target, { recursive: true });
  mkdirSync(store, { recursive: true });
  writeFileSync(join(target, 'index.md'), '# outside the store\n', 'utf8');

  assert.doesNotThrow(() => junction(target, join(store, 'gen-0001'), store));
});
