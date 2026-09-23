# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/28-PACKET-SLICES-H9.md
**Tokens:** 9905 in / 17330 out (reasoning: 15905) | total 27235
**Wall:** 306.7s

---

# HOSTILE REVIEW — round H9

**Verdict: NOT DRY — 2 LOW.** The H8 ledger itself holds: I re-derived the 11-case matrix from source rather than trusting the packet, and every claimed behavior reproduces (`hexToRgb('#ff5733')` and `chroma('#c0ffee')` flag via branch 1's quote class; all four selector forms green via the narrowed lookbehind; empty-token refusals fire on every value-taking flag; file-named-`sealed` refuses cleanly under `--force`). What survives the attack is two residuals of the *same defect classes the packet itself has twice accepted at LOW*.

## H9-1 (LOW, tuning-profiles) — the selector exemption covers only the token adjacent to the opening quote; hex ids inside functional pseudo-classes in selector-API calls still false-flag

The H8-1 lookbehind is `(?<!\b(?:queryselector(?:all)?|matches|closest)\(\s*["'\`])` — it exempts only a `#hex` **immediately preceded by `call(` + quote**. Branch 1 has no lookahead, and `(` and `:` are both in its `[:='"\`()]` class. So:

```js
document.querySelector('a:not(#cafe)')   // FLAGGED — hardcoded_hex_outside_var
el.matches('li:is(#face, #beef)')        // FLAGGED (first via '(' branch, second via ','+ ')' lookahead)
```

Trace for the first: at `#cafe`, the exemption lookbehind fails (`a:not(` intervenes between quote and `#`), branch 1 matches on the preceding `(` (also the `:`), `\b` holds before `)`. This is a selector-API call — the exact class H7-m1/H8-1 established must stay green — going red. It's not exotic vocabulary either: it is the *under-coverage* genre the packet accepted as valid in H8 (backticks), in the same exemption, one nesting level deeper. Note the neighboring forms behave inconsistently: `closest('div #beef')` and `querySelector('div#cafe')` are green (closing quote breaks branch 2's lookahead), and `[id="#cafe"]` is green (`]` not in the terminator class) — only the `:fn(#hex)` shape breaks.

**Fixable without reopening H8-1:** widen the lookbehind to cover the whole first quoted argument, e.g. `(?<!\b(?:queryselector(?:all)?|matches|closest)\(\s*["'\`][^"'\`]{0,120})` (JS supports bounded variable-length lookbehind; the pattern already uses one). `hexToRgb('#ff5733')` stays red — the lookbehind still requires the selector-call name before the quote — so the H8-1 regression cannot recur through this widening.

## H9-2 (LOW, compare-tuned) — `--out-dir` pointing at a regular FILE crashes ENOTDIR instead of the intended wrong-`--out-dir` refusal: the unfixed sibling of H8-2

H8-2 added the isDirectory guard to `superseded()` (file named `sealed`). The line directly above it was left unguarded:

```js
const dirEntries = existsSync(runDir) ? readdirSync(runDir) : [];
```

`node scripts/compare-tuned.mjs run --base m1 --tuned m2 --out-dir <existing-regular-file>` → `[compare] ENOTDIR: not a directory, scandir '<path>'`, exit 1. It fails closed, pre-mutation, after all validations — but this is precisely the failure mode H8-2 was filed and accepted for: ENOTDIR where a designed refusal message belongs. One-line fix: `if (existsSync(runDir) && !statSync(runDir).isDirectory()) throw new Error('--out-dir exists but is not a directory — wrong --out-dir? (H9-2)')`.

## What I attacked and did not break

- **Selector exemption leakage:** `\b` handles `document.querySelector`, `el?.closest` chains; no color helper shares the three names; case-insensitivity covers both sides; `div#cafe` / `div #cafe` / `[id="#cafe"]` / `#cafe-button` all stay green through branch structure.
- **Empty-token fix completeness:** every value flag funnels through `next()`; whitespace-only values either hit `numArg`'s trim check or remain truthy (gates still run, `readFileSync` fails loudly — no fail-open path reintroduced); `--force`-as-value is still rejected (H7-3 intact).
- **H8-2 guard integrity:** `superseded()` short-circuits `statSync` before `readdirSync`; file-named-`sealed` routes to the clean `--force` refusal on both the `--force` and non-`--force` paths.

## DISSENT (mandatory — strongest DRY case)

Both findings are LOW and arguably below the bar. H9-1 is an *over*-flag, not an under-flag: the lint fails closed, the row author gets a labeled finding and renames a hex-spelling id out of a pseudo-class — no silent hygiene decay, no evidence risk, and it requires `:not(#<hexword>)`, which even the process's adversarial vocabulary has never actually produced. H9-2 requires the user to explicitly point `--out-dir` at a regular file — direct user error, loud, side-effect-free, path named in the message — unlike H8-2, where `sealed` is a *tool-created* name struck on the `--force` recovery path. A CLI that crashes cleanly on nonsense input has not obviously failed.

**Rebuttal:** the packet's own precedent sets the bar, not me. Backtick under-coverage of this same exemption was accepted as a valid H8 finding; ENOTDIR-instead-of-refusal was accepted as H8-2. Both residuals are verified-reproducible, one-line fixable, and in the established vocabulary — under this process's rules, "nothing genuinely fixable remains" is not yet true, and a DRY here would be the dishonest move, not the safe one.

**Explicit verdict: NOT DRY (2 LOW: H9-1, H9-2).** If both land with the fixes as sketched, I see nothing further in these two files at any severity I could defend as genuine — H10 should be DRY.
