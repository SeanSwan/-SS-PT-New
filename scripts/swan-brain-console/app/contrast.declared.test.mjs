/**
 * contrast.declared.test — what a rule DECLARES, and which declaration wins.
 * @module scripts/swan-brain-console/app/contrast.declared.test
 *
 * THE FIFTEENTH RULE 4 SPLIT IN THIS SUBSYSTEM, and the second inside the contrast pair.
 * `contrast.test.mjs` owns the FLOOR: is every text colour readable on the surface it renders on?
 * This file owns the READING that question depends on — whether the surface a rule declares is
 * the one the module thinks it is.
 *
 * THE BOUNDARY IS THE FAILURE DIRECTION, which is why these are two files rather than one.
 * A defect here produces the WRONG SURFACE: the ratio check then reports a confident verdict about
 * a colour the browser never paints — green when the rule is unreadable, or red when it is fine.
 * A defect in the sibling produces the wrong VERDICT on the right surface. One publishes a false
 * clearance, the other a false alarm, and they are found by asking different questions: this file
 * asks "did we read the rule correctly?", the sibling asks "is this pair legible?".
 *
 * WHAT LIVES HERE (all round 17, Astra round-16 finding L05):
 *   - `decl()` returned the FIRST declaration in a body, while CSS applies the LAST. `rules()`
 *     concatenates bodies per selector, so a base rule plus an override arrives as one string with
 *     two declarations, and the losing one was being measured.
 *   - `ownSurface()` returned `null` BOTH for "declares no background" and for "declares one I
 *     cannot resolve". Only the first may fall back to the token's default; the second must be
 *     accounted for, or the ratio check measures a surface that is not on screen.
 *
 * Run: node --test scripts/swan-brain-console/app/contrast.declared.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  palette, decl, decls, ownSurface, declaredSurface, unresolvableBackgrounds,
} from './contrast.mjs';

describe('a rule declaring an unresolvable background is ACCOUNTED FOR, not measured (Astra L05)', () => {
  test('the rules with an unreadable background are the known set, and no more', () => {
    /*
     * WHY A COUNT AND NOT ZERO. `color-mix()`, gradients and `transparent` are this module's
     * stated static limit, and EIGHTEEN shipped rules use them — `color-mix()` is not an edge case
     * in this stylesheet, it is how translucent surfaces are written. Asserting zero would force
     * either a refusal of the whole technique or an exception list grown until it hides the next
     * real case. Asserting the exact count means adding a rule with a gradient changes this number
     * deliberately, in a diff, on purpose.
     *
     * THE FIRST DRAFT OF THIS TEST EXPECTED FIVE, because I read the first five lines of the
     * report and stopped. The true set is 18 of 27 background-declaring rules; the number here is
     * the measured one, not the guessed one.
     *
     * MUTATION: make `declaredSurface` report `declares: false` for an unresolvable background
     * (collapsing the two facts, which is L05 itself). `body` in app.css falls back to the token
     * default, the count drops, and this goes RED.
     */
    const unreadable = unresolvableBackgrounds();
    const at = (s) => unreadable.find((x) => x.includes(`"${s}"`));
    for (const selector of [
      'body', '.tabs button:hover', '.dismiss', '.goto', '.help-btn', '.artboard', '.welcome',
    ]) {
      assert.ok(at(selector), `${selector} declares a background this module cannot resolve, but is `
        + `not reported — its contrast would be measured against a surface that is not on screen. `
        + `Reported: ${unreadable.join(' | ')}`);
    }
    assert.equal(unreadable.length, 18,
      `the set of unreadable backgrounds changed to ${unreadable.length}: ${unreadable.join(' | ')}`);
    /*
     * `visited` IS THE INPUT IT READ, so a version that scanned nothing — and therefore reported
     * nothing — cannot pass as a clean result. Round 16 found exactly this in
     * `uncomputableRules()`'s default path: an empty correct answer and an empty function are
     * indistinguishable from their output alone. The same defence, for the same reason.
     */
    assert.equal(unreadable.visited, 27,
      `${unreadable.visited} rules declaring a background were examined, not 27 — the accounting `
      + 'is not reading the stylesheets it claims to cover');
  });

  test('a resolvable background is NOT reported — the accounting is not a blanket refusal', () => {
    // The over-correction control. If this list grew to include every rule that declares a
    // background, the previous test's count would be satisfiable while the guard reported noise.
    const synthetic = [
      { file: 'x.css', selector: '.ok', body: ';background: var(--purple)' },
      { file: 'x.css', selector: '.odd', body: ';background: #fff' },
    ];
    assert.deepEqual(unresolvableBackgrounds(synthetic), [],
      'a background the module CAN resolve was reported as unreadable');
    assert.equal(unresolvableBackgrounds(synthetic).visited, 2,
      'the accounting did not examine the resolvable rules it was given');
    assert.deepEqual(
      unresolvableBackgrounds([{ file: 'x.css', selector: '.mix', body: ';background: color-mix(in srgb, red, blue)' }]),
      ['x.css ".mix" background: color-mix(in srgb, red, blue)'],
      'the accounting reported nothing for a background it cannot compute',
    );
  });
});

describe('the LAST declaration wins, because that is what CSS applies (Astra L05)', () => {
  test('decl() reads the declaration that wins, not the first one written', () => {
    /*
     * `rules()` concatenates every body for a selector with `;`, so a base rule plus an override
     * arrives as one string with two declarations. The old single-match regex returned the FIRST,
     * so `ownSurface` reported the surface of the declaration that was losing.
     *
     * MUTATION: `return all[0]`. RED — and it is the shipped defect exactly.
     */
    const pal = palette();
    const body = ';background: #fff; background: var(--purple)';
    assert.equal(decl(body, 'background'), 'var(--purple)',
      'decl() returned a declaration that CSS does not apply');
    assert.deepEqual(decls(body, 'background'), ['#fff', 'var(--purple)'],
      'decls() did not return every declaration in source order');
    assert.equal(ownSurface({ body }, pal), pal.get('--purple'),
      'ownSurface measured the rule on the surface it does not paint');

    // The shorthand/longhand boundary survives: `background` must not match `background-color`.
    assert.equal(decl(';background-color: #fff', 'background'), null,
      'the shorthand matched the longhand');
    assert.equal(decl(';background: #fff', 'background-color'), null,
      'the longhand matched the shorthand');
    assert.equal(decl(';background: none', 'background'), 'none', 'a non-colour value was dropped');
    assert.equal(decl(';color: red', 'background'), null, 'a rule with no background reported one');
  });

  test('RED — the winning surface is the LAST declaration ACROSS BOTH properties (Astra L09)', () => {
    /*
     * THE FIX ABOVE WAS PARTIAL AND ASTRA PROVED IT BY COUNTEREXAMPLE. `decl()` learned that the
     * last declaration of ONE property wins — but `declaredSurface` still asked
     * `decl(body,'background') ?? decl(body,'background-color')`, which answers "does a shorthand
     * exist?" and never asks WHEN. The shorthand beat the longhand regardless of order.
     *
     *     color: #fff;
     *     background: #000;
     *     background-color: #fff;      <- last, and therefore what the browser paints
     *
     * The analyzer reported #000 (white on black, 21:1, a comfortable pass). The rule is white on
     * white — 1:1, unreadable. A guard whose entire purpose is catching unreadable text was
     * certifying the worst case it exists to find.
     *
     * MUTATION: `return all[all.length - 1]` inside `winningBackground`, or a `??` between the two
     * property reads. RED for BOTH orders in this test — the assertion is symmetric on purpose,
     * because only one order was in my first draft and the other is the one a `??` gets wrong.
     */
    const pal = palette();

    // Order A: shorthand first, longhand LAST — the longhand wins.
    const a = ';color: #fff; background: #000; background-color: #fff';
    assert.equal(declaredSurface({ body: a }, pal).raw, '#fff',
      'the longhand was written LAST and CSS applies it, but the shorthand was returned');
    assert.equal(declaredSurface({ body: a }, pal).hex, pal.get('--frost-white') ?? '#ffffff',
      'the winning surface was not resolved to the colour the browser paints');

    // Order B: longhand first, shorthand LAST — the shorthand wins.
    const b = ';color: #fff; background-color: #fff; background: #000';
    assert.equal(declaredSurface({ body: b }, pal).raw, '#000',
      'the shorthand was written LAST and CSS applies it, but the longhand was returned');

    // And the L05 case must still hold — the fix must not have traded one for the other.
    const c = ';background: #fff; background: var(--purple)';
    assert.equal(declaredSurface({ body: c }, pal).raw, 'var(--purple)',
      'the same-property ordering that L05 fixed was broken again by the L09 repair');
  });
});
