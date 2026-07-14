# LENS PORTABILITY CONTRACT — taking the Smart Lens OS v2 engine to a new host

> Source of truth: A-PACK `docs/ai-workflow/brainstorms/lens-finish-pack-2026-07-14.md`
> §5 Phase A5 (ultra-prompt Track-2 P7 scope: docs + hardened boundary test ONLY —
> **no package extraction**; publishing is a Track-2 decision, forbidden here).

## The portable core (`frontend/src/core/style-lens-os/v2/`)

The v2 engine is host-agnostic by construction and test (see Boundary below).
Its export surface — everything a new host consumes:

| Export | File | Role |
|---|---|---|
| `RecipeV2`, `RECIPE_V2_SLOTS`, `CONTAINER_PROFILES`, `validateRecipeV2` | `recipeV2.ts` | Schema + fail-closed validation (token allowlist: no `url()`, no expressions, no `;`/`{}`; id regex `^[a-z][a-z0-9-]{1,64}(\.[a-z][a-z0-9-]{1,64})*$`) |
| `compileRecipe(recipe, manifest) → CompileResult` | `compileRecipe.ts` | FAIL-CLOSED compiler; emits `ResolvedLensPlan` (cssVariables, templates per profile, resolved variants, chartFamiliarity, degradations) |
| `whatChanged(a, b)`, `changedAxisCount`, `DIFF_AXES` | `whatChanged.ts` | Axis diff powering What-Changed receipts, Compare captions, and the distinctness gate |
| `HostCapabilityManifest` | `hostCapabilityManifest.ts` | What a host can wear: slots (required/optional + supportedVariants), templates + supportedProfiles |
| `SurfaceCapabilityManifest`, its runtime validation | `capability-manifest.schema.ts` | A `HostCapabilityManifest` specialization for production surfaces; forbids layout fields, raw colors, free-form versions |

Recipes are DATA. A style is never code. Unknown id → null recipe → host defaults
(zero visual delta). This is the product's future — treat the core/adapter boundary as law.

## Host-integration checklist (what a NEW host must do)

1. **Author a capability manifest** — declare only the slots/templates the host
   genuinely supports. Host-fixed zones (write paths, critical action semantics,
   data truth, dense data grids) are NEVER lens-addressable slots.
2. **Validate it at runtime** — run the manifest through the schema validation and
   fail closed (render host defaults) on any issue. In Swan this is the
   `SurfaceLensGate` pattern (`adapters/style-lens-swan/v2/SurfaceLensGate.tsx`)
   with its `makeLensFrame(manifest, ariaLabel, displayName)` one-line-per-surface factory.
3. **Bind ONE frame component** as the only recipe→DOM boundary — compile the
   recipe against the manifest, paint `plan.cssVariables` as inline custom
   properties + `data-lens2-*` representation attributes, keep the frame MOUNTED
   with a nullable recipe (lens switches must never remount the host surface),
   and render children UNSTYLED with a visible receipt on compile failure.
   Swan's reference implementation: `components/DashBoard/Pages/workout-design-lab/LensPlanFrame.tsx`.
4. **Consume tokens host-side** as `var(--token, hostFallback)` — the host's
   fallbacks are the no-lens look; tokens light up when a lens is worn.
5. **Mount a chart palette seam if the host charts** — SVG presentation attributes
   cannot take CSS `var()`; resolve to hex INSIDE the frame via getComputedStyle.
   Swan's seams: `components/Charts/lensChartPalette.tsx` (`LensChartPaletteProvider`
   + `useLensChartPalette`) and `buildSeamedVictoryProps`. The PRIMARY series may
   follow the lens accent; a SECONDARY series needs its own contrast-safe policy
   (Swan pins it to Wing Purple — never wire a button-background token to a chart).

## What the new host must supply (the engine does NOT provide)

- The manifest (its capability truth) and its host fallback design.
- The frame binding + representation styles (a `css`-helper block keyed off
  `data-lens2-*` attrs — Rule 43: any interpolated shared fragment uses `` css`` ``).
- The recipe→id resolution policy (which committed ids resolve to which recipes;
  fail-closed to null).
- Persistence of the committed appearance state (the engine stores nothing).

## Boundary (hardened in this phase)

`core/style-lens-os/styleLensBoundary.test.ts` walks EVERY core source file and
forbids imports from `components/`, `routes/`, and — added by A5, this was the gap —
**`adapters/`**, plus Swan-brand strings, MUI/Recharts, and dynamic-execution paths.
The core stays extractable: nothing Swan-specific may enter it.
