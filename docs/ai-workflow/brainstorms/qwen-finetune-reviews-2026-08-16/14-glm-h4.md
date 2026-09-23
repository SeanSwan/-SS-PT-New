# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/13-PACKET-SLICES-H4.md
**Tokens:** 10951 in / 26788 out (reasoning: 24056) | total 37739
**Wall:** 409.2s

---

# H4 HOSTILE REVIEW — verdict first: **NOT DRY**

## Part 0 — Is the H3 ledger code-true this time? (yes)

Before attacking, I verified every ledger line maps to executable code — no described-not-applied recurrence:

| H3 claim | Where in code | Code-true? |
|---|---|---|
| K2 force-reset (truncate outputs, quarantine verdicts, loud warn) | `runCompare`, `if (opts.force)` block; `renameSync` imported | ✅ |
| H3-2 card checks (missing card / placeholder / no commitment / mismatch / no Judge line) | `scoreRun`, five throws | ✅ |
| H3-3 hex regex (whitespace-tolerant var(), href/url lookbehinds, `(` dropped, 3/4/6/8) | `HEX_OUTSIDE_VAR` | ✅ (but see H4-1/H4-2 — the regex is code-true and *wrong*) |
| child-id regex derived from contract | module scope, `childIdBody = loadClassroomContract()...` | ✅ (introduced H4-5) |
| Stamped quarantine + `latest-sources.jsonl` emptied | `build` branch | ✅ |
| Dataset unknown-flag throw; `--audit-seed` integer check | both present | ✅ |
| 33/33 tests | unverifiable from packet; note the fixture blind spot in H4-1 | — |

The H3 headline defect is genuinely fixed. Now the attack.

---

## H4-1 (HIGH, introduced by H3-3 itself): dropping `(` from the value-position class opened a false-negative hole — first-arg hex in any CSS function escapes

**Evidence.** In `background: linear-gradient(#fff, #000);`:

- At `#fff`: preceding char is `(`. `(` ∉ `[:='"`,]` → lookbehind 4 **fails** → **not flagged**.
- At `#000`: preceding is `, ` → `,` ∈ class → **flagged**.

The same declaration is half a violation. `linear-gradient(#f00, transparent)` — a single hex stop, the single most canonical hardcoded-hex shape in design code — sails through untouched. Same hole for `radial-gradient(`, `conic-gradient(`, `color-mix(`, any `fn(#hex)`.

**Root cause.** The `(?<!url\()` lookbehind was *already sufficient* to exempt `url(#fade)`. Dropping `(` from the class was redundant double-protection for url() and un-protection for everything else. The four new fixtures (the four hex *lengths*) cannot distinguish the two designs — `url(#fade)` passes either way — so the regression is invisible to the test suite.

**Fix (both halves required together).** Restore `(` to the class: `[:='"`,(]` **and** extend the url lookbehind to `(?<!url\(\s*['"]?)`. Restoring `(` alone would false-flag `url( #fade )` (spaced, currently safe only because `(` isn't in the class) — the extension's `\s*['"]?` must absorb it.

## H4-2 (MEDIUM, H3-3 incomplete): quoted url() references still false-positive — and false positives kill entire builds

**Evidence.** `clip-path: url('#fade');` — at `#fade`: preceding char `'` ∈ class → lookbehind 4 passes; lookbehind 3 asserts the 4 chars before `#` are `url(` — they are `rl('` → not blocked → **flagged**. `mask: url("#bead")` likewise. Quoted url() refs are standard CSS (clip-path/mask/filter), and hex-spelling ids (`fade`, `bead`, `facade`, `decade`) are exactly the design-y names this track generates.

Why it matters more than a lint nit: profile problems quarantine the dataset and exit 1. A false positive is build-poisoning, which is precisely the failure mode the residue fix exists to clean up after.

**Fix.** The extended lookbehind from H4-1: `(?<!url\(\s*['"]?)`. Symmetric rider: `href = "#cafe"` (spaced `=`, legal JSX) also flags today — use `(?<!href\s*=\s*["'])`.

## H4-3 (MEDIUM): the K2 reset is asymmetric and partial — it destroys the expensive artifact and preserves the derived ones

Three sub-defects in the implemented branch:

1. **Verdicts quarantined, outputs annihilated.** `writeFileSync(outputsPath, '')` permanently deletes the prior run's raw model generations — the expensive artifact — while the cheap-to-quarantine verdicts get stamped preservation. `renameSync` to `outputs.superseded-<stamp>.jsonl` prevents concatenation identically at zero cost. A mistaken `--force` (or wrong `--out-dir`) is unrecoverable data loss today.
2. **The reset set is incomplete on the crash path — the very path your executed proof exercised.** Dead endpoint on first call leaves: outputs.jsonl empty, verdicts quarantined, but the **old** `judging-sheet.md`, `sealed/mapping.json`, `sealed/checks.json`, and `run-card.md` all intact (they're only overwritten on success) — a dir where the old sheet, old mapping, and old commitment still cohere. A human can re-judge the stale sheet and score it: commitment matches, verdicts are fresh, and it scores against an **empty** `outputs.jsonl` (pendingIdeals=0, slices default) into a plausible-looking scorecard.
3. **Happy path residue:** `scorecard.md` — derived from the now-quarantined verdicts — is never touched by `runCompare`. A completed force re-run leaves a stale PASS scorecard sitting next to the new "next: judge…" sheet. Your own residue doctrine ("not left ANYWHERE a reader can find it") demands the same treatment here.

**Fix.** On `--force`: rename outputs alongside verdicts; quarantine or stamp `scorecard.md` (and ideally sheet/mapping/checks); cheap rider — refuse a destructive reset unless the dir looks like a run dir (`run-card.md` or `sealed/mapping.json` present).

## H4-4 (MEDIUM): profile validation runs *after* the writes — a failed build destroys any pre-existing good dataset at `--out`

**Evidence (order in `build`):** `writeJsonl(opts.out, …)` → `reportProfileValidation` → on failure, quarantine the **new bad** content, empty the path. If `--out` pointed at yesterday's good dataset, the good bytes were overwritten at step 1 and are unrecoverable; the quarantine preserves the bad build, not the good prior one. The H3 residue fix cleaned up the poison but left the collateral.

**Fix.** `reportProfileValidation(result.examples, opts.profile)` is pure over examples — hoist it above both `writeJsonl` calls and exit before writing anything on failure (keep writing only the `.rejected-` evidence copy if wanted). The quarantine-then-empty dance becomes unnecessary.

## H4-5 (MEDIUM-LOW): the contract-derivation nit moved `loadClassroomContract()` to module scope of compare-tuned.mjs

**Evidence.** `const childIdBody = loadClassroomContract()...` executes at import. Consequences: (a) `help` — and every coach/coder comparison that never touches child ids — hard-fails at import if the classroom contract is missing or its version drifts from `EXPECTED_CONTRACT_VERSION`; a deliberate mid-review contract bump bricks the whole harness, with an uncaught import-time stack (the `main().catch` wrapper never engages). The fail-closed contract doctrine scopes to *classroom builds*; this coupling makes it global.

**Fix.** Derive lazily inside `contaminationGate` (only when `--train` is passed) — fail-closed exactly where it matters, decoupled elsewhere. Rider: interpolate as `\b(?:${childIdBody})\b` so a future alternation-bearing `childIdPattern` can't silently mis-bound.

## H4-6 (LOW): arbitrary caps in the var() lookbehind recreate the false-positive class

`\s{0,4}`: a multiline `var(\n    --theme-surface-fallback,\n    #ffffff\n)` — valid, common formatting — exceeds 4 whitespace units, the exemption fails, and `#ffffff` flags (`,\n    ` satisfies lookbehind 4). Build-poisoning on legitimate CSS. Likewise `[\w-]{1,64}` caps legal generated design-token names. Incoherent detail: the *same* lookbehind already ends in unbounded `\s*`. Fix: `\s*` both positions; raise or drop the name cap.

## H4-7 (LOW): the unpinned-judge probe writes an unmarked `Result: floor PASS`

With `--allow-unpinned-judge`, scoreRun proceeds and writes `Result: floor PASS (…)` with no probe marker — the card's only probe signal is the unfilled `<pin…>` placeholder above it. F2's own doctrine ("the marker must live in ARTIFACTS, not scrollback") was applied to audit-seed but not to the judge-pin probe, and `Result:` is the line readers trust. Fix: prefix `PROBE (unpinned judge)` when the placeholder survives. Cosmetic patch residue in the same function: two bindings for one path (`runCardPath2` / `runCardPath`) and a dead `existsSync` re-check immediately after the existence check throws.

## H4-8 (LOW): the Kimi numeric-parsing fix didn't cross the aisle

compare-tuned got `numArg`; dataset-helper's `--count` / `--max-examples` still do bare `Number(next)`. `--count abc` → NaN → `eval-seed` writes an **empty eval seed file** and exits 1 with "wrote 0 eval seed item(s)". Downstream fail-closed (compare throws "no rows"), so low — but it's the same defect class the H3 residual claimed, half-applied, and it leaves a residue file.

---

## VERDICT: **WET — not DRY.** H4-1 through H4-4 are substantive; H4-1 was introduced by the H3-3 fix itself.

## DISSENT (mandatory)

The dissenting reviewer would strike or demote the tail and contest one middle finding:

- **Against H4-3.1:** `--force` *means* regenerate-all; the operator consented to destroying old outputs, and unlike verdicts (human judgments, unrecoverable), outputs are machine-regenerable at temperature 0. Truncation is therefore semantically honest. — *Rebuttal:* consent covers the intended dir, not the mistaken one, and renaming costs nothing; more importantly, 3.2 and 3.3 (crash-path residue, stale scorecard) survive this objection entirely, since no consent was given to leaving incoherent artifacts behind.
- **Against H4-2 / H4-6:** contrived inputs — who writes `url('#fade')` with hex-spelling ids, or 5-whitespace var() blocks? — *Rebuttal:* SVG gradient ids like `fade`/`bead`/`facade` are precisely what a design track emits, and multiline custom-property fallback chains are ordinary formatting; both are build-killers, not lint noise. Still, these are the first findings to sacrifice under pressure.
- **Against H4-1's severity:** the fix needs its own fixtures (spaced `url( #fade )` regresses under a naive `(`-restore — noted above) or we trade a false negative for a false positive. — *Conceded as process risk, not as grounds to withhold the finding; the half-flagged gradient declaration is demonstrable today.*
- **Deliberately not flagged** (below the false-finding bar): prose-mentioned hex escaping the value-position guard (designed residual, argued and accepted in F6); the commitment regex's string coupling to `renderRunCard`'s exact phrasing (smoke-verified, unverifiable from packet); missing-value edges of `next()`/`argv[i+1]`; `--allow-*` flags absent from help text.

Even striking H4-5 through H4-8 entirely, H4-1 through H4-4 stand on code-verified evidence. DRY is not available this round.
