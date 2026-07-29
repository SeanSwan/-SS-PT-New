# SWAN LENS — WORLD ENGINE · Continuation Handoff (2026-07-29)

- **For:** the next agent continuing the 25-World Engine build + running an exhaustive hostile-review dry-loop.
- **Branch:** `claude/build-swan-lens` (git worktree at `C:\tmp\ss-build-swan-lens`). **NOT pushed** (batch cadence).
- **Issue:** SWA-69 (Linear). **Program spec:** `AI-HANDOFF/SWAN-LENS-WORLD-ENGINE-MASTER-BUILD-PROMPT-2026-07-28.md`
  (roster §1, refactor §3, agents §4, gaps §5, the distinctness-gate correction §5.5, 19 slices §6, guardrails §7).
- **Taxonomy canon:** `references/SWAN-LENS-OS.md`. **World DNA source:** `design-brain/worlds.md`.
- **This file is self-contained** (Rule 48 style): read it + the master prompt and you can continue with zero
  re-derivation. Read `CLAUDE.md` + `MEMORY.md` first for the standing rules.

---

## 0. THE MISSION (one paragraph)
Sean directed (2026-07-28): build ALL 25 Swan Lens "worlds" — promote the 25 real style-catalog lens ids from
chrome-only to full `--world-*` `RecipeV2` worlds, a complete refactor, "as creative and vivid as possible."
Kimi + Fable advised; the running model is lead orchestrator. Worlds render only in the Workout Design **Lab**
until a Sean-gated rollout flip (Slice 15) — so building them is **zero live-user risk** while the resolver gate
stays closed. There is also a future **agent frontier** (agents propose worlds, never write tokens) — not started.

## 1. CURRENT STATE — what is DONE (all committed on `claude/build-swan-lens`, batch cadence, unpushed)

| Slice | Commit | What |
|---|---|---|
| Master prompt | `96d719883` | The 25-world build spec (Kimi+Fable+orchestrator synthesis). |
| **Slice 1 — engine spine** | `3ae82c282` | `worlds/` dir: closed `WorldId` union = 25 real ids; exhaustive `registry.ts` (WorldEntry built\|planned); the 2 Golden Pair recipes MOVED to `worlds/recipes/` (labRecipes re-exports → hash-identical); exhaustive `ledger.ts` (per-world budget + unique phenomenon); `scripts/lens-add-world.mjs` generator; `registry.test.ts` (CI layers 1–2 + migration proof). |
| **W0 — variant vocabulary** | `52d619a50` | `worlds/variantVocabulary.ts` single-source (display 5 / body 4 / surface 5 / collection 5 / action 4 / chart 4 + 4 templates), consumed by `LAB_HOST_MANIFEST` + all 6 surface manifests; real form renderers in `lensRepresentationStyles.ts`; `LensPlanFrame` emits `data-lens2-body`; `variantVocabulary.test.ts` proves 25 distinct codewords exist via the real gate. |
| **Wave 1 — 4 worlds** | `8681ea6f9` | aurora-index, crystalline-cathedral, coach-ledger, quiet-meridian authored (verified-distinct codewords + Law-A tokens), wired into `registry.ts` BUILT_RECIPES + `catalogV2Map.ts` (dashboardChrome:true). Fixed 4 stale `styleAxis` tests via `CHROME_ONLY_ID` + a loud guard. |

Hermes memos: `2856ad473`, `a103cbce6`, `6de279df8`, `c9a3b677f` (+ this handoff). **6 of 25 worlds built; 19 planned.**

**Built worlds (6):** candy-glass-arcade, prism-terminal (Golden Pair) + aurora-index, crystalline-cathedral,
coach-ledger, quiet-meridian (Wave 1).
**Planned worlds (19, still chrome-only):** kinetic-kanban, signal-garden, tempo-forge, orbit-atlas, modular-harbor,
kintsugi-circuit (playful) · recovery-cloister, monastic-grid, lunar-stack (calm) · blueprint-fold,
analog-flight-recorder, chronograph-board, terrain-console (technical) · carbon-atelier, meridian-magazine,
glass-rail (luxe) · tidal-columns, split-horizon, cedar-workshop (atmospheric).

## 2. ARCHITECTURE MAP (the load-bearing files)
- `frontend/src/adapters/style-lens-swan/worlds/` — **the spine.** `worldId.ts` (25-id closed union + families),
  `registry.ts` (WORLD_REGISTRY, BUILT_RECIPES), `ledger.ts` (WORLD_LEDGER), `recipeShared.ts` (RECIPE_SHARED base),
  `variantVocabulary.ts` (variant single-source), `recipes/<id>.ts` (one per built world).
- `frontend/src/adapters/style-lens-swan/v2/` — engine: `labRecipes.ts` (LAB_HOST_MANIFEST + Golden Pair re-export),
  `surfaceManifests.ts` (6 surface manifests from the vocabulary), `catalogV2Map.ts` (Lab display map),
  **`recipeResolution.ts` (THE ROLLOUT GATE — do NOT touch without Sean + updating the A3 contract test)**.
- `frontend/src/core/style-lens-os/v2/` — brand-neutral core: `compileRecipe.ts` (deterministic), `recipeV2.ts`
  (`validateRecipeV2`), `whatChanged.ts` (the distinctness metric), `hostCapabilityManifest.ts`.
- `frontend/src/components/DashBoard/Pages/workout-design-lab/` — the Lab: `LensPlanFrame.tsx` (emits `data-lens2-*`
  + `--world-*`), `lensRepresentationStyles.ts` (variant→FORM CSS), `WorkoutDesignLab.styleAxis.test.tsx` (the
  chrome-vs-v2 UX tests + the A3 gate-inert source contract).

## 3. LOAD-BEARING FINDINGS (do not relearn these the hard way)
1. **Distinctness is STRUCTURAL, not color.** `whatChanged` counts only 6 axes: typography (text.display OR
   text.body), composition (template), surface, collection, action, chart. **Tokens (colors/fonts/radii) count
   ZERO.** Every world-pair must differ ≥3 axes (Golden Pair ≥5). Design each new world's **codeword** (variant
   combo) to differ ≥3 axes from EVERY existing world; verify by hand THEN via the tests. Colors carry family feel
   but never distinctness.
2. **The variant vocabulary is the expressiveness ceiling** (W0 fixed it). ~4–5 variants/axis + 4 templates now
   support >25 distinct codewords (proven in `variantVocabulary.test.ts`). Add more variants in
   `variantVocabulary.ts` if you run low; each new variant needs a FORM renderer in `lensRepresentationStyles.ts`
   keyed on a REAL `data-lens2-*` attr + a REAL `.lens2-*` element (only `lens2-row/collection/actions/display/
   composition` exist; `surface.card` + `chart.progress` are TOKEN-only — no form primitive yet, W0.2 follow-up).
3. **All 25 ids ship a v1 chrome lens** (`styles/lenses/*.ts`, in `LENS_STYLE_ALLOWLIST`). So catalogV2Map entries
   are **dashboardChrome:true** (the bidirectional test enforces this). v2 still renders Lab-only (gate closed).
4. **Promoting a lens to v2 breaks chrome-vs-v2 tests.** `styleAxis.test.tsx` needs a still-chrome id as its
   `CHROME_ONLY_ID` example (currently `lunar-stack`) + a loud guard. When you promote lunar-stack, pick another
   still-chrome id. **When ALL 25 are v2, the chrome-only concept RETIRES** — those tests fundamentally change;
   that transition is Slice 15 (Sean-gated go-live). **So you CANNOT finish all 25 without Sean's Slice-15
   decision — leave ≥1 chrome id until then.**
5. **Whole-repo `tsc`/`npm run type-check` OOMs on this box** (even at 8GB — dies in mark-compact with ZERO
   `error TS` output; it's an environment limit, not a code error). **Use a STANDALONE minimal tsconfig** (see §5)
   scoped to touched files for a real type verdict; disclose the full baseline as UNVERIFIED (Rule 56). Do NOT
   `extends ./tsconfig.json` — that pulls the whole project graph and re-OOMs.

## 4. REMAINING WORK
- **Waves 2–4:** author the 19 planned worlds (draw DNA from master prompt §1 + `design-brain/worlds.md`). Each:
  a distinct codeword + Law-A tokens → `worlds/recipes/<id>.ts` → add to `registry.ts` BUILT_RECIPES + `catalogV2Map`
  (dashboardChrome:true) → update `registry.test.ts` built/planned counts → run the distinctness + consumer suites.
  **Leave ≥1 chrome id** (keep `CHROME_ONLY_ID` valid) until Slice 15.
- **W0.2 (optional):** add `.lens2-surface` + `.lens2-chart` primitive elements so surface/chart become FORM axes.
- **DEFERRED / SEAN-GATED (do NOT do autonomously):** the theme-collapse track (Slices 2–6 — touches the LIVE
  palette every user sees; highest blast radius; needs the characterization oracle + Sean supervision); Slice 15
  gate flip (all-25 go-live rollout decision); Slices 16 + dead-code deletions (Rule 34 — needs Sean approval);
  the agent frontier (Slices 17–19); the **Render push** (Sean's gate, rule 70).

## 5. HOW TO RUN THE GATES (exact commands — cwd `C:\tmp\ss-build-swan-lens\frontend` unless noted)
```bash
# Affected + blast-radius tests (fast):
npx vitest run src/adapters/style-lens-swan/ src/components/DashBoard/Pages/workout-design-lab/ \
  src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerLensFrame.test.tsx \
  src/components/WorkoutLogger/WorkoutLoggerLensFrame.test.tsx --reporter=dot

# Standalone tsc (real type verdict without the whole-repo OOM) — write in frontend/, delete after:
cat > tsconfig.worlds.json <<'EOF'
{"compilerOptions":{"target":"ES2020","lib":["ES2020","DOM"],"module":"ESNext","moduleResolution":"bundler","strict":true,"jsx":"react-jsx","skipLibCheck":true,"esModuleInterop":true,"noEmit":true,"types":["vitest/globals"]},
 "include":["src/adapters/style-lens-swan/worlds/**/*.ts","src/adapters/style-lens-swan/v2/labRecipes.ts","src/adapters/style-lens-swan/v2/catalogV2Map.ts","src/adapters/style-lens-swan/v2/surfaceManifests.ts","src/adapters/style-lens-swan/v2/recipeResolution.ts"]}
EOF
NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit -p tsconfig.worlds.json 2>&1 | grep -E "error TS"; echo "exit=${PIPESTATUS[0]}"; rm -f tsconfig.worlds.json

# Commit (explicit paths, NEVER git add -A; the pre-commit hook runs the secret scan):
git add <explicit paths>; git commit -m "..."   # DO NOT push (batch cadence; Sean pushes)
```

## 6. THE 40-ROUND HOSTILE-REVIEW DRY-LOOP (Sean's ask)
Run an exhaustive hostile review across the ENTIRE World Engine slice set (Slice 1 + W0 + Wave 1) — **up to 40
rounds, each from a NEW vantage not yet tried**, per the Dry-Loop Law: repeat until a round finds NOTHING fixable,
then ONE MORE confirmation round (two consecutive CLEAN = dry). Re-reading code is NOT a round; each round gathers
NEW evidence (a different mode/flag/role/viewport/cwd/real caller path). The round that applied fixes is the next
round's primary attack surface. Sean-gated findings → Linear (do NOT fix). End with the round ledger + literal
`DRY-LOOP: CLEAN×2 (rounds: N)` and a `PROOF:` line (current-session evidence). **Vantages to attack (non-exhaustive):**
- Distinctness math: are all 6 built worlds still pairwise ≥3? Re-derive by hand vs `whatChanged`.
- Dead code: any CSS selector targeting a non-existent `.lens2-*` element or an unemitted `data-lens2-*` attr?
  (grep `className=` for real elements — this already caught bugs.) Any unused export in `worlds/`?
- Law A: any retired Galaxy-Swan hex (`#0a0a1a`/`#00FFFF`/`#7851A9`)? Any accent/action NOT `var(--token,#fb)`?
- Gate integrity: is `recipeResolution.ts` still inert in production? Does the A3 source-contract test still pass?
- Manifest drift: do the Lab host + all 6 surface manifests still draw the SAME vocabulary? Does every built recipe
  compile against ALL 6 surface manifests (degrading only declared-optional slots)?
- Hash-identical: do the 2 Golden Pair recipes still resolve to the SAME object refs through every import path?
- a11y: 44px targets, reduced-motion, WCAG 4.5:1 at brightest frame (the palette-matrix test covers chrome; v2
  world panels are dark + Frost White text — verify).
- Responsive: the new templates (editorial-column all-profile, atrium-split tablet/desktop → mobile playfield-stack).
- Registry/ledger exhaustiveness; the `WORLD_COUNT:25` compile guard; the `CHROME_ONLY_ID` guard.
- Run the FULL affected suite + standalone tsc EACH round you change anything.

## 7. GUARDRAILS (non-negotiable — from CLAUDE.md)
Law A (chrome stays Crystalline Swan tokens; world paints only the setting); `var(--token,#fallback)`; retired
Galaxy-Swan hex banned; design NEVER gates (de-gate doctrine — no per-page surface flags); deterministic compiler +
fail-closed guard preserved; do NOT re-key `recipeResolution` without Sean + the A3 test; Rule 34 (no delete without
grep + Sean); batch-push (commit per slice, Sean pushes); Dry-Loop to CLEAN×2 + PROOF; every closeout → Hermes memo
(`.ai-workflow/hermes-inbox/pending/`, IDs/roles only, secret-scan) + Linear SWA-69 update + dual-tier summary +
next-slice; zero PII to any LLM; files <300 lines; 7-star docs on new files.

## 8. WHAT SEAN CARES ABOUT (tone + priorities)
Momentum without faking; proof before "done"; hostile review until genuinely dry; least clicks/least time; vivid,
distinctive, premium design (not generic); honesty about what's proven vs not. He delegated the world CREATIVITY to
the agent ("be as creative and vivid as possible") — build boldly, he taste-cuts after. He is the only one who
flips the go-live gate and pushes to Render.
