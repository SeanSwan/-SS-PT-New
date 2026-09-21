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
import { join, resolve, sep, relative } from 'node:path';

import { escapes } from './path-containment.mjs';
import { junction } from './store-attacks.mjs';
import { inside } from '../lib/containment.mjs';
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

test('R9-C3: the coincidence is EVERY empty-relative pair, not only identical strings', () => {
  // Astra round 9, P3 #6, MEASURED. The note on `escapes` said "THE ONE INPUT WHERE THIS
  // IS NOT SIMPLY `!inside()`" and named `target === root`. That is a case far narrower
  // than the behaviour: the exception is every pair whose `relative()` is `''`, and only
  // ONE of the four below is string equality. The other three are different strings
  // naming the same normalized path, which is exactly the distinction the note obscured —
  // and the reason a reader checking it against `inside()` one spelling at a time would
  // find an apparent disagreement the arithmetic says cannot exist.
  const root = resolve('store');
  const aliasDot = root + sep + '.';
  const aliasDotDot = root + sep + '.' + sep + '.';
  const aliasSub = root + sep + 'sub' + sep + '..';
  const sameSpot = [
    ['identical strings', root],
    ["root + sep + '.'", aliasDot],
    ["root + sep + '.' + sep + '.'", aliasDotDot],
    // BUILT BY CONCATENATION, NOT BY `join` OR `resolve` — both NORMALISE, so
    // `join(root, 'sub', '..')` and `resolve(root, 'sub', '..')` return the root's OWN
    // string and are not aliases at all. Measured, after this case failed twice on its
    // own precondition: the subject is "different strings naming the same path", and only
    // the un-normalised spelling is a different string.
    ['root + sep + \'sub\' + sep + \'..\'', aliasSub],
  ];
  for (const [label, alias] of sameSpot) {
    assert.equal(relative(root, alias), '', `precondition: '${label}' names the root itself`);
    assert.equal(escapes(root, alias), false, `'${label}': the root is not outside the root`);
    assert.equal(inside(root, alias), false, `'${label}': the root is not strictly inside`);
  }
  // THREE OF THE FOUR ARE NOT STRING EQUALITY, which is the whole point of the case.
  //
  // THIS IS DERIVED FROM `sameSpot`, NOT FROM THE VARIABLE NAMES, and the difference was
  // measured: the first version looped over `[aliasDot, aliasDotDot, aliasSub]` by name,
  // so DELETING a row from `sameSpot` left it fully green — the table above and the
  // assertion below were two independent statements of the same fact, and only one of
  // them was load-bearing. The `alias` is now read back out of the table, and `aliases` is
  // asserted to be exactly three so a dropped row fails on its own count.
  const aliases = sameSpot.slice(1).map(([, alias]) => alias);
  assert.equal(aliases.length, 3, 'the case pins THREE non-identical spellings');
  for (const alias of aliases) {
    assert.notEqual(alias, root, 'this alias must be a DIFFERENT STRING from the root');
  }
  assert.equal(new Set(aliases).size, 3,
    'the three aliases are distinct from each other, not one spelling counted thrice');

  // AND EVERYWHERE ELSE THEY ARE EXACT NEGATIONS — the claim the note makes, now checked
  // on the inputs a reader would actually reach for, not asserted in prose.
  for (const target of [join(root, 'child'), join(root, '..notes'), `${root}-sibling`,
    resolve(root, '..'), resolve(root, '..', 'other')]) {
    assert.equal(inside(root, target), !escapes(root, target),
      `${target} must satisfy inside() === !escapes()`);
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
