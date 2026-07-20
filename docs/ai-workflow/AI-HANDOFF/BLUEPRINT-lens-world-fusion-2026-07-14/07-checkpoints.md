# 07 — CHECKPOINT PROTOCOL

## Cadence
One checkpoint per slice (F0…F6), at the STOP line, BEFORE the builder proceeds. F3 additionally
requires Sean's ping before push (it flips live UX). F5's recipe authoring happens INSIDE the
checkpoint (Fable writes the six token sets; builder integrates).

## Builder submits (exact package per slice)
1. The full diff (`git diff <base>..HEAD` for the slice commits).
2. Every acceptance criterion from `05-slices.md` with its REAL output pasted underneath
   (test runs, curl transcripts, DOM/computed-style dumps, screenshots, RED proofs).
3. The Rule 61 hostile self-review: findings found, fixes applied.
4. Rule 42 audit output; tsc + build lines; budgets table (file → lines/budget).
5. Open questions (anything the package didn't decide — expected to be rare; improvisation is a
   REVISE).

## Reviewer remit (Fable or Final-Decider fallback; free triangle acceptable for F0/F1/F6 if Sean
prefers — F2/F3/F4/F5 are taste/UX slices and stay with Fable)
- Verify every criterion against the pasted evidence — no evidence, no pass.
- Drift scan: built-but-not-specified, specified-but-not-built, any 06-bans hit.
- Re-run at minimum: the slice's test folders + tsc (reviewer-side trust-but-verify).
- Verdict: `PASS` (next slice) / `REVISE` (numbered list; builder fixes, resubmits same slice) /
  `HALT` (architecture wound — back to Fable, package gets amended, amendment logged here).

## Verdict log (append per checkpoint)
| Date | Slice | Verdict | Notes |
|---|---|---|---|
| 2026-07-16 | **F0** | **PASS** (Fable architect-as-builder, Rule 61 hostile pass in-session) | Atmosphere axis + chart-secondary token SHIPPED. RED-proven (6 fail pre-impl) → 225/225 lab+adapters+core (+9), tsc 0, build green. Files: recipeV2.ts 176 (drift: +54 vs the +45 note — `validateAtmosphere` exported separately so the compiler can apply the drop-not-fail law; validateRecipeV2 stays loud for gate suites), compileRecipe.ts 146 ✓, atmosphereCatalog.ts 83/120 (8 Law-A assets, Fable taste, gradients + inline-SVG data-URIs only), LensPlanFrame.tsx 175 (drift: +59 vs +35 — guarded `useStillMode` via useSyncExternalStore [matchMedia-absent-safe for jsdom] + honors `data-motion="off"`; SSR snapshot defaults STILL). Firewall H1 honored: layers render STATIC always (no animation path exists in the frame); still/off ⇒ stillPoster only (`data-atmo-mode` test-pinned); unknown assetId ⇒ layer skipped fail-closed; `position:relative` applied ONLY when atmosphere renders (zero-delta tightening from the hostile pass). Zero-delta locked: atmosphere-free plans carry NO atmosphere key, deterministic, cssVariables pinned; production untouched (v1 ids still resolve null pre-F3). CHART_SECONDARY_TOKEN exported + doc'd; Victory-seam consumption lands with F5/F6 usage (recorded, deliberate). Acceptance criterion 2's "unknown assetId compiles with degradation" implemented as: STRUCTURAL invalidity → compile-level degradation `atmosphere invalid — dropped`; CATALOG-unknown id (valid shape) → frame-level skip — the catalog is adapter-side and core cannot know it (architect ruling on own criterion). |
| 2026-07-14 | PLAN round 3 | **APPROVE** | Re-review @ d674ec27d: both round-2 items grep-verified CLOSED. N1 blast radius confirmed EXACTLY 4 assertion-lines / 2 files — `V2_RECIPES_BY_STYLE_LENS_ID` is not exported (no hidden importer), only 2 test files reference the resolver, all enumerated; the 3 stable fall-through lines correctly kept green. R2 ERD contradiction gone. Only residual = a LOW cosmetic "THREE vs FOUR" count-label mismatch (non-blocking; line-level enumeration already exact). **Applied the reviewer's exact wording fix** (THREE→FOUR across 04/05; "if a fourth breaks"→"if ANY test beyond these four"), plus a strengthening note naming the sole runtime caller `SurfaceLensGate.tsx:29` that the flag-in-resolver design gates. **Blueprint APPROVED and ready for Codex** — all 15 round-1 + 2 round-2 + 1 round-3-cosmetic items closed across all 8 files. |
| 2026-07-14 | PLAN round 2 | REVISE→FIXED | Re-review of the fixed package @ df08bd556: 14/15 round-1 findings confirmed correctly resolved, but the M2 fix introduced **N1** (HIGH): retiring the recipe-id map breaks THREE assertions across TWO source-contract tests (`WorkoutDesignLab.styleAxis.test.tsx` A3 `not.toContain("catalogV2Map")` + `toContain("V2_RECIPES_BY_STYLE_LENS_ID…")`; `surfaceManifests.test.ts` recipe-id lookups) that the blueprint called "the ONE change" — F3 would halt at the first RED. Plus **R2** (stale `profileSchemaVersion` column in the 01-arch ERD). BOTH fixed: F3 now enumerates all three sanctioned contract changes + "if a fourth breaks, STOP"; ERD column removed. Verified the two tests' exact assertions against real code before fixing. |
| 2026-07-14 | PLAN round 1 | REVISE→FIXED | Fresh-eyes hostile review of the whole package vs main @ 12dd2725a found 4 BLOCKER + 2 HIGH + 4 MED + 5 LOW (all verified against real code). ALL fixed in blueprint text before any Codex build: **B1** motionMode enum `lean/still`→real `auto\|reduced\|off`; **B2** profileSchemaVersion string `'1'`→number `1` (dropped the redundant column); **B3** F4 reinvented tier system → use canonical `free\|pro\|elite` + `requireTier.mjs` (402 `TIER_REQUIRED`, Subscription-table truth, `TIER_GATING_ENABLED` kill, admin/trainer bypass, `/ascension`); **B4** F1 sync seam was ABOVE AuthProvider (App.tsx:244 is a parent of auth) → new `AppearanceSyncBridge` mounted inside AuthProvider; **H1** product atmosphere autoplay violated §3 → default INERT (stillPoster) on product, `animated` marketing-only, dropped "verbatim" claim; **H2** client tier via `useFeatureAccess` not AuthContext User; **M1** localStorage flag = per-tester override, not fleet kill (real kill = revert/env); **M2** `resolveRecipeForStyleLens` keyed by recipe-id never matched catalog-id `styleLensId` → resolve via single `V2_RECIPE_BY_CATALOG_ID`; **M3** sync-in used `setPersistenceSuppressed` to avoid redundant push; **M4** exact per-tier locked-row copy tabled; **L1** StyleLensProvider:73→74; **L2** opacity 0.12 = looser-than-WEATHER (honest); **L3** carousel caption reconciled; **L4** "187" → re-count; **L5** named `surfaceManifests.test.ts`. |

## Handoff prompt for the builder (copy-paste to start the program)
> Read `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-lens-world-fusion-2026-07-14/00-README.md` through
> `07-checkpoints.md` fully, then CLAUDE.md rules 42/43/58/61/67. Claim your lane in
> `.ai-workflow/coordination/` (read both lane files first). Work in a fresh worktree off current
> origin/main. Execute slice F0 per `05-slices.md` — tests first, RED proven — and submit the
> checkpoint package. You have ZERO design latitude except where the package explicitly delegates
> with bounds. The Builder Contract in 00-README governs everything.
