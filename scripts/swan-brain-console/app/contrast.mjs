/**
 * contrast — WCAG contrast over the console's own stylesheets, as values rather than assertions.
 * @module scripts/swan-brain-console/app/contrast
 *
 * WHY THIS IS A MODULE AND NOT JUST A TEST
 * Round 15 (Astra K06) grew the contrast guard's scope from "tokens used as text" to "every colour
 * a rule declares, against the background that rule declares", and added literal hex, opacity and
 * exception-binding checks. That is roughly 200 lines of colour and CSS parsing, which pushed
 * `contrast.test.mjs` past Rule 4's 300-line cap — the seventh time that cap has forced a split
 * here. The boundary is real rather than a line count: everything in this file is a VALUE derived
 * from the stylesheets, and everything in the suite is an ASSERTION about those values.
 *
 * WHY THE SURFACES ARE DECLARED RATHER THAN CASCADED
 * Resolving which surface a selector actually sits on needs a CSS engine and the real DOM. So the
 * rule is: a rule that declares its own background is checked against that pair, and a rule that
 * does not is checked against the LIGHTEST surface in the palette, because contrast falls as the
 * background lightens. That default is what stops an undeclared colour from being skipped — it is
 * checked against the worst case instead.
 *
 * NOT COVERED, NAMED: inherited `opacity` from an ancestor, `color-mix()` and `rgba()` values
 * (whose rendered contrast depends on what is behind them), and any surface chosen at runtime.
 * These functions answer questions about the pairs the stylesheets declare, and a green result does
 * not claim more than that.
 *
 * ROUND 16 — THE ROUND-15 GUARD HAD A HOLE THE SIZE OF A SPELLING. `resolveColour` accepted six
 * hex digits only, and the ratio check treats "unresolvable" as "skip", so `#fff` — the exact value
 * the round-15 fix removed from `.skip` — was never computed. Putting it back left the suite GREEN
 * under mutation. Shorthand hex is now resolved, and every rule whose text colour cannot be
 * computed must be accounted for by `uncomputableRules()`, so the guard cannot narrow by a value
 * changing spelling. Astra's K05 is the general form of this: a guard is only as wide as the
 * values it actually visits.
 *
 * BOUNDS: `node:fs` reads of the sibling `.css` files. No DOM, no browser, no network.
 */
import {
  STYLESHEETS, palette, textTokens, rules, decls, decl, winningBackground,
} from './contrastRules.mjs';

/*
 * RE-EXPORTED, SO THIS MODULE'S PUBLIC SURFACE IS UNCHANGED BY THE SPLIT. Every existing caller
 * imports these from `contrast.mjs`, and a split that made callers chase a new path would be a
 * rename wearing a refactor's clothes. The loader lives in `contrastRules.mjs`; this is still
 * where the ratio check, its inputs, and its accounting are read from.
 */
export {
  STYLESHEETS, palette, textTokens, rules, decls, decl,
};
/** The 4.5:1 floor WCAG AA sets for normal-size text. `0.68rem` is not large text. */
export const FLOOR = 4.5;

/** The LIGHTEST surface in the palette — the worst case for light-on-dark, so the default. */
export const WORST_CASE = '--graphite';

/**
 * The declared deviations from the worst case. EMPTY, AND THAT IS THE ROUND-15 RESULT.
 *
 * The one entry this table held excused `--purple` on `--obsidian`, on the claim that purple's
 * "only text rule renders inside `.judge-variant`". Astra showed the claim was false when written:
 * `.wild` (app.css) used the same token as text on `--carbon`, at 4.34:1. Both uses were fixed —
 * purple text is now `--purple-text` (#9f7aea), which clears the worst case — so no token needs
 * excusing.
 *
 * An entry is BOUND: `selector` must exist in the stylesheets and must declare `surface` as its
 * background, or `exceptionBindingDefect` fails. That is what stops this table drifting into a
 * claim the stylesheets do not support, which is exactly how the previous entry went wrong.
 */
export const EXCEPTIONS = {};

/**
 * Tokens used as a text colour that are NOT opaque hex, and therefore out of scope.
 *
 * `--muted` is `rgba(224, 236, 244, 0.66)`: its rendered contrast depends on what is behind it,
 * which this module cannot resolve. Named rather than skipped silently, and the suite pins that it
 * is still the semi-transparent value — if it becomes opaque it must be declared instead, or it
 * would escape the guard by changing type.
 */
export const NON_OPAQUE = { '--muted': /^rgba\(/ };



/**
 * A colour expression as a hex, or null when this module cannot resolve it statically.
 *
 * `var(--token)` resolves through the palette; a literal hex is itself, in BOTH spellings. `rgba()`,
 * `color-mix()`, gradients and alpha hex return null — they are accounted for by
 * `uncomputableRules()` rather than skipped silently.
 *
 * ROUND 16 — THE SHORTHAND WAS THE HOLE, AND IT WAS THE WHOLE HOLE. This regex accepted six digits
 * only, so `#fff` resolved to null. The ratio check reads null as "cannot compute" and moves on, so
 * the shipped `.skip { color: #fff }` — 4.23:1 on `--purple` — was invisible to a guard whose
 * stated scope was "every colour a rule declares". A mutation putting `#fff` back left the suite
 * GREEN. `#rgb` is not a cosmetic variant of `#rrggbb`; it is the spelling the defect used.
 */
export function resolveColour(value, pal) {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  const asVar = v.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/);
  if (asVar) return pal.get(asVar[1]) ?? null;
  const asHex6 = v.match(/^#([0-9a-fA-F]{6})$/);
  if (asHex6) return `#${asHex6[1].toLowerCase()}`;
  const asHex3 = v.match(/^#([0-9a-fA-F]{3})$/);
  if (asHex3) return `#${[...asHex3[1]].map((c) => `${c}${c}`).join('').toLowerCase()}`;
  return null;
}

/**
 * Rules that declare a text colour this module cannot resolve statically.
 *
 * THE COMPLETENESS HALF, APPLIED TO RULES RATHER THAN TOKENS. `textTokens()` derives the set of
 * tokens used as text and requires each to be either opaque or named in `NON_OPAQUE` — there is no
 * third outcome. Literal colours had no such accounting, so the ratio check's `if (!text) continue`
 * was a silent skip: any `color:` this module could not compute simply vanished, and a suite with a
 * hole in it reads exactly like a suite with nothing to report.
 *
 * That is how `#fff` escaped for a whole round. Every declaration that reaches the ratio check and
 * resolves to null is now either declared out of scope or reported here, so the guard's scope
 * cannot narrow by the value changing spelling.
 *
 * `ruleList` is a parameter for the same reason `missingSuites(named)` takes one: today the real
 * stylesheets contain nothing to report, so a version of this that always returned `[]` would be
 * indistinguishable from a working one. The suite hands it a synthetic rule and requires it back.
 *
 * ROUND 16 (this module's own suite). The paragraph above was TRUE AND NOT ENOUGH. A suite-level
 * mutation showed that gutting the DEFAULT (`ruleList = rules()` → `ruleList = []`) left the file at
 * 9 pass / 0 fail: the synthetic control passes its rule EXPLICITLY, so it never touches the default
 * path, and the counting assertions around the real stylesheets expected `[]` — which is exactly what
 * reading no rules also produces. An empty correct answer cannot be distinguished from an empty
 * function by inspecting output alone.
 *
 * The fix is to report the INPUT the default produced, so the discrepancy is visible from outside.
 * `visited` is the number of colour-declaring rules the call actually looked at. On the real
 * stylesheets it must equal the number of such rules in `rules()`; a call that read nothing reports
 * 0, and that is now detectable without a synthetic fixture.
 */
export function uncomputableRules(ruleList = rules()) {
  const pal = palette();
  const out = [];
  let visited = 0;
  for (const rule of ruleList) {
    const raw = decl(rule.body, 'color');
    if (raw === null) continue;
    visited += 1;
    if (resolveColour(raw, pal) !== null) continue;
    const token = tokenOf(raw);
    if (token && token in NON_OPAQUE) continue;
    out.push(`${rule.file} "${rule.selector}" ${raw}`);
  }
  /*
   * `visited` rides on the ARRAY rather than changing the return type, so every existing caller
   * (`deepEqual(x, [])`, `.length`, the spread in the assertion message) keeps working unchanged.
   * A separate export would be a second thing to keep in step; an own property on the result is the
   * same value the caller already holds.
   */
  Object.defineProperty(out, 'visited', { value: visited, enumerable: false });
  return out;
}

/** WCAG 2.1 relative luminance. The 0.04045 and 1.055 constants are the spec's, not tuning. */
export function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast ratio between two opaque colours. Order-independent. */
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** The `--token` inside a `var(--token)` expression, or undefined for a literal or uncomputable. */
export const tokenOf = (raw) => (raw ?? '').match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/)?.[1];

/**
 * Whether a rule declares a background of its own, and whether this module can resolve it.
 *
 * TWO FACTS, AND THEY MUST NOT COLLAPSE INTO ONE. `declares: false` means the rule names no
 * background, so the caller falls back to the token's surface — legitimate and common.
 * `declares: true, hex: null` means the rule DOES name one and this module cannot compute it:
 * the same `color-mix()` / `rgba()` / gradient limit `uncomputableRules()` accounts for. The old
 * `ownSurface` returned `null` for both, which made an unresolvable background look exactly like
 * an absent one — a rule measured against the token default while the browser paints something
 * else, which is the L05 hole one level up from the first-match bug.
 */
export function declaredSurface(rule, pal) {
  /*
   * L09 (Astra round 17) — THE ORDER IS BETWEEN THE TWO PROPERTIES, NOT JUST WITHIN ONE.
   *
   *     color: #fff; background: #000; background-color: #fff;
   *
   * `decl(body,'background') ?? decl(body,'background-color')` returned `#000` here, because it
   * asks whether a shorthand EXISTS and never when it was written. The cascade applies the LAST
   * declaration of the surface, whichever property spells it — so this rule is white-on-white
   * (1:1, unreadable) and the old code measured it as white-on-black (21:1). Astra executed that
   * counterexample against this module; both the shorthand-then-longhand and longhand-then-shorthand
   * orders are its cases.
   *
   * The fix is one pass over both properties in source order (see `winningBackground`), which also
   * keeps L05's repair: the last declaration of the SAME property still wins, because it is simply
   * the last one seen.
   */
  const winner = winningBackground(rule?.body);
  if (winner === null) return { declares: false, raw: null, hex: null };
  return { declares: true, raw: winner.value, hex: resolveColour(winner.value, pal) };
}

/**
 * The background a rule declares for itself, as a hex, or null when it declares none OR when it
 * declares one this module cannot resolve. Use `declaredSurface` when the two must be told apart.
 */
export const ownSurface = (rule, pal) => declaredSurface(rule, pal).hex;

/**
 * Rules whose OWN declared background this module cannot resolve, so their contrast is UNMEASURED.
 *
 * THE BACKGROUND-SIDE TWIN OF `uncomputableRules()`, AND IT EXISTS FOR THE SAME REASON. That
 * function stops a text colour from escaping the ratio check by being uncomputable. This one stops
 * a rule from escaping it by declaring a background the module cannot read: before it, such a rule
 * silently fell back to `surfaceFor()` — the token default or worst case — and was measured against
 * a surface the browser never paints. Either the rule is cleared on a colour that is not on screen,
 * or it fails for a colour that is not on screen. Both are false verdicts from the same reading.
 *
 * WHY THIS IS ACCOUNTING AND NOT A FLAT FAILURE. `color-mix()`, gradients and `transparent` are the
 * module's stated static limit — the same limit `NON_OPAQUE` names on the token side. Five real
 * rules hit it (`.tabs button:hover`, `.dismiss`, `.goto`, `.help-btn`, `body`), and they hit it
 * legitimately. Requiring zero would mean either refusing stylesheets that use gradients or, worse,
 * teaching the caller to add exceptions until the list is empty — an over-correction that hides
 * the next real case. So this REPORTS them, the suite asserts the list has not GROWN, and adding a
 * rule with an unresolvable background is a deliberate act that changes a number in a test.
 *
 * `ruleList` is a parameter for the same reason `uncomputableRules()` takes one: a version that
 * always returned `[]` reads identically to a working one over stylesheets with nothing to report.
 */
export function unresolvableBackgrounds(ruleList = rules()) {
  const pal = palette();
  const out = [];
  let visited = 0;
  for (const rule of ruleList) {
    const { declares, raw, hex } = declaredSurface(rule, pal);
    if (!declares) continue;
    visited += 1;
    if (hex !== null) continue;
    out.push(`${rule.file} "${rule.selector}" background: ${raw}`);
  }
  Object.defineProperty(out, 'visited', { value: visited, enumerable: false });
  return out;
}

/**
 * The surface a text colour renders on when its rule declares no background of its own: the
 * token's declared exception surface when it has one, and the LIGHTEST surface otherwise.
 *
 * ROUND 15 (Astra K06) — THE TOKEN-LEVEL DEFAULT IS ONLY CORRECT FOR A RULE THAT DECLARES NO
 * BACKGROUND OF ITS OWN. The focused skip link is `color: var(--obsidian)` on
 * `background: var(--purple)`; checking `--obsidian` against the worst case yields 1.14:1 and would
 * have failed a rule that is perfectly readable on its own pair. So callers prefer the rule's own
 * background and fall back here, which is why this returns a colour rather than deciding anything.
 */
export function surfaceFor(token, pal) {
  const entry = EXCEPTIONS[token];
  if (entry) {
    const bound = rules().find((r) => r.selector.includes(entry.selector));
    const hex = ownSurface(bound ?? { body: '' }, pal);
    if (hex) return hex;
    if (pal.has(entry.surface)) return pal.get(entry.surface);
  }
  return pal.get(WORST_CASE);
}

/**
 * Bind an exception to the selector that justifies it. Returns a reason, or null when it holds.
 *
 * The round-14 entry named no selector at all, so nothing could contradict it. Requiring the
 * selector to exist AND to declare the claimed background is what makes the claim falsifiable.
 */
export function exceptionBindingDefect(token, entry, pal) {
  if (!entry.selector) return `${token} names no selector`;
  const found = rules().filter((r) => r.selector.includes(entry.selector));
  if (found.length === 0) return `${token} names selector "${entry.selector}", which does not exist`;
  const declared = found.some((r) => ownSurface(r, pal) === pal.get(entry.surface));
  if (!declared) {
    return `${token} claims it renders on ${entry.surface}, but "${entry.selector}" does not `
      + 'declare that background';
  }
  return null;
}
