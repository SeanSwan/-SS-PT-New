# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/28-PACKET-SLICES-H9.md
**Seed:** (none)
**Tokens:** 10038 in / 2806 out | **Cost:** ~$0.0722 | **Wall:** 65.9s | **finish_reason:** stop

---

**DISSENT — NOT DRY: one genuinely fixable LOW survives in the H8-1 hex matrix.**

## Finding H9-1 (LOW): CSS functional pseudo-classes — `:not(#cafe)`, `:is(#face)` — still flag as hardcoded hex

**Attack on the H8-1 fix.** The narrowed exemption correctly scopes quote-wrapped DOM ids to `querySelector(all)?|matches|closest` calls. But the H4 restoration of `(` into the branch-1 value-position class (`[:='"\`()]`) creates a hole the H8 fix did not close: **CSS's own selector functions take bare, unquoted ids.**

```
:not(#cafe) { ... }        → char before # is '(' → branch 1 fires → FLAGGED
:is(#face, .hero) { ... }  → same → FLAGGED
:where(#beef) { ... }      → same → FLAGGED
:has(> #dead) { ... }      → same → FLAGGED
```

These are selectors, not colors — exactly the false-positive class F6 and H5-M4/m2 spent two rounds eliminating for selector *lists* (`a #face, #beef {}` is safe via branch 2's terminator guard, but `:not(#face)` dies on branch 1's `(`). Hex-spelling ids (`#cafe`, `#face`, `#beef`, `#dead`, `#fade`) are precisely the ids this regex exists to not flag, and `:not()`/`:is()` are ubiquitous in the styled-components/CSS the coder profile reviews. Meanwhile the actual H4 target is untouched by my proposed fix:

```
linear-gradient(#f00, #00f)   → must STAY red
```

**Fix (narrow, does not reopen gradients):** add one more negative lookbehind naming the four CSS functional pseudo-classes that accept id selectors — gradients and color functions are not in the list, so `linear-gradient(#f00,…)` keeps flagging:

```js
(?<!:(?:not|is|where|has)\(\s*)
```

**Test to add to the 11-case matrix (becomes 13):**
- `:not(#cafe) { outline: none; }` → green
- `:is(#face, .card) { margin: 0; }` → green
- `linear-gradient(#f00, #00f)` → stays red (regression guard)

**Why this is not a re-litigation of a settled tradeoff:** no prior round's ledger mentions functional pseudo-classes; H4's `(` restoration was argued solely on `linear-gradient`-style function-first-arg hex, and H5-M4/m2's branch-2 work explicitly affirmed the "selectors must not flag" doctrine — this is an unexamined corner of that doctrine, not a dissent from a decided one.

**Everything else in the H8 ledger I attacked and could not break:**
- Empty-token fail-open: `next()` rejects `''`/dangling/`--`-prefixed; `numArg`'s blank-trim check catches `"  "` which `next()` legitimately passes through; negative numbers (`-5`) don't start with `--` and still parse. Clean.
- File-named-`sealed`: `statSync(sealedDir).isDirectory()` fails the `onlyEmptySealed` fast path, `existsSync` on paths under a regular file returns false without throwing, `superseded()` is guarded — the intended clean `--force` refusal results. Clean.
- Selector-call exemption: variable-length lookbehind is legal in V8; case-insensitivity propagates under the `i` flag; backtick form covered. Clean.

One fixable LOW remains, so per the packet's rule I cannot declare DRY — but the finding curve (1+2 → 1) and the narrowing blast radius say this is the last rung: fix the pseudo-class lookbehind, extend the matrix to 13, and H10 should have nothing honest left to say.
