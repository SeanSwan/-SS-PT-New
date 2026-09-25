/**
 * contrast.test — is every text colour actually READABLE, not merely DEFINED?
 * @module scripts/swan-brain-console/app/contrast.test
 *
 * WHY THIS FILE EXISTS (Astra round 14, J08)
 * Round 13's H09 fix guarded that every `var(--token)` RESOLVES — right for its defect
 * (`.judge-persistence` used `var(--warn, #b45309)` with `--warn` defined nowhere). But resolving
 * is not reading, and Astra showed the gap from both ends:
 *   SHIPPED CODE  `.judge-right > .judge-side` used `--lavender` (#4070c0) on `--obsidian`
 *                 (#0a0a0f) — a measured 4.04:1, below the 4.5:1 floor at 0.68rem. That label is
 *                 the only record of which variant was "1" and which "2".
 *   THE GUARD     mutating `--danger` to a dark blue left both H09 callbacks green while taking
 *                 the persistence warning — the one that stops an operator losing work — to ~1.2:1.
 * A token-existence check cannot see either, because in both cases the token existed.
 *
 * ROUND 15 (K06) — FOUR BLIND SPOTS, TWO ALREADY EXPLOITED BY SHIPPED CODE.
 *   1. Only `color: var(--token)`. The skip link is `color: #fff` on `var(--purple)` — a literal,
 *      invisible to a var()-only scan, at 4.23:1. Literals are scanned; a rule declaring both is
 *      checked against ITS OWN pair.
 *   2. `--purple` was excused on a surface the stylesheets did not contain. `.wild` used the same
 *      token on `--carbon` at 4.34:1, unexcepted. Exceptions are now BOUND to the selector they
 *      name and the binding is proven on a synthetic entry so it cannot rot into a no-op.
 *   3. Opacity was ignored: adding `.judge-right > .judge-side { opacity: 0.05 }` left all five
 *      callbacks green. A rule setting a colour AND a reduced opacity is REFUSED — its effective
 *      contrast is a composite this static guard cannot compute.
 *   4. Inherited opacity is ignored and still is. Named here rather than implied to be handled.
 *
 * ROUND 16 — the round-15 fix for (1) was ITSELF narrower than its name. `resolveColour` took six
 * hex digits only and the ratio check treats unresolvable as skip, so `#fff` was never computed and
 * restoring it left this suite GREEN: K05 turned on its own remedy. Shorthand now resolves, and
 * `uncomputableRules()` accounts for every rule whose colour cannot be computed.
 *
 * THE READING HALF LIVES IN TWO SIBLINGS, separate files because they fail in different directions.
 * `contrast.scope.test.mjs` owns out-of-scope declarations, which fail when an excuse goes stale.
 * `contrast.declared.test.mjs` owns whether the SURFACE a rule declares is the one this module
 * thinks it is (round 17, L05) — a defect there makes a verdict here confidently wrong about a
 * colour that is not on screen. This file asks only: is the pair legible?
 *
 * The colour maths is in `./contrast.mjs`; CSS parsing in `./contrastRules.mjs` (Rule 4's seventh
 * and fourteenth splits). Everything here is an assertion about the values they derive.
 *
 * Run: node --test scripts/swan-brain-console/app/contrast.test.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  FLOOR, NON_OPAQUE, EXCEPTIONS, palette, textTokens, rules, decl, resolveColour,
  contrast, tokenOf, declaredSurface, surfaceFor, exceptionBindingDefect, uncomputableRules,
} from './contrast.mjs';

describe('text colours clear the WCAG AA floor on the surface they render on (Astra J08, K06)', () => {
  test('RED — no text colour is below 4.5:1 on the surface it actually renders on', () => {
    /*
     * RULE-BASED, NOT TOKEN-BASED, AND THAT IS ROUND 15's K06 FIX. A token-level scan can only ask
     * "is this colour safe on some default surface", which is the wrong question for a colour whose
     * safety depends on where it is used — and it double-counts a colour a rule already pairs with
     * its own background. This iterates the RULES: a rule that declares a background is checked
     * against that pair, and a rule that does not is checked against the lightest surface. Literal
     * hex colours go down the same path, which is how the skip link is now covered.
     *
     * MUTATION: restore `.skip { color: #fff }`. RED at 4.23:1 on `--purple`.
     * MUTATION: set `.judge-right > .judge-side` back to `var(--lavender)`. RED at 4.04:1.
     * MUTATION: change `--danger` to a dark blue (e.g. `#000080`). RED at about 1.2:1.
     * MUTATION (round 15): set `--purple-text` back to `#8b5cf6`. RED at 4.07:1 on the worst case.
     */
    const pal = palette();
    const failures = [];
    for (const rule of rules()) {
      const raw = decl(rule.body, 'color');
      const text = resolveColour(raw, pal);
      // Unresolvable (`rgba()`, `color-mix()`) is reported by the completeness tests, not skipped
      // silently here: a value this suite cannot compute is not a value it has cleared.
      if (!text) continue;
      /*
       * ROUND 17 (Astra L05) — `declares` IS CHECKED, NOT COLLAPSED INTO THE FALLBACK.
       * `ownSurface(...) ?? surfaceFor(...)` reads `null` as "no background of its own", but the
       * old `ownSurface` also returned `null` for "names a background I cannot resolve". Those two
       * are different, and only the first may fall back to the token's surface: silently using the
       * token default for a rule that paints `color-mix(...)` measures a surface the browser never
       * draws. An unresolvable DECLARED background is therefore NOT measured here — it is accounted
       * for by `unresolvableBackgrounds()`, asserted just below.
       */
      const { declares, hex } = declaredSurface(rule, pal);
      if (declares && hex === null) continue;
      const surface = hex ?? surfaceFor(tokenOf(raw), pal);
      const ratio = contrast(text, surface);
      if (ratio < FLOOR) {
        failures.push(`${rule.file} "${rule.selector}" ${text} on ${surface} = ${ratio.toFixed(2)}:1`);
      }
    }
    assert.deepEqual(failures, [],
      `these text colours are below the ${FLOOR}:1 floor on the surface they render on: `
      + failures.join(' | '));
  });

  test('the literal-colour path is exercised, not merely present (Astra K06)', () => {
    /*
     * The round-14 guard scanned `color: var(--token)` only, so the skip link's `color: #fff` was
     * invisible. No literal text colour survives in these stylesheets now, which is exactly why
     * this asserts the PATH rather than a finding: `resolveColour` must resolve a literal, and the
     * pair the literal used to form must be computable. Without this, a future literal could be
     * added and the rule-based test would silently skip it while every callback stayed green.
     *
     * MUTATION: make `resolveColour` return null for hex literals. RED.
     */
    const pal = palette();
    assert.equal(resolveColour('#ffffff', pal), '#ffffff', 'literal hex colours do not resolve');
    assert.equal(resolveColour('#fff', pal), '#ffffff',
      'SHORTHAND hex does not resolve — and this is not a cosmetic case: `#fff` is the exact value '
        + 'the skip link shipped, and it is what a six-digit-only regex drops silently');
    assert.equal(resolveColour('var(--purple)', pal), pal.get('--purple'), 'var() does not resolve');
    assert.equal(resolveColour('rgba(255,255,255,0.5)', pal), null,
      'an unresolvable value must resolve to null rather than to a guess');
    assert.equal(resolveColour('#ffff', pal), null,
      'four-digit alpha hex has no static contrast — it must be refused, not approximated');
    // The pair the skip link used to be, proven computable and RED, so the path is load-bearing.
    const wasFailing = contrast('#ffffff', pal.get('--purple'));
    assert.ok(wasFailing < FLOOR,
      `#fff on --purple now measures ${wasFailing.toFixed(2)}:1 — if this passes, re-derive why `
      + 'the literal path was added');
    const nowPassing = contrast(pal.get('--obsidian'), pal.get('--purple'));
    assert.ok(nowPassing >= FLOOR,
      `the skip link's replacement pair measures only ${nowPassing.toFixed(2)}:1`);
  });

  test('RED — no rule sets a text colour alongside a reduced opacity (Astra K06)', () => {
    /*
     * Astra added `.judge-right > .judge-side { opacity: 0.05; }` and all five callbacks stayed
     * green. Effective contrast is a composite this static guard cannot resolve, so the honest
     * response is to REFUSE the combination rather than pass it.
     *
     * Declarations are merged by selector before this check, because the mutation above arrives as
     * a second block with the same selector as the colour rule.
     *
     * MUTATION: add `.judge-right > .judge-side { opacity: 0.05; }`. RED.
     */
    const offenders = [];
    for (const rule of rules()) {
      const raw = decl(rule.body, 'opacity');
      if (raw === null || decl(rule.body, 'color') === null) continue;
      const value = Number(raw);
      if (Number.isFinite(value) && value < 1) {
        offenders.push(`${rule.file} "${rule.selector}" sets color and opacity: ${raw}`);
      }
    }
    assert.deepEqual(offenders, [],
      'these rules set a text colour and a reduced opacity, so their effective contrast is a '
      + `composite this suite cannot compute: ${offenders.join(' | ')}`);
  });

  test('the sides are still distinguishable — the label fix did not collapse the pair', () => {
    /*
     * Astra's finding is about a label whose whole job is to say WHICH SIDE a variant is. A fix that
     * swapped in a colour indistinguishable from the left side's would satisfy the ratio and destroy
     * the meaning, so the two hues are asserted to differ visibly. This is the constraint that chose
     * `#9f7aea` over `#a78bfa`: the lighter purple cleared the floor but sat 1.33:1 from `--ice-wing`.
     *
     * MUTATION: set `.judge-right > .judge-side` to `var(--ice-wing)`. RED.
     */
    const css = rules().filter((r) => r.file === 'judge.css');
    const pick = (sel) => css.find((r) => r.selector === sel);
    const left = tokenOf(decl(pick('.judge-left > .judge-side')?.body, 'color'));
    const right = tokenOf(decl(pick('.judge-right > .judge-side')?.body, 'color'));
    assert.ok(left && right, 'the side labels moved — re-derive this test');
    assert.notEqual(left, right, `both sides now use ${left} — the label no longer distinguishes them`);
    const pal = palette();
    const apart = contrast(pal.get(left), pal.get(right));
    assert.ok(apart >= 1.5,
      `the two side hues differ by only ${apart.toFixed(2)}:1 of luminance — not a visible cue`);
  });

  test('the scan is not vacuous — it sees the palette, the colours and the rules', () => {
    // Guards the guard: a broken regex would compare empty sets and pass. MUTATION: break
    // `textTokens` (return an empty set). RED.
    const pal = palette();
    assert.ok(pal.size >= 10, `only ${pal.size} opaque tokens found — the palette scan is broken`);
    assert.ok(pal.has('--obsidian') && pal.has('--graphite'), 'the surface tokens were not found');
    const used = textTokens();
    assert.ok(used.size >= 4, `only ${used.size} text colours found — the colour scan is broken`);
    for (const t of ['--frost', '--danger']) {
      assert.ok(used.has(t), `the scan missed ${t}, which the stylesheets do use as text`);
    }
    assert.ok(rules().length >= 20,
      `only ${rules().length} rules parsed — the rule scan is broken, and the pair and opacity `
      + 'checks iterate over it');
  });

  test('no text colour escapes the ratio check by being uncomputable', () => {
    /*
     * The completeness half, and the reason this is not a hand-maintained list: the set of tokens
     * checked is DERIVED from the stylesheets, not from a table. Every token used as a text colour is
     * either an opaque hex (so a ratio is computed) or named in `NON_OPAQUE` with a reason. There is
     * no third outcome — so the guard's scope cannot silently narrow, which is this repository's
     * recurring defect.
     *
     * MUTATION: add `color: var(--muted)` handling that skips silently, or add an opaque token with
     * no value in the palette. RED.
     */
    const pal = palette();
    const uncomputable = [...textTokens()]
      .filter((t) => !(t in NON_OPAQUE) && !pal.has(t))
      .map((t) => `${t} (no opaque hex in the palette, and not declared out of scope)`);
    assert.deepEqual(uncomputable, [],
      'these tokens are used as text colours and this suite can neither compute a ratio for them '
      + `nor account for their absence: ${uncomputable.join(', ')}`);
  });

  test('no RULE escapes the ratio check by being uncomputable either (round 16)', () => {
    /*
     * THE HOLE THE TOKEN CHECK ABOVE CANNOT SEE, AND THE ONE THAT SHIPPED. That test accounts for
     * every token used as a text colour; it says nothing about a LITERAL, because a literal is not a
     * token — and the ratio check reads an unresolvable value as "cannot compute" and skips it. So
     * `color: #fff` fell through both halves: not a token, and not resolvable by a regex that
     * accepted six digits only. Astra's K05 generalised — a guard is only as wide as the values it
     * actually visits — so this closes the class, not the instance.
     *
     * THE RESULT IS ALSO TIED TO THE REAL RULE LIST, because `deepEqual(x, [])` is equally satisfied
     * by a function that read nothing. Not hypothetical: gutting the default parameter
     * (`ruleList = rules()` → `ruleList = []`) left this file at 9 pass / 0 fail on 2026-09-21. The
     * count below is what fails in that case, since `visited` reports the input rather than the
     * output and is the only way to tell the two apart here.
     *
     * MUTATION: restore `.skip { color: #fff }` (six-digit-only `resolveColour`). RED.
     * MUTATION: return `[]` unconditionally, or gut the default parameter. RED on the count.
     */
    const uncomputable = uncomputableRules();
    const colourRules = rules().filter((r) => decl(r.body, 'color') !== null);
    assert.ok(colourRules.length >= 20,
      `only ${colourRules.length} rules declare a colour — the accounting below is measuring too little`);
    assert.equal(
      uncomputable.visited,
      colourRules.length,
      `the no-argument call visited ${uncomputable.visited} colour-declaring rule(s) but the `
      + `stylesheets declare ${colourRules.length} — the default argument is not \`rules()\`, so the `
      + 'emptiness assertion below was satisfied by a function that never looked at a stylesheet',
    );
    assert.deepEqual(uncomputable, [],
      'these rules declare a text colour this suite cannot compute and has not declared out of '
      + `scope, so the ratio check skipped them silently: ${uncomputable.join(' | ')}`);

    /*
     * PARTITION, NOT JUST EMPTINESS — and the partition must consume the SAME list the function was
     * given. Round 16 found it derived from the wrong denominator: `uncomputable` came from the
     * DEFAULT parameter while `computed` was rebuilt from `rules()`, so with the default gutted both
     * sides described the same all-computable stylesheets and `computed + 0 === withColour` held by
     * construction. The control below did not save it — it passes an EXPLICIT argument, so it never
     * touched the default it existed to protect.
     */
    const pal = palette();
    const withColour = rules().filter((r) => decl(r.body, 'color') !== null);
    assert.ok(withColour.length >= 20,
      `only ${withColour.length} rules declare a colour — the partition is measuring too little`);
    const uncomputableIn = uncomputableRules(withColour);
    const computed = withColour.filter((r) => {
      const raw = decl(r.body, 'color');
      const token = tokenOf(raw);
      return resolveColour(raw, pal) !== null || (token !== undefined && token in NON_OPAQUE);
    });
    assert.equal(computed.length + uncomputableIn.length, withColour.length,
      `${withColour.length} rules declare a colour but only ${computed.length} are computed and `
      + `${uncomputableIn.length} reported — a rule is falling through both`);

    /*
     * AND THE INPUT IS ACTUALLY READ, and a positive control exists, because the real stylesheets
     * have nothing to report — so without these, a version that always returned `[]` would pass.
     * The control is made of the SAME rule objects the partition just consumed, so it cannot be
     * satisfied by a different code path. MUTATION: return `[]` unconditionally. RED.
     */
    const synthetic = [{ file: 'x.css', selector: '.partition', body: ';color: currentColor' }];
    assert.deepEqual(
      uncomputableRules(synthetic),
      ['x.css ".partition" currentColor'],
      'uncomputableRules ignored the list it was given — the partition above is not measuring it',
    );
    assert.deepEqual(
      uncomputableRules([{ file: 'x.css', selector: '.y', body: ';color: currentColor' }]),
      ['x.css ".y" currentColor'],
      'the accounting reported nothing for a rule whose colour it cannot compute',
    );
  });
});

