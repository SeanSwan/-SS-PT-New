# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/31-PACKET-SLICES-H10.md
**Seed:** (none)
**Tokens:** 10256 in / 3703 out | **Cost:** ~$0.0863 | **Wall:** 67.5s | **finish_reason:** stop

---

# HOSTILE REVIEW — ROUND H10

**Verdict: NOT DRY — one genuine LOW in the H9-1 fix (Kimi's 5th lookbehind).**

---

## Finding H10-1 (LOW, false positive): the pseudo-class exemption only covers the FIRST token — comma-position and compound-selector ids inside `:is()`/`:not()` still flag

The H9-1 fix added `(?<!:(?:not|is|where|has)\(\s*)`, which exempts a hex-shaped id only when it sits **immediately** after the opening paren. But branch 2's terminator class is `[;})!]` — and `)` is in it. So any id that appears later inside a functional pseudo-class is flagged:

```css
:is(.a, #face)        /* before: ", "  → branch-2 lookbehind ,\s* ✓ ; after: ")" → [;})!] ✓ → FLAGS */
:not(section #cafe)   /* before: "n "  → [\w)\]]\s* ✓          ; after: ")" → ✓           → FLAGS */
```

Trace for `:is(.a, #face)`:
1. **var()** lookbehind — no. **url()** — no. **href** — no. **querySelector/matches/closest** — no (this is raw CSS, not a JS call). **5th lookbehind** `:(?:not|is|where|has)\(\s*` — the chars immediately before `#face` are `, `, not `:is(` → fails.
2. Branch 2: `(?<=,\s*)#face(?=\s*[;})!])` — both sides match. **Flagged.**

This is exactly the bug class H5-M4 fixed for top-level selector lists (`a #face, #beef {}` protected by the terminator lookahead) and GLM's H9-1 fixed for the *comma-position second id* inside `querySelector('li:is(#face, #beef)')` — but the same comma-position hole survives in the raw-CSS pseudo-class path, because the H9-1 lookbehind was anchored to position 0 of the argument instead of spanning the argument the way GLM's `{0,120}` fix did. `:is(.a, #face)` and `:not(section #cafe)` are valid Selectors-4 CSS with zero color semantics — a coder-profile training row containing a stylesheet with a complex `:is()` selector gets a spurious `hardcoded_hex_outside_var` hit.

**Fix (sketch):** widen the 5th lookbehind to span the whole parenthesized argument, mirroring the H9-1 GLM pattern:
`(?<!:(?:not|is|where|has)\([^)]{0,120})` — bounded, no nested-paren ambiguity in practice (a `)` would terminate the pseudo-class, after which flagging is correct again).

**Why this is not a re-litigation of a disproven claim:** H9 verified the *bare* form (`:not(#cafe)`) green via the 10-case matrix; the matrix simply never included a compound or comma-position case inside the pseudo-class. The fix as landed is narrower than its own commit comment implies ("CSS functional pseudo-classes take bare id selectors" — but selectors inside them need not be bare).

---

## What I attacked and could NOT break

- **GLM H9-1 (whole-quoted-arg lookbehind):** tried `querySelectorAll("div"); c = '#ff5733'` (inner quotes break `[^"'`]`, correctly flags), `closest('li') && f('#aabbcc')` (same), mixed-quote attribute selectors — the `href="` case is caught by the *href* exemption anyway, so no FP. The `{0,120}` bound is sound.
- **GLM H9-2 (out-dir at a regular file):** the `!statSync(runDir).isDirectory()` refusal fires before any mkdir; a *file* named `sealed` inside a real dir degrades to the `looksLikeRunDir` refusal (existsSync swallows ENOTDIR), never crashes. Clean.
- **5th lookbehind over-exemption:** `linear-gradient(#f00,…)`, `color: not(#f00)`-type invalid CSS — no realistic false *negatives*; gradients/color functions stay red as claimed.

## DISSENT (mandatory)

Against my own finding: this is the third consecutive round where the only surviving finding is a LOW-severity regex FP in an already-thrice-patched exemption chain, each requiring a more contrived selector than the last (`:is(.a, #face)` in a *training row's* assistant turn, in a profile whose doctrine already pushes colors to tokens). One could honestly argue the marginal fix cost now exceeds the marginal dataset-hygiene value, and that H10's finding is closer to the two historically disproven claims than to the ~70 verified ones. I keep it as genuine because the terminator class including `)` makes the trigger *structural*, not adversarial — but if H10's fix lands as sketched and the matrix gains compound/comma pseudo-class cases, I will not find a fourth iteration of this hole, and H11 should be DRY.
