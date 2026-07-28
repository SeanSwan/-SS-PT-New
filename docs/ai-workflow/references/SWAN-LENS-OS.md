# SWAN LENS OS — the unified taxonomy canon

- **Date:** 2026-07-27 · **Author:** Fable · **Status:** CANONICAL for Swan Lens taxonomy (SWA-69, Phase 1)
- **Why this exists:** three systems shipped under the name "Swan Lens" and no doc reconciled them, so every
  builder had to reverse-engineer which "world" a sentence meant. This is the single map. **`design.md §5` and
  `design-brain/worlds.md` defer to this file for what a World/Lens/Colorway/Mode/Profile each *are* and which are
  real.** Authority for AESTHETICS remains `SWAN-CINEMATIC-DESIGN-SYSTEM.md` > `design.md`; this file governs the
  TAXONOMY + the engine map, not the palette.
- **Direction (Sean, 2026-07-27):** **HONEST first, then WORLDS.** This doc describes the HONEST model as current
  canon and names WORLDS as the documented future program.

---

## 1. The five nouns (say these words, not "world")
| Noun | What it controls | Where it lives | Status today |
|---|---|---|---|
| **Colorway** | the PALETTE (bg/ink/accent hues) — ~42 in 4 families | `ThemeContext/AppearanceStudio/colorwayFamilies.ts` | **LIVE** — what a user actually changes |
| **Lens** | STRUCTURE / CHROME — ~4 shell vars (sidebar width, main padding, panel radius, nav edge) + optional canvas | `adapters/style-lens-swan/manifests/*` + `styles/lenses/*` (27) + `default-safety` | **LIVE but small** — reaches the dashboard shell + WorkoutLogger frame |
| **World** | the FULL restyle — `--world-*` (bg/panel/accent/atmosphere) via a `RecipeV2` through `LensPlanFrame` | `adapters/style-lens-swan/v2/*` (compiler, recipes, gate) | **BUILT, 2 of 27 authored, 0 reach a default user** (see §3) |
| **Mode** | MOTION (`auto\|reduced\|off`) × DENSITY (`comfortable\|compact`) | `core/style-lens-os` + `appearanceRuntime` | **LIVE** |
| **Profile** | the per-user server-synced record binding the above | `user_appearance_profiles` (JSONB, LWW) + `AppearanceSyncBridge` | **LIVE** |

**Rule of speech:** a *Lens* is chrome + a *Colorway* is palette + a *World* is the full atmosphere. "World" is NOT
a synonym for "lens." Under the HONEST model a Lens advertises only the chrome (and its paired colorway) it
actually changes — it never promises a World it cannot paint.

## 2. The two token namespaces (the `--world-*` collision, resolved)
- **`--lens-*`** — v1 chrome tokens (`--lens-sidebar-width`, `--lens-main-padding`, `--lens-panel-radius`,
  `--lens-navigation-edge`, `--lens-canvas`, `--lens-elev-*`, `--lens-z-*`). Set per-lens on
  `[data-style-lens='X']`; consumed on `[data-style-lens-shell]`. **This is the LIVE surface today.**
- **`--world-*`** — the v2 full-restyle tokens (`--world-bg`, `--world-panel`, `--world-text`, `--world-muted`,
  `--world-accent`, `--world-action`, `--world-title-font`). Emitted by `LensPlanFrame` from a compiled recipe.
- **`--lens2-*`** — compiler-internal ONLY; never reaches the DOM (stripped to `--world-*` in `LensPlanFrame`).

**Collision to fix (Phase 1):** `design.md §5` names a THIRD `--world-*` set (mkt/pro/ops: `--world-surface`,
`--world-edge`, `--world-wash`) and `worlds.md` names Law-B native palettes (`--world-cavern`, `--world-plasma`…).
Three meanings, one prefix. **Canonical decision:** `--world-*` belongs to the engine's v2 restyle set (the list
above). The `design.md` domain set is renamed **`--surface-*`**; the `worlds.md` Law-B sets are explicitly
world-local native palettes (Law B only, never Swan-brand chrome). A design surface is a pure CONSUMER of
`--world-*` through ONE `*.tokens.ts` bridge and never emits or modifies them.

## 3. The runtime truth (what actually paints, and the 1-line bug)
- **v1 chrome (LIVE):** committing a lens writes `data-style-lens` on `<html>`; `ActiveLensGlobalStyles` injects
  that lens's `--lens-*` block. Real consumers: the dashboard shell (`UniversalDashboardLayout.styles.ts`), the
  WorkoutLogger `SurfaceLensGate` frame, Coach Command Center, PrismCapture radius. **~4 vars change.**
- **v2 worlds (BUILT, DELIBERATELY GATED — corrected 2026-07-27):** `SurfaceLensGate` →
  `resolveRecipeForStyleLens(styleLensId)` → `LensPlanFrame` → `--world-*`. In PRODUCTION this resolves `null`
  **on purpose** — `v2/recipeResolution.ts` keys `V2_RECIPES_BY_STYLE_LENS_ID` by RECIPE id and is fed the v1
  `styleLensId`, a **dark-until-rollout gate** the docstring states outright ("resolves to null … until the
  catalog exposes v2 styles. Fail-closed by construction"), CONTRACT-TESTED by `WorkoutDesignLab.styleAxis.test
  .tsx:427` ("A3: production resolveRecipeForStyleLens stays untouched and inert (source contract)") +
  `surfaceManifests.test.ts:59-63`. This is **NOT a bug** — the audit's "1-line fix" was a mischaracterization.
  The worlds DO render in the **Lab** (via `catalogV2Map` + the Compare panel). **Flipping the gate is a
  Sean-gated ROLLOUT decision, not a code fix** — and under HONEST, keeping it gated is arguably correct because
  flipping it ships the 2-worlds-work / 25-lenses-don't inconsistency HONEST exists to avoid. Do NOT re-key the
  resolver without a rollout decision + updating A3.
- **Palette (LIVE, but SPLIT):** the appearance runtime sets structure but applies NO palette; the Colorway is
  applied by a *separate* system (`UniversalThemeContext`, `swanstudios-theme`), reconciled only inside
  `UniversalThemeToggle.handleApply`. **Phase-1 collapses these** so `Profile.paletteThemeId` is the single palette
  source of truth (removes the "commit-changed-no-palette" latent bug). *(higher-risk; triangle-reviewed.)*

## 4. Doc-only systems (real vision, not yet runtime — do not cite as if built)
- **The 18-World cinematic catalog** (`design-brain/worlds.md`) — Glacier Cathedral, Nebula Drift, … 5 families,
  Law A/B, B0–B3 ladder, WFX/PSY contracts. **DOC-ONLY.** Drives zero runtime selection; used only as Seedance
  inspiration + the atmosphere-catalog provenance strings. The **WORLDS program** (future) bridges these into
  selectable Law-A recipes.
- **§C13 "Scroll-Bound Macro Journey" / §B2.4** — cited by CLAUDE.md rule 40 + `swan-design-router` but **absent**
  from `SWAN-CINEMATIC-DESIGN-SYSTEM.md` (grep = 0). A dangling reference; the aesthetic ceiling is unwritten.
  Phase 3 writes it and builds one reference journey.
- **"Two worlds beneath one glass" / Living Atmosphere** — animated per-world environment; ratified in a Kimi
  review but **static-only in product** today. Phase 3 ships the optics-only capped-primitive v1.

## 5. Add-a-thing pipelines (the authoring reality)
- **Add a Lens (visible on the live dashboard):** ~7–9 files incl. a frozen-core union edit + a "Do not edit"
  fixture negotiation — hand-copied, no scaffold. The "easy 5-file" v2 route produces a **Lab-only** style
  (`dashboardChrome:false`) that no user sees. A dev-init integrity gate throws if the parallel registries drift.
- **Add a World (per-lens `--world-*`):** NO pipeline exists today ("Slice-3" unbuilt). The WORLDS program builds
  it (author or generate `RecipeV2` + per-lens value tables).
- **Phase 3** adds `scripts/lens-add-style.mjs` (one command) + an Add-a-World recipe + a per-lens a11y/perf budget
  ledger (CI-checked). Until then, adding a lens is lane-owner work.

## 6. What is GOOD (the bones — preserve, never rewrite)
Brand-neutral core under a Swan adapter; a **deterministic recipe compiler** (no clocks/randomness); **fail-closed
validation** (WCAG contrast, retired-palette + injection bans); a single recipe→DOM boundary (`LensPlanFrame`);
**zero-PII telemetry**; **a11y floors** (reduced-motion + forced-colors + 44px, enforced in code); every engine
file <250 lines; 24 test files. The upgrade is a **reconcile + unlock**, not a rewrite.

## 7. Cross-references
Audit + sequenced plan: `AI-HANDOFF/SWAN-LENS-AUDIT-AND-UPGRADE-2026-07-27.md` (SWA-69). Aesthetics source of
truth: `SWAN-CINEMATIC-DESIGN-SYSTEM.md` > `design-brain/design.md`. World catalog (doc-only): `design-brain/
worlds.md`. De-gate doctrine (no page gates): `FLAG-LIFECYCLE-DOCTRINE.md`.