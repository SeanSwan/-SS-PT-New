# SWAN LENS — WORLD ENGINE · Continuation Handoff (2026-07-29, rev 2)

- **For:** the next agent continuing the 25-World Engine.
- **Branch:** `claude/build-swan-lens` (git worktree at `C:\tmp\ss-build-swan-lens`). **NOT pushed** (batch cadence).
- **Issue:** SWA-69 (Linear). **Program spec:** `AI-HANDOFF/SWAN-LENS-WORLD-ENGINE-MASTER-BUILD-PROMPT-2026-07-28.md`
- **Taxonomy canon:** `references/SWAN-LENS-OS.md`. **World DNA source:** `design-brain/worlds.md`.
- **Read `CLAUDE.md` + `MEMORY.md` first** for the standing rules. This file is self-contained (Rule 48 style).

> **rev 2 supersedes rev 1.** Rev 1 described 6 built / 19 planned and a pending 40-round review. Both are done:
> **23 of 25 worlds are built**, and an 11-round hostile dry-loop ran to completion. Everything below is current.

---

## 0. THE MISSION
Sean directed (2026-07-28): build ALL 25 Swan Lens "worlds" — promote the 25 real style-catalog lens ids from
chrome-only to full `--world-*` `RecipeV2` worlds, "as creative and vivid as possible." Worlds render only in the
Workout Design **Lab** until a Sean-gated rollout flip (Slice 15), so building them is **zero live-user risk**
while `recipeResolution.ts` stays fail-closed. (Verified still untouched: `git diff main...HEAD` on that file is empty.)

## 1. CURRENT STATE

**23 of 25 worlds built. 2 are DELIBERATE chrome-only holdouts — not unfinished work.**

`lunar-stack` **and** `blueprint-fold` must stay `planned`. `WorkoutDesignLab.styleAxis.test.tsx` proves two things:
the v1-vs-v2 badge split (needs one still-chrome id, `CHROME_ONLY_ID`) **and** the Compare contract where BOTH panes
are chrome — exact chrome copy, two real scoped stages with independent lenses (needs a second, `CHROME_ONLY_ID_B`).
Rev 1 only recorded the need for one; promoting `blueprint-fold` broke three Compare tests. Both ids are behind named
constants with guard tests, so a future wave that promotes either must pick a fresh holdout or make the Slice-15 call.
**Retiring the chrome-only concept entirely is Slice 15 — Sean's go-live gate, not the agent's.**

| Slice | Commit | What |
|---|---|---|
| Master prompt | `96d719883` | The 25-world build spec. |
| Slice 1 — engine spine | `3ae82c282` | `worlds/` dir: closed `WorldId` union, registry, ledger, generator, CI layers 1–2. |
| W0 — variant vocabulary | `52d619a50` | `variantVocabulary.ts` single source (display 5 / body 4 / surface 5 / collection 5 / action 4 / chart 4 + 4 templates). |
| Wave 1 — 4 worlds | `8681ea6f9` | aurora-index, crystalline-cathedral, coach-ledger, quiet-meridian. |
| **W0.2 + rounds 1–2** | `b682b6967` | The 2 inert axes made real (see finding 1). |
| **Round 3** | `3e3ad782e` | a11y + data-legibility defects in the new form CSS. |
| **Round 4** | `2960b4943` | `worlds/lawA.test.ts` — Law A had zero automated enforcement. |
| **Round 5** | `6b0365e26` | `registry.test.ts` layer 2b — cross-surface compilation + chart-less distinctness. |
| **Waves 2–4** | `b83e27881` | **17 worlds authored**; catalog derived from registry; `BuiltWorldEntry`. |
| **Round 6** | `5e5f2d54b` | `worlds/fontLoading.test.ts` — 15 of 23 worlds asked for unloaded fonts. |
| **Round 7** | `5aa40b7ed` | `worlds/docTruth.test.ts` — headers must match the code. |
| **Round 8** | `5def80e7f` | `worldRenderSignature.test.tsx` — distinctness proven at the DOM. |
| **Round 9** | `da8b33401` | `v2/bundleBoundary.test.ts` — worlds were in the main entry chunk. |
| **Round 10** | `7bb6b1966` | tsc include was too narrow to see round 9's own type errors. |

## 2. ARCHITECTURE MAP
- `frontend/src/adapters/style-lens-swan/worlds/` — the spine. `worldId.ts` (25-id closed union), `registry.ts`
  (`WORLD_REGISTRY`, `BUILT_RECIPES`, `builtWorlds(): BuiltWorldEntry[]`), `ledger.ts`, `recipeShared.ts`,
  `variantVocabulary.ts`, `recipes/<id>.ts` (23 files). Tests: `registry`, `lawA`, `fontLoading`, `docTruth`,
  `variantVocabulary`.
- `frontend/src/adapters/style-lens-swan/v2/` — `labRecipes.ts` (Lab host manifest), `surfaceManifests.ts` (6
  surfaces), `catalogV2Map.ts` (**world entries DERIVED from the registry**), `catalogV2Exemptions.ts` (recipe-free
  metadata the app-wide barrel imports), **`recipeResolution.ts` (THE ROLLOUT GATE — do not touch without Sean +
  the A3 contract test)**.
- `frontend/src/core/style-lens-os/v2/` — brand-neutral core: `compileRecipe.ts`, `recipeV2.ts`, `whatChanged.ts`
  (the distinctness metric), `hostCapabilityManifest.ts`.
- `frontend/src/components/DashBoard/Pages/workout-design-lab/` — `LensPlanFrame.tsx` (the ONLY recipe→DOM
  boundary), `lensRepresentationStyles.ts` + `.surfaceChart.ts` (variant→FORM CSS),
  `concepts/conceptShared.styles.ts` (the `.lens2-*` hooks), `WorkoutDesignLab.styleAxis.test.tsx`.

## 3. LOAD-BEARING FINDINGS (do not relearn these the hard way)

1. **Distinctness is STRUCTURAL, not colour — and every counted axis must RENDER.** `whatChanged` counts 6 axes;
   tokens count ZERO. Two of those axes (`surface.card`, `chart.progress`) had **no DOM hook at all** until W0.2, so
   worlds could clear the ≥3-axis gate while painting nearly identically. `Panel` now carries `.lens2-surface` and
   `ReadinessDial` carries `.lens2-chart` (via `.attrs` className **merge** — callers' grid-area classes must
   survive). `lensRepresentation.coverage.test.tsx` fails the build if any vocabulary variant lacks a form renderer.
2. **Variant CSS may never restate a token-owned property.** Same specificity + later source order means the
   hardcoded value silently OVERRIDES the token for every future world using that variant. Variant rules touch only
   what no token controls (measure, wrap, casing, border width/style, backdrop-filter, clip-path, footprint, ring
   thickness). CI-enforced for display variants.
3. **Measure distinctness on the STRICTEST host, not the Lab.** Five of the six rollout surfaces publish no chart
   slot, so the chart axis degrades on both sides of a pair and the count drops by one. New codewords were solved
   against that conservative 5-axis metric (composition counted only when the DESKTOP template differs).
4. **Check the loader, not the design doc.** 15 of 23 worlds requested a typeface/weight the app never loads.
   **`Sora` is in NO font link** yet is referenced by 515 files repo-wide → **SWA-103 (Sean's call, touches
   `index.html`)**. Worlds now name Sora first with a LOADED face behind it, so they auto-upgrade when it lands.
5. **Two chrome-only holdouts are required** — see §1.
6. **Whole-repo `tsc` OOMs on this box.** Use a standalone tsconfig — and make its `include` the FULL graph
   (`worlds/**`, `v2/**`, the barrel, the touched Lab files). A narrow glob reported "clean" while two real type
   errors sat in files it never opened. Disclose the full baseline as UNVERIFIED (Rule 56).
7. **The app-wide barrel must stay recipe-free.** `adapters/style-lens-swan/index.ts` is imported by every page;
   importing `catalogV2Map` there bundles all worlds into the main entry chunk. Guarded by `v2/bundleBoundary.test.ts`.

## 4. REMAINING WORK
- **Sean-gated (do NOT do autonomously):** the theme-collapse track (Slices 2–6 — touches the LIVE palette);
  **Slice 15** (the all-25 go-live flip + retiring the chrome-only concept); Slice 16 and any dead-code deletion
  (Rule 34); the agent frontier (Slices 17–19); **the push to Render** (Rule 70 — everything stays committed-unpushed).
- **SWA-103** — the font links. Until Sean lands it, worlds render on their fallback faces by design.
- **Optional:** measured layer-3 budgets (Lighthouse/Playwright) are still `measured: null` in the ledger — Slice 8.
- **Optional:** `sanctionedColorways` is `[]` for every world (G1); a wave slice was meant to assign 3–5 each.

## 5. HOW TO RUN THE GATES (cwd `C:\tmp\ss-build-swan-lens\frontend`)
```bash
# Affected + blast-radius tests:
npx vitest run src/adapters/style-lens-swan/ src/components/DashBoard/Pages/workout-design-lab/ \
  src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerLensFrame.test.tsx \
  src/components/WorkoutLogger/WorkoutLoggerLensFrame.test.tsx --reporter=dot

# Standalone tsc — FULL world graph (a narrow include lies):
cat > tsconfig.worlds.json <<'EOF'
{"compilerOptions":{"target":"ES2020","lib":["ES2020","DOM"],"module":"ESNext","moduleResolution":"bundler",
 "strict":true,"jsx":"react-jsx","skipLibCheck":true,"esModuleInterop":true,"noEmit":true,
 "types":["vitest/globals","vite/client","node"],"baseUrl":".","paths":{"@/*":["src/*"]}},
 "include":["src/adapters/style-lens-swan/worlds/**/*.ts","src/adapters/style-lens-swan/v2/**/*.ts",
 "src/adapters/style-lens-swan/index.ts",
 "src/components/DashBoard/Pages/workout-design-lab/lensRepresentationStyles.ts",
 "src/components/DashBoard/Pages/workout-design-lab/lensRepresentationStyles.surfaceChart.ts",
 "src/components/DashBoard/Pages/workout-design-lab/concepts/conceptShared.styles.ts",
 "src/components/DashBoard/Pages/workout-design-lab/LensPlanFrame.tsx",
 "src/components/DashBoard/Pages/workout-design-lab/lensRepresentation.coverage.test.tsx",
 "src/components/DashBoard/Pages/workout-design-lab/worldRenderSignature.test.tsx"]}
EOF
NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit -p tsconfig.worlds.json 2>&1 | grep -E "error TS"
rm -f tsconfig.worlds.json

npm run build        # also the only gate that catches stray backticks in css`` literals
```
Commit with **explicit paths** (never `git add -A`), use `git commit -F <file>` (backticks in a `-m` string get
eaten by bash command substitution — it happened), and **do NOT push**.

## 6. ADDING A WORLD (the checklist that now exists)
1. Author `worlds/recipes/<id>.ts` — codeword must differ ≥3 axes from EVERY built world **on the 5-axis
   production metric** (finding 3). Header must state the codeword (CI-checked against the object).
2. Colour tokens: `var(--palette-token, #fallback)`; bare hex ONLY in `world-panel`/`world-bg`/`world-shadow`.
3. Font: name a family+weight `index.html` actually loads (or put a loaded face behind the aspirational one).
4. Register in `registry.ts` `BUILT_RECIPES`. **`catalogV2Map` derives itself — no second edit.**
5. Update the built/planned counts in `registry.test.ts`. Keep ≥2 chrome-only ids.
6. Run the gates in §5. Nine test files will check the work automatically.

## 7. GUARDRAILS
Law A (chrome stays Crystalline Swan; the world paints only the setting); `var(--token,#fallback)`; retired
Galaxy-Swan hex banned; deterministic compiler + fail-closed resolver preserved; Rule 34 (no delete without grep +
Sean); batch-push (Sean pushes); Dry-Loop to CLEAN×2 + PROOF; every closeout → Hermes memo + Linear SWA-69 update +
dual-tier summary + next-slice; zero PII; files <300 lines; 7-star docs on new files.

## 8. WHAT SEAN CARES ABOUT
Proof before "done"; hostile review until genuinely dry; least clicks/least time; vivid, distinctive, premium design;
honesty about what is proven vs not. He delegated the world CREATIVITY to the agent — build boldly, he taste-cuts
after. He alone flips the go-live gate and pushes to Render.
