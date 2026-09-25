/**
 * contrastRules — read the stylesheets into rules, and a rule body into declarations.
 * @module scripts/swan-brain-console/app/contrastRules
 *
 * THE FOURTEENTH RULE 4 SPLIT IN THIS SUBSYSTEM, at the LOADER / ARITHMETIC boundary.
 * `app/contrast.mjs` had grown to 345 lines doing two things that fail for different reasons:
 *
 *   this file      turns CSS on disk into `{ file, selector, body }` and reads a body's
 *                  declarations. It fails when a stylesheet is PARSED wrong — a rule missed, two
 *                  bodies not merged, a shorthand confused with a longhand.
 *   `contrast.mjs` resolves colours and measures ratios. It fails when a colour is COMPUTED wrong.
 *
 * The distinction is not bookkeeping: a parser defect makes the ratio check silent (nothing to
 * check), while an arithmetic defect makes it wrong (the wrong verdict). Those are the two halves
 * of the L05 finding, which is why they are the two files.
 *
 * WHAT LIVES HERE AND WHY IT IS NOT IN `contrast.mjs`. `rules()` merges every body for a selector
 * with `;` (round 15's K06), and `decls()`/`decl()` read a declaration out of a merged body —
 * including round 17's L05 repair that the LAST declaration wins. Every one of those is a claim
 * about how CSS is WRITTEN, and they are all testable without computing a single colour.
 *
 * BOUNDS: `node:fs` and `node:path` for reading the stylesheets. No DOM, no browser, no clock.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Every stylesheet this module reads, sorted so a failure message is stable. */
export const STYLESHEETS = readdirSync(HERE).filter((f) => f.endsWith('.css')).sort();

const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '');
const read = (f) => strip(readFileSync(join(HERE, f), 'utf8'));

/** Every `--token: #rrggbb` declared in these stylesheets. Non-hex values are not in here. */
export function palette() {
  const out = new Map();
  for (const f of STYLESHEETS) {
    for (const m of read(f).matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)) {
      out.set(m[1], m[2].toLowerCase());
    }
  }
  return out;
}

/** Tokens used as a text colour — `color:` only, never `border-color:` or `background-color:`. */
export function textTokens() {
  const used = new Set();
  for (const f of STYLESHEETS) {
    for (const m of read(f).matchAll(/(?<![-\w])color:\s*var\(\s*(--[a-z0-9-]+)/g)) used.add(m[1]);
  }
  return used;
}

/**
 * Every CSS rule as `{ file, selector, body }`, then merged by `file|selector`.
 *
 * The merge is load-bearing and it is round 15's K06: Astra's opacity mutation arrives as a SECOND
 * declaration block with the SAME selector, so a per-block scan sees `opacity` in one rule and
 * `color` in another and concludes nothing. Merging is what makes the two visible together.
 */
export function rules() {
  const byKey = new Map();
  for (const file of STYLESHEETS) {
    const src = read(file);
    for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = m[1].trim().split('\n').pop().trim();
      if (selector === '') continue;
      const key = `${file}|${selector}`;
      const prev = byKey.get(key) ?? { file, selector, body: '' };
      prev.body += `;${m[2]}`;
      byKey.set(key, prev);
    }
  }
  return [...byKey.values()];
}

/**
 * Every declaration of `name` in a rule body, in source order. `background` never matches
 * `background-color` — see `decl` for why the boundary is asserted by the lookbehind.
 *
 * A BODY IS A CONCATENATION, SO MORE THAN ONE DECLARATION IS NORMAL. `rules()` joins every body
 * for a selector with `;`, so a selector written twice — a base rule plus a media or state
 * override — arrives here as one string with two `background` declarations in it. That is not
 * malformed input; it is what the loader produces.
 */
export function decls(body, name) {
  const re = new RegExp(`(?<![-\\w])${name}\\s*:\\s*([^;]+)`, 'gi');
  return [...String(body ?? '').matchAll(re)].map((m) => m[1].trim());
}

/**
 * The value of the LAST declaration of `name` in a rule body, or null when there is none.
 *
 * ROUND 17 (Astra round-16 finding L05) — THIS RETURNED THE FIRST MATCH, AND CSS APPLIES THE LAST.
 * `background: #fff; background: var(--purple)` is a real shape in this stylesheet, produced by
 * the loader joining two bodies for one selector. The old regex found `#fff`, so `ownSurface`
 * reported the rule's surface as white while the browser painted purple — and every ratio
 * computed against that rule was measured against a colour the browser never draws. A guard whose
 * subject is "what does this rule actually render on" has to read the declaration that wins, not
 * the one that was written first.
 *
 * `background` still never matches `background-color`: the lookbehind rejects a `-` or a word
 * character before the name, which is what keeps the shorthand and the longhand distinct.
 */
export function decl(body, name) {
  const all = decls(body, name);
  return all.length ? all[all.length - 1] : null;
}

/**
 * The WINNING background declaration of a rule body: `{ name, value, index }`, or null.
 *
 * ── ROUND 17, ASTRA L09 — THE SHORTHAND DOES NOT OUTRANK THE LONGHAND. ──────────────────────
 *
 * `decl(body,'background') ?? decl(body,'background-color')` is what `declaredSurface` used, and
 * Astra built the counterexample that falsifies it:
 *
 *     color: #fff;
 *     background: #000;
 *     background-color: #fff;      <- LAST, and therefore the one the browser applies
 *
 * The analyzer reported **21:1** (white on black). The declared pair is **1:1** — white on white,
 * an unreadable rule the guard PASSED. `??` asks "is there a `background`?" and returns it; it
 * never asks WHEN. CSS has no notion of one property beating another by NAME: both are longhand
 * contributions to the same computed value, and the cascade settles them by ORDER.
 *
 * So this scans BOTH properties in ONE pass, in source order, and returns the last declaration
 * seen — which is the rule the cascade actually applies. `index` is returned because a caller
 * may need to reason about position; the value alone was not enough to catch this.
 *
 * THE BOUNDARY STILL HOLDS. `background` never matches `background-color` — the lookbehind rejects
 * a `-` or word character before the name. That keeps the two properties distinct as *subjects*;
 * this function is what settles them as *competitors*.
 *
 * LIMITS, STATED SO THEY CANNOT ROT INTO CLAIMS. This reads a concatenated body, so it models
 * source order within one selector's merged text — not specificity, not `!important`, not
 * media-query activation, not inline styles. Astra's requirement that "last declaration wins" be
 * tied to a DEFINED CSS SUBSET is met by exactly that sentence: the subset is same-specificity
 * declarations of these two properties, merged in source order by `rules()`. A rule that wins by
 * specificity rather than order is out of this model, and that was true before this repair too.
 */
export function winningBackground(body) {
  const re = /(?<![-\w])(background|background-color)\s*:\s*([^;]+)/gi;
  let winner = null;
  for (const m of String(body ?? '').matchAll(re)) {
    winner = { name: m[1].toLowerCase(), value: m[2].trim(), index: m.index };
  }
  return winner;
}
