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
`backend/models/UserAppearanceProfile.mjs` NEW ≤90 · migration `.cjs` NEW ·
`backend/routes/appearanceProfileRoutes.mjs` NEW ≤160 · route-index mount edit ·
`adapters/style-lens-swan/serverAppearanceSync.ts` NEW ≤120 · `App.tsx` wire-up edit +25.
Backend tests: NEW `backend/tests/.../appearanceProfile.test.mjs` mimicking the routes-folder test
idiom (auth required, own-user only, validation 422 table, tier 403 comes in F4).

## F2 — Crown Header (5 files, all NEW under `frontend/src/components/UserDashboard/CrownHeader/`)
`CrownHeader.tsx` ≤240 (band + identity + mounts carousel; wrapped in its own `makeLensFrame`
scoped preview) · `LooksCarousel.tsx` ≤220 (scroll-snap, cards, Wear flow) · `CrownHeader.styles.ts`
≤200 · `crownHeaderLooks.ts` ≤80 (ordering per 02-wireframes §1) · `CrownHeader.test.tsx`.
Mount: the user dashboard HOME page component — builder locates the canonical mounted Home via the
route tree (Rule 26 receipt REQUIRED in the slice report: route file line + mounted JSX line),
inserts `<CrownHeader/>` as the first child above existing content. DO NOT restructure Home.

## F3 — rollout (3 files)
`adapters/style-lens-swan/v2/recipeResolution.ts` edit +15: catalog-id resolution added BEHIND
`isLensV2RolloutEnabled()` from NEW `adapters/style-lens-swan/v2/rolloutFlag.ts` (≤40: reads
`localStorage['swan-lens-v2-rollout']` override else default ON; kill switch = set `'off'` — a
runtime flag, NOT a VITE_ build-time var — documented in the file header). Zero-delta suites:
update the source-contract test that pins v1→null to pin the new flag-gated behavior instead
(this is the ONE sanctioned contract change of the program; enumerate it in the receipt).

## F4 — Style Studio (6 files)
`components/UserDashboard/StyleStudio/StyleStudio.tsx` ≤260 (sheet/drawer, rows, tier locks) ·
`StyleStudio.styles.ts` ≤200 · `overlaySchema.ts` in `core/style-lens-os/v2/` NEW ≤90 (§4 types +
`validateOverlay`) · `adapters/style-lens-swan/v2/overlayChoices.ts` NEW ≤80 (ACCENT_CHOICES,
FONT_PAIRINGS data) · backend route edit (+overlay validation + tier 403) · tests both sides.
Overlay application: edit `LensPlanFrame.tsx` +20 — overlay tokens applied AFTER plan tokens on
the same style attr (precedence law 01-§3). Tier source: the same user object the dashboard
already has (builder cites the field with file:line in the receipt; if no tier field exists,
STOP — checkpoint question, do not invent one).

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
`*_RECIPE` in labRecipes.ts appears in `V2_RECIPE_BY_CATALOG_ID` — closes the known gate-bypass
hook) · `CrownHeader.perf.test.tsx` NEW: source-contract — no canvas/video/webgl imports, no
`requestAnimationFrame` in CrownHeader/StyleStudio, atmosphere el `aria-hidden` ·
`styleLensBoundary.test.ts` edit: forbid factory imports (`world-factory|scripts/ai-workflow`) in
core AND adapters (the bridge is data-only — enforce it).
