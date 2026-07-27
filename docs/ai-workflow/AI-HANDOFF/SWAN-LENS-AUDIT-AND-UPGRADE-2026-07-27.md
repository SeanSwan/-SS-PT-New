# Swan Lens — Audit + Upgrade Plan (2026-07-27)

> **SWA-69.** Three-lens hostile audit (engine health · vision-vs-reality gap · consumer/de-gate integration),
> synthesized by Fable. Anchor `origin/main@4f3aa7343`. This is the audit + a sequenced upgrade plan + the ONE
> decision the whole upgrade hinges on. **No large refactor lands before Sean picks the fork in §5.**

---

## 1. What the "Swan Lens" actually is — THREE systems under one name, none reconciled
The single largest finding: "Swan Lens" refers to three overlapping things, and **no document maps them to each
other**. Every downstream problem flows from this.

| # | System | Where | What it is | Reality |
|---|--------|-------|-----------|---------|
| A | **World Engine** (cinematic) | `docs/ai-workflow/design-brain/worlds.md` | 18 immutable "World DNA" recipes, 5 families, Law A/B palette, B0–B3 render ladder, WFX/PSY contracts | **DOC-ONLY.** Drives ZERO runtime selection. Named as inspiration strings only (`v2/atmosphereCatalog.ts:36`). |
| B | **Domain model** | `design-brain/design.md §5` | 3 "worlds" (`mkt`/`pro`/`ops`) + 2 lenses (`density`,`motion`) | **DOC-ONLY & contradicts A and C.** Nothing else names mkt/pro/ops. |
| C | **Style Lens OS** (engine) | `frontend/src/adapters/style-lens-swan/**` + `core/style-lens-os/**` | **27 lenses + ~42 colorways + motion/density modes**, a v1-chrome layer (live) and a v2-world-recipe layer (built, dormant) | **REAL CODE** — but almost entirely absent from the callable Design Brain docs. |

**A builder reading the Design Brain would never learn the engine (27 lenses, 42 colorways, the manifest schema,
the registry, how a surface adopts a lens, 16 live LensFrame surfaces) exists.** The richest doc (18 worlds ×
~10 contract fields) drives nothing; the richest code (the v2 engine) is undocumented.

## 2. The killer findings (all file:line-verified by the audits)

1. **The v2 world engine is stranded behind a ONE-LINE id mismatch.** `v2/recipeResolution.ts:12-15` keys
   `V2_RECIPES_BY_STYLE_LENS_ID` by RECIPE id (`swan.candy-glass-arcade.v2`) but is fed the v1 `styleLensId`
   (`candy-glass-arcade`). They never match → **always resolves `null`** → every `SurfaceLensGate` paints the
   Crystalline default. `catalogV2Map.ts:13` already has the correct `id → recipe` map. Fixing this one line makes
   ~15 already-mounted gates restyle. **Highest capability unlock in the whole system.**
2. **28 lenses → 1 actual color-world.** All 27 lenses map to the *identical* `CRYSTALLINE_DEFAULT_WORLD_VALUES`
   (`contract/values/index.ts:20-28`); the header says per-lens differentiation is "Slice-3 design work" =
   **unbuilt**. Only **2 of 27** lenses have a v2 recipe (`candy-glass-arcade`, `prism-terminal`). So even after
   fix #1, committing "Tidal Columns" shifts ~4 dashboard chrome vars (sidebar/padding/radius) but **the world
   stays Crystalline — the lens name promises a world it doesn't deliver.**
3. **Two parallel theme systems, reconciled in ONE component ("lying-gate" bug class).** The appearance runtime
   sets structure (`data-style-lens/-density/-motion`) but applies **no palette** (`appearanceRuntime.ts:48-62`);
   the palette comes from a *separate* `UniversalThemeContext` (`swanstudios-theme` localStorage). They're only
   reconciled inside `UniversalThemeToggle.handleApply` (`:173-189`, dual-write). **Any commit path that forgets
   the second write silently changes no palette.** This is the biggest latent bug source.
4. **All 7 vNext marketing surfaces are PARKED** — reachable only via the admin Design Studio iframe. The
   beautiful `*.tokens.ts` bridges exist but **their only consumers are surfaces users can't reach.** Promoting
   one today would ship a "world" identical to the current site (crystalline-only).
5. **Dead code shipped to main.** `gateTelemetry.emitGateEvent` has **0 callers** and observes the 7 gates that
   de-gate *deleted* — it can never be wired. `lensViewportCss` + `lensSurfaceCss`/`LensSurfaceGlobalStyles` are
   exported + tested but **never mounted** ("deferred to the wiring slice" that never landed).
6. **`--world-*` means three different things** across `design.md` (mkt/pro/ops set), `worlds.md` (Law-B native
   palettes), and the engine (`v2/worldDefaults.ts:27-34`). The "consumer reads `--world-*`, re-skins for free"
   contract is only as safe as this vocabulary — and it isn't unified.
7. **The stated aesthetic ceiling doesn't exist.** CLAUDE.md rule 40 + `swan-design-router/SKILL.md:293` cite
   "§C13 Scroll-Bound Macro Journey" and "§B2.4"; grep of `SWAN-CINEMATIC-DESIGN-SYSTEM.md` returns **0** matches
   (only C1–C12 exist). The single highest tier of the vision is a dangling reference. Same for "Two worlds
   beneath one glass" / Living Atmosphere (planned, not built — static-only in product today).
8. **Doctrine drift.** The engine still speaks flag-gate vocabulary (`worldDefaults.ts:4-10`: "vNext surface
   gate," "flag-ON mount") that the 2026-07-21 de-gate (`FLAG-LIFECYCLE-DOCTRINE.md`) now bans. `THEME-CHANGER-
   COMPAT.md:34` names a different default palette (`#030712`/`#22D3EE`) than the Crystalline canon
   (`#0A0A0F`/`#60C0F0`). Three unmapped motion vocabularies (SNAP/DRIFT ↔ Full/Lean/Still ↔ `motionMode`).
9. **`aurora-console` is silently dropped** from the Lab row order (`workoutDesignStyleCatalog.ts`) — 25 placed
   vs 26 catalog; the shipped console skin likely never renders in the Style Explorer.

## 3. What is GOOD (do not throw this away)
The engine's **bones are excellent** and are the right long-term target: a brand-neutral core (`core/style-lens-os`,
"no product/route/brand deps") under a Swan adapter; a **deterministic recipe compiler** (`compileRecipe.ts` — no
clocks/randomness); **fail-closed validation** (`recipeV2.ts:101`, `designValueGuard.ts` — WCAG contrast, retired-
palette bans, injection bans); a single recipe→DOM boundary (`LensPlanFrame`); **zero-PII telemetry** (destructure-
never-spread); **strong a11y** (reduced-motion + forced-colors + 44px floors enforced in code); every engine file
<250 lines; 24 test files. The problem is NOT the design — it's **capability stranded behind a 1-line mismatch +
a batch of "deferred to the wiring slice" pieces that shipped un-wired + three taxonomies nobody reconciled.**

## 4. Taxonomy reality (the missing "what is what" map)
- **Colorway (~42, 4 families)** — the PALETTE. What a real user changes today (via the second theme system).
  `ThemeContext/AppearanceStudio/colorwayFamilies.ts`. **LIVE.**
- **Lens (27 + default)** — STRUCTURE/CHROME. Sets ~4 shell vars (sidebar/padding/radius/nav-edge) via
  `data-style-lens`. **LIVE but tiny** — reaches the dashboard shell + WorkoutLogger frame only.
- **World (`--world-*` recipe)** — the FULL restyle (bg/panel/accent/atmosphere). **Built, 2/27 wired, 0 reach a
  normal user** (resolver returns null).
- **Mode (motion/density)** — `auto|reduced|off` × `comfortable|compact`. **LIVE.**
- **Appearance Profile** — the per-user server-synced record (`user_appearance_profiles`, LWW). **LIVE.**

## 5. ⚑ THE FORK — the one decision that shapes the entire upgrade
The 28 lenses advertise "worlds" they don't deliver. Two honest ways forward — **Sean picks:**

- **Path HONEST (smaller, ~1–2 weeks):** accept that a "lens" is a *chrome + colorway* variant, not a full world.
  Fix the resolver (#1) so the 2 real worlds shine, rename/regroup the other 25 so they advertise only what they
  change, unify the taxonomy doc, collapse the two theme systems, delete the dead code. The engine becomes
  *truthful and coherent* — no lens promises a world it can't paint. Worlds stay a marketing/cinematic concept.
- **Path WORLDS (bigger, multi-week program):** commit to 27 real differentiated worlds. Fix the resolver, then
  author the missing 25 `RecipeV2`s (or generate them from one `id→tokens` table), build per-lens `--world-*`
  value tables ("Slice-3"), and bridge the 18 documented Worlds (`worlds.md`) into selectable Law-A recipes so
  "Glacier Cathedral" becomes a runtime choice. The Swan Lens becomes the callable, brand-agnostic world engine
  the docs promise. Highest ceiling; highest cost.

**Fable's recommendation: HONEST first, then WORLDS as a funded program.** Ship truth + coherence in ~2 weeks
(it also fixes the latent palette bug and deletes dead code), *then* decide whether the full 27-world program earns
its cost — with a clean, unified foundation to build it on. Both paths share the same Phase 1.

## 6. Sequenced plan (Phase 1 is shared; safe/reversible; honors de-gate — NO re-introduced page gates)
**Phase 1 — Truth & Coherence (safe, mostly docs + surgical code; both paths need it)**
1. **Unified taxonomy doc `SWAN-LENS-OS.md`** — one canon defining World/Lens/Colorway/Mode/Profile, the mapping
   table, and LIVE-vs-DORMANT-vs-DOC-ONLY status. Kills the "builder must reverse-engineer which world a sentence
   means" tax. *(docs, zero risk)*
2. **Fix `--world-*` collision** — pick ONE meaning; rename the doc-side domain set to `--surface-*` so the
   consumer contract has exactly one vocabulary. *(codemod + palette matrix test)*
3. **Delete dead code** — `gateTelemetry.ts` (0 callers, observes deleted gates) + unmounted `lensViewportCss`/
   `lensSurfaceCss` exports, OR mount them if wanted. *(flag for Sean per Rule 34; then execute)*
4. **Doctrine reconciliation** — retire flag-gate vocabulary in `worldDefaults.ts`/`SurfaceLensGate` comments;
   fix `THEME-CHANGER-COMPAT.md` default palette to Crystalline canon; map the three motion vocabularies.
5. **Fix `aurora-console` Lab row-order drop** + add the missing `recipeResolution` regression test (would have
   caught #1). *(small)*
6. **Collapse the two theme systems** — make `paletteThemeId` the palette source of truth; `UniversalThemeContext`
   becomes a thin adapter. Removes the dual-write "lying-gate." *(HIGHER RISK — affects every user's palette;
   gets its own hostile-review dry-loop + triangle before it lands.)*

**Phase 2 — HONEST or WORLDS (Sean's fork)**
- *HONEST:* fix the resolver (#1); rename/regroup the 25 non-world lenses; ship the 2 real worlds live.
- *WORLDS:* fix the resolver; author/generate 27 recipes + per-lens `--world-*` tables; bridge the 18 doc-Worlds.

**Phase 3 — Ambition (either path, funded separately)**
- Write §C13 + §B2.4 into `SWAN-CINEMATIC-DESIGN-SYSTEM.md` (fill the dangling reference) and build ONE reference
  Scroll-Bound Macro Journey (home hero — keep `Swans.mp4`, drive the playhead by scroll).
- "Living Atmosphere v1" — Kimi's optics-only animated primitives with luminance/velocity/seed caps (marketing
  only; static-in-product firewall already exists).
- Add-a-Lens / Add-a-World authoring guide + a `node scripts/lens-add-style.mjs` generator (turns the 7–9-file
  frozen-core chore into one command); per-lens a11y/perf budget ledger, CI-checked.

## 7. Guardrails
Additive/reversible; de-gate doctrine honored (no page gates return); Crystalline palette + token discipline (the
`lint:swan-lens` firewall); per-change hostile-review dry-loop; the theme-system collapse (#6) gets a triangle
review before it lands. Every refactor keeps the engine's excellent bones (deterministic compiler, fail-closed
validation, a11y floors) — this is a *reconciliation + unlock*, not a rewrite.
