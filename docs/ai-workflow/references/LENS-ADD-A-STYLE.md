# LENS ADD-A-STYLE — the 30-minute recipe (Smart Lens OS, Lab v6)

> Source of truth: A-PACK `docs/ai-workflow/brainstorms/lens-finish-pack-2026-07-14.md` §5 Phase A4.
> **New styles are v2-only from this pack forward.** The v1 chrome route is deprecated
> for new styles (appendix at the bottom explains how the original 25 were made).
> Target: style #N live in the Lab, gates green, **zero CSS, zero code — five data entries.**
> Proven: the `pipeline-proof` dry-run (2026-07-14) shipped chip #26 through this exact
> list in **5 minutes 47 seconds**, all 136 tests green, chip live on the v2 stage path.

## The FIVE entries (all data — no other file changes)

1. **StyleLensManifest** — NEW file `frontend/src/adapters/style-lens-swan/manifests/<camelName>.ts`:
   ```ts
   import { createSwanManifest } from '../manifestFactory';
   export const MY_STYLE_MANIFEST = createSwanManifest({
     id: 'my-style', name: 'My Style',
     description: '…', emotionalJob: '…', layoutSignature: '<unique-signature>',
     navigationRenderer: 'default-navigation', shellRenderer: 'default-shell',
     recipe: 'default-recipe', profileOffsets: [n, n, n],
   });
   ```
   **RENDERER RULE (do not extend the closed unions):** pick the
   `navigationRenderer`/`shellRenderer` pair so the registry's pairwise gate
   (each promoted pair differs on ≥ 2 of layoutSignature / navigationRenderer /
   shellRenderer — `swanStyleLensRegistry.test.ts`) stays green against EVERY
   existing style. The `default-navigation`/`default-shell` trio (used only by
   the runtime default manifest) is the recommended first pick for style #27.
   The gate suite is the arbiter — if red, change the two renderer picks, never the gate.
   NO SwanStyleLensGlobalStyles chrome block — the style renders through the v2 path.

2. **Registry append** — `frontend/src/adapters/style-lens-swan/index.ts`:
   import the manifest and append it to `SWAN_EXPANSION_MANIFESTS` (ADDITIVE-ONLY
   carve-out; never reorder existing entries).

3. **RecipeV2 literal** — append to `frontend/src/adapters/style-lens-swan/v2/labRecipes.ts`
   (ADDITIVE-ONLY carve-out): spread `SHARED`, id **must** follow `swan.<style-name>.v2`,
   tokens from the `world-*` vocabulary only (allowlist: no `url()`, no expressions,
   no `;`/`{}`), variants from the closed slot vocabularies in `LAB_HOST_MANIFEST`.
   Distinctness: the recipe must differ from EVERY existing map entry on ≥ 3 axes
   (typography / composition / surface / collection / action / chart) — the gate
   suite checks every pair automatically.

4. **Visuals entry** — append to `SWAN_STYLE_LENS_VISUALS` in
   `frontend/src/adapters/style-lens-swan/visuals.ts` (key order = enumeration order,
   so append at the END): include `moodFamily` (one of `playful | calm | technical |
   luxe | atmospheric`) — this places the chip in its Lab family group (new styles
   render at the END of their family row; the original 25's §4.2 order is test-locked).
   `textContrast` must match `contrast(foregroundFallback, backgroundFallback)` to
   1 decimal (the registry suite computes it).

5. **Catalog map entry** — `frontend/src/adapters/style-lens-swan/v2/catalogV2Map.ts`:
   ```ts
   'my-style': { recipe: MY_STYLE_RECIPE, dashboardChrome: false },
   ```
   `dashboardChrome: false` for all new styles (no v1 chrome block) — this drives the
   honest Apply receipt ("full restyle shows in the Lab; dashboard-wide wear arrives
   with the v2 rollout.") and the "Lab preview today — dashboard rollout pending."
   footer line automatically.

## Test-enumeration appends (part of the same 30 minutes)

- `swanStyleLensRegistry.test.ts`: append `['my-style', 'My Style']` to
  `expectedExpansion`. All counts are DERIVED from the enumerations — no count
  literals to touch.
- `WorkoutDesignLab.styleAxis.test.tsx`: nothing — counts are floors/derived
  (`WORKOUT_DESIGN_STYLE_COUNT`).

## Gates (run all — every one must be green)

```bash
cd frontend
npx vitest run src/adapters/style-lens-swan src/core/style-lens-os \
  src/components/DashBoard/Pages/workout-design-lab
npx tsc --noEmit   # NODE_OPTIONS=--max-old-space-size=8192
```
The ADD-A-STYLE suite (`labRecipes.test.ts`) automatically gates every map entry:
compile vs Lab host + all 6 surface manifests (only declared-optional degradations),
pairwise ≥ 3 axes (golden pair keeps ≥ 5), 44px+ / reducedMotionFallback required,
token allowlist, `swan.<name>.v2` id convention.

## Visual receipt

Render the Lab (route `/dashboard/admin/workout-design-lab`), select the new chip:
verify the `v2` mini-tag, the gold `v2 · full restyle` badge, the chrome-less footer
line, and the stage repaint. Screenshot at **414** and **1440**.

## Appendix — how the original 25 were made (v1 chrome route, DEPRECATED for new styles)

The original catalog styles were "manifest + visuals + 1 scoped CSS chrome block in
`SwanStyleLensGlobalStyles.ts`" — trim-only restyles of the dashboard chrome. That
route is retired for new work: it cannot restructure surfaces, and its honesty story
("applied across the dashboard") only holds because those blocks exist. New styles
get full-restyle v2 recipes and honest Lab-first labeling instead.
