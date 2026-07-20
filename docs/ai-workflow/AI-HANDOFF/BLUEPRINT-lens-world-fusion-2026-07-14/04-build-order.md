# 04 — BUILD ORDER (file-by-file; ≤300 lines each; Rule 43 css helper for shared fragments)

Pattern sources the builder MUST mimic (all verified on main @ f234197fb):
- **Lens frame binding:** `frontend/src/adapters/style-lens-swan/v2/SurfaceLensGate.tsx` (the
  `makeLensFrame` factory) — the pattern for any new lens-aware wrapper.
- **Recipe + validation:** `frontend/src/core/style-lens-os/v2/recipeV2.ts` — extend in place.
- **Data catalogs:** `frontend/src/adapters/style-lens-swan/v2/catalogV2Map.ts` — the shape for
  `atmosphereCatalog.ts`.
- **Confirmation chip:** `frontend/src/components/DashBoard/Pages/workout-design-lab/LabConfirmationChip.tsx`
  — reuse the component directly (import it; do NOT fork it).
- **Backend route+model pair:** mimic a compact existing pair in `backend/routes/` +
  `backend/models/` (builder picks the cleanest recent example, names it in the receipt).
- **Tests:** mimic `WorkoutDesignLab.styleAxis.test.tsx` (render+laws) and
  `adapters/style-lens-swan/v2/labRecipes.test.ts` (gate suites).

## F0 — engine (5 files)
| File | New/Edit | Budget | Notes |
|---|---|---|---|
| `core/style-lens-os/v2/recipeV2.ts` | edit | +45 | §1 of 03-contracts; additive only |
| `core/style-lens-os/v2/compileRecipe.ts` | edit | +30 | emit `lens2-atmosphere` plan section; fail-closed on invalid atmosphere (drop atmosphere, keep recipe — degradation entry `atmosphere invalid — dropped`) |
| `adapters/style-lens-swan/v2/atmosphereCatalog.ts` | NEW | ≤120 | §2 seed of 8 assets |
| `components/.../workout-design-lab/LensPlanFrame.tsx` | edit | +35 | ONE atmosphere child el: `aria-hidden`, `pointer-events:none`, `contain:paint`, `position:absolute inset:0 z-index:0`; content wrapper gets `position:relative z-index:1`; Still/reduced-motion ⇒ stillPoster only |
| `core/style-lens-os/v2/*.test.ts` + `LensPlanFrame.test.tsx` | edit | — | RED-first per 05-slices |

## F1 — persistence (6 files)
`backend/models/UserAppearanceProfile.mjs` NEW ≤90 (no separate schemaVersion column — B2) ·
migration `.cjs` NEW · `backend/routes/appearanceProfileRoutes.mjs` NEW ≤160 · route-index mount
edit · `adapters/style-lens-swan/serverAppearanceSync.ts` NEW ≤120 · NEW
`frontend/src/components/.../AppearanceSyncBridge.tsx` ≤70 mounted INSIDE `AuthProvider`
(App.tsx below line 248 — NOT at 244; see 03-contracts §6 B4). `App.tsx` edit +8 (mount the bridge).
Backend tests: NEW `backend/tests/.../appearanceProfile.test.mjs` mimicking the routes-folder test
idiom (auth required, own-user only, validation 422 table mirroring `validation.ts` EXACTLY —
motionMode `auto|reduced|off`, schemaVersion number `1`; tier gate comes in F4).

## F2 — Crown Header (5 files, all NEW under `frontend/src/components/UserDashboard/CrownHeader/`)
`CrownHeader.tsx` ≤240 (band + identity + mounts carousel; wrapped in its own `makeLensFrame`
scoped preview) · `LooksCarousel.tsx` ≤220 (scroll-snap, cards, Wear flow) · `CrownHeader.styles.ts`
≤200 · `crownHeaderLooks.ts` ≤80 (ordering per 02-wireframes §1) · `CrownHeader.test.tsx`.
Mount: the user dashboard HOME page component — builder locates the canonical mounted Home via the
route tree (Rule 26 receipt REQUIRED in the slice report: route file line + mounted JSX line),
inserts `<CrownHeader/>` as the first child above existing content. DO NOT restructure Home.

## F3 — rollout (3 files)
**The runtime caller that flips (know this before editing):** the ONLY production consumer is
`SurfaceLensGate.tsx:29` → `resolveRecipeForStyleLens(appearance?.state.committed.styleLensId)`.
**BLAST RADIUS (updated 2026-07-16 after Wave-1): `makeLensFrame` now has SIXTEEN call sites,
not six** — the original 6 coach/product surfaces PLUS Wave-1's 4 dashboard shells
(`DashBoard/v2/shell/dashboardManifests.ts`) and 6 public v-next pages (Home, About, Store-v4,
Gallery-vnext, Video-vnext, Contact manifests). Flipping the flag restyles ALL of them for any
signed-in user with a committed catalog lens. Before building F3: re-enumerate `makeLensFrame`
call sites (`rg -n "makeLensFrame" frontend/src`), list them in the receipt, and include the
v-next/public pages in the viewport spot-checks; the F3 checkpoint + Sean ping must see the
FULL surface list. The gate mechanism is unchanged: flag + catalog-map resolution INSIDE
`resolveRecipeForStyleLens` gates every consumer at once. Flag OFF → null → host defaults;
ON → the recipe. Also re-verify the 4-assertion enumeration below at build time — parallel
lanes keep adding suites (re-run `rg -n "resolveRecipeForStyleLens" frontend/src --glob "*.test.*"`).
`adapters/style-lens-swan/v2/recipeResolution.ts` edit: **make `resolveRecipeForStyleLens` resolve
via the single catalog-keyed map `V2_RECIPE_BY_CATALOG_ID`** (M2 — today it keys by recipe id
`swan.*.v2` while the committed `styleLensId` is the catalog id, so it can never match; retire the
recipe-id `V2_RECIPES_BY_STYLE_LENS_ID`), added BEHIND `isLensV2RolloutEnabled()` from NEW
`adapters/style-lens-swan/v2/rolloutFlag.ts` (≤40).
**Kill-switch honesty (M1):** `localStorage['swan-lens-v2-rollout']='off'` is a **per-browser tester
override**, NOT a fleet incident kill — do not call it one. The production rollback for a
misbehaving v2 rollout is a `git revert` + redeploy; if a real fleet kill is wanted, make the
default an env/build value like the existing server-side `TIER_GATING_ENABLED` pattern
(requireTier.mjs) — flag that as a Sean decision at the F3 checkpoint. Document all of this in the file header.
**Sanctioned F3 source-contract test changes (N1 — the M2 map switch breaks FOUR assertions across
TWO files, two per file; the pre-rollout "stays inert" intent is exactly what this Sean-approved
successor slice reverses, so these are authorized, not accidental):**
1. `frontend/src/components/DashBoard/Pages/workout-design-lab/WorkoutDesignLab.styleAxis.test.tsx`
   — the test **"A3: production resolveRecipeForStyleLens stays untouched and inert (source
   contract)"**: `expect(resolution).not.toContain("catalogV2Map")` and
   `expect(resolution).toContain("V2_RECIPES_BY_STYLE_LENS_ID[styleLensId] ?? null")` both become
   false. REWRITE those two lines to assert the NEW contract (recipeResolution imports
   `catalogV2Map`; resolves via `V2_RECIPE_BY_CATALOG_ID`; recipe-id map retired) and RENAME the
   test ("stays untouched and inert" is no longer true — call it e.g. "resolves committed catalog
   ids via the catalog map behind the rollout flag"). The Apply-honesty asserts lower in the same
   test are untouched by M2 — keep them green.
2. `frontend/src/adapters/style-lens-swan/v2/surfaceManifests.test.ts` — the test "resolves recipes
   ONLY for exact v2 ids": it calls `resolveRecipeForStyleLens(CANDY_GLASS_ARCADE_RECIPE.id)` (the
   RECIPE id `swan.candy-glass-arcade.v2`). After M2 keys by CATALOG id, flip those two lookups to
   catalog ids (`'candy-glass-arcade'`, `'prism-terminal'`); the `null`/`undefined`/unknown-id
   fall-through lines stay.
These are the FULL enumerated set of F3 contract changes (4 assertion-lines, 2 files) — there is no
other. Do NOT edit any other test to make F3 pass; if ANY test beyond these four goes RED, STOP and
checkpoint.

## F4 — Style Studio (6 files)
`components/UserDashboard/StyleStudio/StyleStudio.tsx` ≤260 (sheet/drawer, rows, tier locks) ·
`StyleStudio.styles.ts` ≤200 · `overlaySchema.ts` in `core/style-lens-os/v2/` NEW ≤90 (§4 types +
`validateOverlay`) · `adapters/style-lens-swan/v2/overlayChoices.ts` NEW ≤80 (ACCENT_CHOICES,
FONT_PAIRINGS data) · backend route edit (+overlay validation + the canonical tier gate) · tests
both sides. Overlay application: edit `LensPlanFrame.tsx` +20 — overlay tokens applied AFTER plan
tokens on the same style attr (precedence law 01-§3).
**Tier source (B3/H2 — the canonical stack already exists; do NOT invent or STOP):**
- **Server:** gate via `backend/middleware/requireTier.mjs` / `resolveCurrentEntitlement`
  (Subscription-table truth), internal ids `free|pro|elite` (`tierCatalog.mjs` `meetsMinimumTier`),
  402 `TIER_REQUIRED` shape, `TIER_GATING_ENABLED` kill switch + admin/trainer bypass, `/ascension`.
- **Client:** read entitlement via `useFeatureAccess`/`FeatureAccessContext` (`hasFeature`) — the
  AuthContext `User` has NO tier field, so the old "read the user object / STOP if absent"
  instruction was wrong. Map FREE=`free`, GUARDIAN=`pro`, CRYSTALLINE=`elite`; display copy keeps
  the Guardian/Crystalline names.

## F5 — distillation (2 files + 6 data entries + enumerations)
`.claude/skills/swan-world-factory/SKILL.md` edit: add the `--distill` worker contract section ·
`scripts/ai-workflow/world-distill.mjs` NEW ≤200 (reads worlds.md section, emits §5 seed JSON;
deterministic, seed-stamped) · then the six styles land via the EXISTING A4 pipeline (5 entries
each + enumeration appends per `LENS-ADD-A-STYLE.md`) — recipe literals authored at checkpoint
with Fable (taste pass is architect-side, NOT builder-side).

## F6 — gates (3 files)
`adapters/style-lens-swan/v2/labRecipes.test.ts` edit: atmosphere gates (layer caps, opacity
range, assetId exists in catalog, stillPoster present, `world-chart-secondary` contrast ≥3:1 vs
each recipe's panel token resolved fallback) + map-completeness assertion (every exported
`*_RECIPE` in labRecipes.ts appears in `V2_RECIPE_BY_CATALOG_ID` — closes the gate-bypass hook;
because F3 makes production resolution ALSO read this same map (M2), completeness here now covers
both the gate AND production resolution, no second map to drift) · `CrownHeader.perf.test.tsx` NEW:
source-contract — no canvas/video/webgl imports, no
`requestAnimationFrame` in CrownHeader/StyleStudio, atmosphere el `aria-hidden` ·
`styleLensBoundary.test.ts` edit: forbid factory imports (`world-factory|scripts/ai-workflow`) in
core AND adapters (the bridge is data-only — enforce it).
