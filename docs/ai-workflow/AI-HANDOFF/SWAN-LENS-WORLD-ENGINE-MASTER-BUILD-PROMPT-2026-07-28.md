# SWAN LENS — WORLD ENGINE · Master Build Prompt

- **Date:** 2026-07-28 · **Program:** SWA-69 (Swan Lens) · **Branch:** `claude/build-swan-lens`
- **Lead orchestrator:** running model (Opus-tier). **Context advisors (this doc synthesizes, does not defer to):**
  Kimi K3 (creative/roster/agents — `.ai-workflow/fusion/kimi-25worlds.md`), Fable 5 (architecture/decider —
  `.ai-workflow/fusion/fable-25worlds.md`). Both consulted 2026-07-28; their rulings are folded in and superseded
  where the orchestrator overruled (see §0).
- **Status:** APPROVED DIRECTION — worker-bot executes slice-by-slice (§6), hostile-review to Dry-Loop CLEAN×2 per
  slice, batch-push at Sean's gate. **This is the "use this prompt" artifact** for the 25-world build.
- **Reads first:** `references/SWAN-LENS-OS.md` (taxonomy canon), `design-brain/worlds.md` (18-World DNA source),
  `references/FLAG-LIFECYCLE-DOCTRINE.md` (design never gates), `AI-HANDOFF/SWAN-LENS-AUDIT-AND-UPGRADE-2026-07-27.md`.

---

## 0. THE DECISION + the one orchestrator override

**Sean's decision (2026-07-28):** build ALL 25 worlds now — refactor the 2 real ones (`candy-glass-arcade`,
`prism-terminal`) into a unified 25, build 23 more, each a real differentiated `--world-*` `RecipeV2` (not
chrome-only). Complete refactor, dramatically better than the Opus-4.8 era. Once all 25 are real, the deliberate
dark-until-rollout resolver gate flips ON with no 2-vs-25 inconsistency. Add a new dimension: **agents interacting
with the world system.**

**Orchestrator override (my call, correcting both advisors):** Kimi and Fable each invented ~25 NEW world names
(Aurora Veil, obsidian-forge, …). **Rejected.** The 25 worlds are the **25 lens ids that already exist** in
`workoutDesignStyleCatalog.ts` — real, family-organized, count-asserted by
`WorkoutDesignLab.contract.test.ts`, already rendered as Lab rows. Inventing new names would break the catalog,
the tests, and the Lab, and strand the existing chrome. **We PROMOTE the 25 real ids from chrome-only → full
world recipes**, and use Kimi's + Fable's vivid optical DNA as the *creative source* mapped onto each real id.
This is the reconcile-not-rewrite discipline (SWAN-LENS-OS.md §6). Result: zero catalog churn, maximum vividness.

**The unifying creative spine (orchestrator):** *One dark vault. 25 ways light behaves.* Every world is the same
Crystalline Swan substrate (Law A — chrome stays Swan, world = setting) but a different **optical physics**:
refraction, dispersion, caustics, facets, frost, depth-light, lensing, bloom. Each world owns ONE impossible
optical phenomenon; if two worlds could be confused at thumbnail scale, the later one is redesigned (machine-checked,
§3.3). Optics, never creatures (anti-cheese). This is the "no 25 greys" guarantee.

---

## 1. THE CANONICAL 25-WORLD ROSTER

Real id (from `WORKOUT_DESIGN_STYLE_ROW_ORDER`) → family → optical DNA → the ONE impossible phenomenon → Law-A
palette ratio `Base/Atmosphere/Signal` (setting layer only; chrome = Crystalline tokens) → signature motion beat →
best coaching-surface fit → build rank. DNA synthesized from Kimi + Fable + `worlds.md`, re-anchored to real ids.

### playful (7) — warmth, delight, momentum
| Real id | Optical DNA | Impossible phenomenon | B/A/S | Motion beat | Surface fit |
|---|---|---|---|---|---|
| **candy-glass-arcade** ✅exists | 2am boardwalk cast in pulled sugar-glass | neon refracts *through* solid glass, arrives before it's emitted | 55/30/15 | marquee chase-light ripples, shatters to bokeh | storefront, gamified dashboard |
| **kinetic-kanban** | light-tiles that slide and click like magnetic glass | tiles cast shadows *in the direction they'll move next* | 60/28/12 | card settle with a light-snap on drop | workout builder, task/plan boards |
| **signal-garden** | a greenhouse where data grows as luminous flora (glow, not fauna) | plants lit *cooler* than the dark around them | 58/30/12 | growth-bloom on new data, 44px from chrome | habit streaks, daily check-in |
| **tempo-forge** | a forge where reps are struck from molten light | cold sparks that freeze mid-air into glass filings | 60/28/12 | ember-strike pulse on set logged | strength/HIIT blocks |
| **orbit-atlas** | signals orbit a workout core like moons | lensed starlight blooming into orbit rings | 65/25/10 | satellite precession on scroll | analytics, Coach "why it changed" |
| **modular-harbor** | a night harbor of glass containers stacked in light | reflections that lag their source by half a second | 62/28/10 | crane-glide dolly; puddle reflections lead | admin/org, multi-client |
| **kintsugi-circuit** | broken glass rejoined with veins of gold light | fractures that *heal forward* — gold flows into cracks not yet formed | 60/30/10 | gold-vein trace on milestone repair | achievements, comebacks |

### calm (4) — recovery, focus, quiet
| Real id | Optical DNA | Impossible phenomenon | B/A/S | Motion beat | Surface fit |
|---|---|---|---|---|---|
| **quiet-meridian** | dawn's first minute on a frozen plain | a shadow that retreats *toward* the light | 68/24/8 | terminator sweep, alpenglow holds | morning open, daily home |
| **recovery-cloister** | a cathedral 40m underwater, surface-light only | caustic nets projected onto *air* | 68/24/8 | slow caustic web + 20s god-ray sweep | recovery/wellness dashboard |
| **monastic-grid** | the dark vault itself; nothing exists until light touches it | a spotlight with no source; objects lit from inside | 85/10/5 | follow-spot tracks scroll position | Coach 1:1 focus, reading |
| **lunar-stack** | moonlight through greenhouse glass, frost + condensation | condensation that blooms *warm* on cold glass | 70/22/8 | condensation bloom on section reveal | meditation/cooldown, sleep |

### technical (6) — precision, telemetry, control
| Real id | Optical DNA | Impossible phenomenon | B/A/S | Motion beat | Surface fit |
|---|---|---|---|---|---|
| **prism-terminal** ✅exists | deep-space relay; data arrives as dispersed spectra | white light splits to rainbow *before* the prism | 65/25/10 | beam enters, fans to 7 bands = data streams | Coach console, analytics |
| **blueprint-fold** | drafting light folding a 3D schematic from a flat plan | folds that cast the shadow of the *finished* object | 65/27/8 | origami unfold on plan expand | program builder, plan detail |
| **analog-flight-recorder** | an instrument vault of glowing gauges in black glass | needles that read the value *one tick in the future* | 70/22/8 | gauge-sweep + jewel flare on data update | readiness, preflight rails |
| **chronograph-board** | a watchmaker's bench; gears cut from solid light | escapements tick *between frames* — seen only as blur | 60/29/11 | balance-wheel at 4Hz*, bearing flare per tick | timers, interval training |
| **terrain-console** | a topographic light-table; contours rise from dark | elevation lines that cast height as *colored shadow* | 62/28/10 | contour ripple on load; ridge-light sweep | data-viz dashboards, maps |
| **coach-ledger** | a provenance vault; evidence lit by confidence | ink that glows brighter the more *verified* it is | 66/26/8 | confidence-glow rise on coach-confirm | evidence/ledger, history |

### luxe (4) — premium, editorial, ceremony
| Real id | Optical DNA | Impossible phenomenon | B/A/S | Motion beat | Surface fit |
|---|---|---|---|---|---|
| **crystalline-cathedral** | a gothic nave whose stained glass is grown crystal | rose-window caustics projected onto *air*, not floor | 62/28/10 | rose-window rotation 1°/min; incense-pulse traces | flagship marketing hero, launch |
| **carbon-atelier** | a couturier's dark studio; light on woven carbon | threads of light casting *colored shadows* | 55/33/12 | shuttle-pass of gold; weave tightens on scroll | premium tiers, pricing |
| **meridian-magazine** | an anamorphic film archive of personal records | lens flares that cast *shadows* | 58/32/10 | anamorphic streak on load; grain breathes 24fps | PRs, share cards, celebrations |
| **glass-rail** | a mirrored luxury corridor; machines reflect you | reflections that show the room *1s in the future* | 70/22/8 | corridor glide; reflections lead motion by 1s | settings, account, concierge |

### atmospheric (4) — sublime, weather, awe
| Real id | Optical DNA | Impossible phenomenon | B/A/S | Motion beat | Surface fit |
|---|---|---|---|---|---|
| **aurora-index** | polar night; sky is a slow curtain of ionized silk | light that falls *upward* from the horizon | 70/22/8 | curtain-fold sweep ~12s, frost glitter trail | athlete dashboard (DEFAULT world) |
| **tidal-columns** | a storm where every raindrop is a lens | each drop projects a tiny inverted image of the sky | 64/27/9 | rain sheet; a thousand micro-skies flicker & clear | endurance/cardio |
| **split-horizon** | a mountain ridge at the minute the sun clears it | a garden of lensed starlight blooming at the rim | 61/29/10 | ridge terminator 6s push; alpenglow peak-hold | onboarding first-run wonder |
| **cedar-workshop** | an abandoned theater; the actor is dust in a beam | dust motes that *orbit* the beam like planets | 76/17/7 | volumetric cone sway; Keplerian mote orbits | story/manifesto, about |

**Build ranks (first wave = ranks 1–6, covers all 5 families + both auto-theme anchors):**
1 candy-glass-arcade (exists→refactor) · 2 prism-terminal (exists→refactor) · 3 aurora-index (default athlete world +
atmospheric anchor) · 4 crystalline-cathedral (luxe flagship / marketing hero) · 5 coach-ledger (technical /
evidence — best data-story fit) · 6 quiet-meridian (calm / morning auto-theme anchor). Then one wave per family
(§6 slices 9–13). *`chronograph-board` 4Hz is near a vestibular sensitivity band — see gap G11; ledger caps it.*

**Surface-coverage check:** every core surface has ≥1 assigned world — athlete dash (aurora-index), coach console
(prism-terminal), recovery (recovery-cloister), storefront (candy-glass-arcade), marketing hero
(crystalline-cathedral), analytics/evidence (coach-ledger), builder (blueprint-fold), onboarding (split-horizon),
morning (quiet-meridian), cooldown (lunar-stack), achievements (kintsugi-circuit). No orphan surfaces.

---

## 2. THE RecipeV2 CONTRACT (real shape — do not invent)

Each world is one hand-authored `RecipeV2` module. Real shape (from `v2/labRecipes.ts`, verified):
```ts
export const <ID>_RECIPE: RecipeV2 = {
  ...SHARED,                          // shared base (a11y floors, defaults)
  id: 'swan.<real-id>.v2',
  tokens: {                           // emitted as --world-* by LensPlanFrame (the ONLY recipe→DOM boundary)
    'world-title-font': "...",
    'world-accent':  'var(--<swan-token>, #fallback)',   // Law A: Swan tokens, token-with-fallback (rule 6)
    'world-action':  'var(--<swan-token>, #fallback)',
    'world-panel':   'color-mix(in srgb, #<hex> NN%, transparent)',
    'world-panel-radius': '...', 'world-row-radius': '...', 'world-row-columns': '...', /* etc */
  },
  composition: { 'desktop-enhanced': {template}, 'tablet': {template}, 'mobile-minimal': {template} },
  components: {                       // variant selectors on the 6 component slots
    'text.display': {variant}, 'text.body': {variant}, 'surface.card': {variant},
    'collection.exercise': {variant}, 'action.primary': {variant},
    'chart.progress': {variant, familiarity},
  },
};
```
**Law A palette discipline (non-negotiable, rule 6/40):** chrome (buttons, nav, focus rings, Dual-Button Glow)
NEVER themed — always Crystalline Swan tokens (`--midnight-sapphire`, `--ice-wing`, `--wing-purple`,
`--gilded-fern`, `--frost-white`, `--obsidian-black`). The world paints only the *setting* (`--world-bg/panel/
accent/atmosphere`). Every color is `var(--token, #fallback)`. **Retired Galaxy-Swan hex is banned** as a positive
value (`#0a0a1a`, `#00FFFF`, `#7851A9`) — `designValueGuard` rejects them. **Per-world a11y:** WCAG 4.5:1 at the
BRIGHTEST animation frame (mathematically computed from tokens, not eyeballed), 44px targets, reduced-motion static
story, forced-colors support. **Per-world perf:** LCP ≤2.5s (poster-first — B0 semantic DOM owns meaning, canvas is
`aria-hidden` enhancement), INP ≤200ms, CLS ≤0.1, per-world lazy chunk ≤ ledger cap. **Static-atmosphere firewall:**
product surfaces host NO live M4 spectacle — static or pause-on-mount only; full motion is marketing/hero only.

---

## 3. COMPLETE REFACTOR ARCHITECTURE

### 3.1 Data model — DECISION: one registry + generator, hand-authored recipe VALUES
Structure = registry + generator; content = hand-authored (NOT parametric — a formula produces "25 greys",
destroys hostile-reviewability, makes `designValueGuard` vestigial).
```
adapters/style-lens-swan/worlds/
  registry.ts              // Record<WorldId, WorldRecipe>, frozen; WorldId = closed union → missing world = COMPILE ERROR
  recipes/<real-id>.ts     // one hand-authored RecipeV2 per world (one world per PR diff = reviewable)
design-brain/ledger/worlds.ledger.json    // per-world a11y/perf budget entry (§3.3)
scripts/lens-add-world.mjs                 // scaffolds recipe + ledger + preview route + Seedance stub + registry line
```
`labRecipes.ts` dissolves into `worlds/recipes/` in Slice 1; the 2 existing recipes are the migration proof
(compiled-plan hash must match byte-for-byte → zero visual change). Keep the deterministic compiler (no clocks/
randomness — motion beats are declared keyframe timelines) and the fail-closed guard.

### 3.2 Collapse the two theme systems — SAFE ORDER, rollback at every step
End-state: ONE pipeline, `paletteThemeId` = single source of truth; `UniversalThemeContext` deleted; the
"lying-gate" gone.
- **Step 0 — characterization oracle (test-only):** snapshot computed `--*` custom properties per (surface ×
  ~42 colorways × world) on key routes. The oracle for every later step.
- **Step 1 — derivation shim behind flag `themeUnify`:** pure `deriveStructureTheme(paletteThemeId)→StructureTheme`;
  old path still exists, flag selects; CI runs the oracle in BOTH states and diffs. *Rollback: flip flag off.*
- **Step 2 — consumer codemod:** migrate all `UniversalThemeContext` readers to `useWorldTheme()`; old context =
  deprecated re-export that logs prod reads + throws in dev when `themeUnify` on. *Rollback: codemod inverse (checked in).*
- **Step 3 — kill the lying-gate:** delete the reconciler component; single resolver path. One-component PR,
  `git revert`-able in minutes; `user_appearance_profiles` untouched (already keys on `paletteThemeId`).
- **Step 4 — delete `UniversalThemeContext`:** gated on two releases at `themeUnify` 100% AND zero deprecated reads.

### 3.3 Per-world a11y/perf budget LEDGER (`design-brain/ledger/worlds.ledger.json`)
One entry per WorldId: `{ worldId, family, phenomenon, contrastMinAtBrightestFrame(≥4.5, computed),
minTouchTargetPx(44), lcpBudgetMs(2500), inpBudgetMs(200), clsBudget(0.1), posterMaxBytes, worldChunkMaxKb,
cssVarCount, animationLayerCount, gpuTier(1–3), maxLuminanceDeltaPerSec (photosensitivity, G/§gaps),
vestibularCaps{parallaxMaxPx, oscillationMaxHz}, reducedMotionStory{verified,storyId},
staticAtmosphereFirewall(true on product), sanctionedColorways[3–5] (G1), fidelityTiers{full,reduced,poster} (G2),
distinctnessVector(compiled-token hash), antiCheeseChecklist{noCreatures,noClipartGradient,noPhenomenonDup,
noChromeTint}, waivers[{field,reason,approver,expiresAt}], lastMeasured{commit,date,lcp,inp,cls,contrast} }`.
**CI enforcement (fail-closed, 4 layers):** (1) completeness — every registry WorldId MUST have a ledger entry;
(2) static-deterministic (every PR) — compile changed recipe, run guard + *mathematical* brightest-frame contrast +
distinctness + anti-cheese checklist; (3) measured (changed-worlds matrix) — Lighthouse-CI + Playwright trace →
write back `lastMeasured`, breach = block; (4) waivers — signed, single-field, expiring; expired = red build.

### 3.4 `--world-*` / `--surface-*` rename
Engine KEEPS `--world-*` (LensPlanFrame emission is sacred). `design.md` domain set → `--surface-*`. Codemod docs +
product CSS; dual-emit window behind flag `surfaceRename` (one release); CI grep gate: any NEW `--world-` reference
in product-surface code (outside `adapters/style-lens-swan/`) fails the build; delete dual-emit; gate permanent.

### 3.5 Dead-code retirement (each its own PR + prove-dead dossier: grep + 1-release coverage + bundle delta)
`gateTelemetry` (0 non-test callers — confirmed), unmounted `lensViewport/Surface` CSS, then post-Step-4
`UniversalThemeContext` + lying-gate remnants. **Rule 34:** no delete without grep + Sean approval; forbidden
"safe to delete" language — "appears unreferenced based on current grep, pending final check."

### 3.6 Flip the resolver rollout gate (A3 contract) — ONLY when ALL true
- **Completeness:** `WorldId` union = 25 members (TS exhaustiveness = compile error on gap); A3 test asserts
  `resolve(id)` returns a compiled, guard-passing plan for every id AND the fail-closed default for any unknown/
  garbage id (property-tested with fuzzed ids).
- **Ledger green:** all 25 measured, no expired waivers.
- **Determinism attestation:** compiled-plan hashes for all 25 recorded pre-flip; identical post-flip (flip changes
  *routing*, never *compilation* — hash diff = ABORT).
Then flip via Launch Control staged **internal → 5% → 25% → 100%**, kill-switch reverts to DEFAULT world (fail-closed
forward, never back to old gate logic). Appearance FSM + sync untouched. **Do NOT re-key `recipeResolution` or edit
A3 without this checklist green + Sean's rollout go.**

---

## 4. THE AGENT FRONTIER (Sean's new dimension)

### 4.1 The iron law (structural, not policy)
**Agents PROPOSE recipes; they NEVER write production tokens.** Pipeline:
`Agent → CandidateRecipe (JSON, recipeV2 schema, provenance-stamped) → sandbox compileRecipe (deterministic) →
designValueGuard (WCAG/injection/retired-palette/budget) FAIL-CLOSED → ledger simulation → visual preview artifact
(incl. brightest frame + reduced-motion) → HUMAN APPROVAL (two-person for production, one for Lab) → signed
promotion = a normal PR into worlds/recipes/ (same CI as human-authored).`
Enforcement: the agent runtime has **no write credentials** to `worlds/recipes/` or Launch Control. MCP surface =
`preview_world`, `propose_world`, `select_world(surface, context)`, `audit_world` — **never** `apply_to_production`
(apply needs a human-held token). Global kill-switch flag `agentWorlds` reverts all agent-selected surfaces to
default. **Zero-PII (rule 8):** agents receive only derived ENUMS (time-of-day bucket, workout-phase enum, streak
tier, season) computed on-device/edge — never names, health data, or history. Candidate recipes are DATA parsed
against the closed schema; provenance (agent id, prompt hash, ts) → append-only audit log; proposal rate limits.

### 4.2 The 9 products (rated; build order)
| Build | Product | Verdict | Note |
|---|---|---|---|
| **A2 first (foundation)** | **Swan Lens MCP tool** (preview/propose/select/audit) | VALUABLE | infra every other agent is a client of |
| **A1** | **World-picker agent** (context→world among the 25) | VALUABLE — top value/low risk | can only pick guarded worlds; "why this world?" chip (G/ethics) |
| **A3 (in CI from day one)** | **Design-director QA agent** (scores candidates vs ledger + anti-cheese + distinctness) | VALUABLE — highest ROI | advisor to the human gate, NEVER the gate; read-only |
| **A5** | **Conversational "change my vibe"** | VALUABLE — UX over A1 | thin front-end on the selector; cheap once A1+A2 exist |
| **A6** | **Adaptive data-driven worlds** (streak grows signal-garden flora; PR fires meridian-magazine flare) | VALUABLE — the emotional moat | **deterministic data→param mapping within ledger bounds, NOT generative** |
| **A7** | **Per-surface orchestration** (onboarding→first-workout→first-PR journey) | VALUABLE — phase 2 | depends on A1+A2+A6 |
| **A4 (Lab-only)** | **Agent world-factory** (prompt→new world #26+ draft) | VALUABLE with a gate | secretly the enterprise white-label product (G/§gaps) |
| **A8** | **Seasonal-drop agent** | MODERATE — defer | = A4 + cron; bundle into A4 roadmap |
| **A9** | **Multiplayer/shared worlds** | GIMMICK for now | shelve; revisit after A6 proves data-worlds land |

---

## 5. GAPS (deduped Kimi + Fable, 15) — decided
- **G1 — 25×42 matrix explosion.** Each world declares 3–5 **sanctioned colorways** in its ledger; picker may only
  compose sanctioned pairs; CI-enforced.
- **G2 — tiered fidelity.** Each world declares `full/reduced/poster` tiers in the ledger, selected by device
  capability (not a global toggle). A $200 Android gets `poster`.
- **G3 — world transitions.** ONE canonical transition: 0.6s crossfade **through the dark vault** (every world
  passes through black — on-brand, hides popping). Reduced-motion = instant cut.
- **G4 — versioning + migration.** `WorldRecipe.version` field NOW; `user_appearance_profiles.worldVersion` +
  migration map; retire → map to nearest family sibling + notify.
- **G5 — vestibular/cognitive a11y.** Ledger `vestibularCaps` (parallax amplitude, oscillation Hz — chronograph-board
  4Hz capped); guard enforces.
- **G6 — OG/social preview images.** Deterministic world-styled OG images generated from the recipe for shareable
  surfaces (meridian-magazine share cards = growth loop).
- **G7 — Seedance asset licensing.** Settle commercial-use terms for 25 worlds × generated atmospheres BEFORE build.
- **G8 — analytics contract.** Define now: `world_impression/switch/dwell`, `agent_proposal_accepted/rejected`
  (zero-PII). Without it A1 can't learn and A9's verdict can't be revisited with data.
- **G9 — anti-cheese teeth.** Prose → machine checklist scored by A3 (no creatures, no clip-art gradient, no
  phenomenon dup, no chrome tint) — a ledger field.
- **G10 — enterprise/creator tier.** Name it now: A4 factory IS a white-label product; changes the approval UX.
- **G11 — photosensitivity.** `designValueGuard` gains a max-luminance-delta-per-second rule (stormglass-class
  worlds); seeded flashing recipe must be rejected.
- **G12 — telemetry ethics + opt-out.** Auto-selected worlds need a visible "why this world?" affordance + sticky
  user override — else adaptive theming reads as surveillance.
- **G13 — seasonal/lifecycle governance.** Scheduled activation windows live in the registry (snow-globe/frost
  seasonals), not ad-hoc flag flips.
- **G14 — poster asset pipeline.** Build-time poster optimization + CDN contract (formats, sizes, hash-addressed)
  for 25 posters — currently unowned.
- **G15 — recipe schema versioning path.** RecipeV2→V3 compile-time migration path built cheap now, not expensive later.

---

## 6. NUMBERED SLICES (each independently shippable, hostile-reviewable, zero further questions)
Real ids throughout. Per-slice: build → local gates (affected vitest, `tsc --noEmit` true-exit from `frontend/`,
vite build, backend `node --check` where touched, Rule 42 audit, secret scan) → hostile-review to Dry-Loop CLEAN×2
→ commit per slice (explicit paths) → do NOT push. Batch-push at Sean's gate (rule 70).

1. **Engine spine.** `worlds/registry.ts` (closed `WorldId` = the 25 real ids), migrate the 2 recipes out of
   `labRecipes.ts` into `worlds/recipes/`, ledger file + schema, `lens-add-world.mjs`, CI layers 1–2 (§3.3).
   *Accept: both worlds render byte-identical (compiled-plan hash match); generator scaffolds a dummy world E2E then
   deletes it in the same PR's test; all existing Lab/contract tests green.* **← highest-value first slice, zero user-visible change.**
2. **Characterization oracle** (theme Step 0). *Accept: suite green, <5 min in CI.*
3. **Derivation shim + `themeUnify` flag** (Step 1). *Accept: oracle green in both flag states.*
4. **Consumer codemod** (Step 2) + read-telemetry. *Accept: zero dev-mode throws across e2e.*
5. **Kill lying-gate** (Step 3). *Accept: oracle green; PR reverts cleanly (revert tested in CI).*
6. **Dead-code deletions** — `gateTelemetry` + unmounted CSS, one PR each + prove-dead dossier (Rule 34 + Sean OK).
7. **`--surface-*` rename** — codemod + dual-emit flag + grep gate. *Accept: gate blocks a seeded violation.*
8. **Measured-CI layer** (ledger layer 3) + per-world preview routes. *Accept: seeded budget breach blocks merge.*
9. **Worlds wave 1 (ranks 3–6):** aurora-index, crystalline-cathedral, coach-ledger, quiet-meridian — one PR per
   world, ledger-green + distinctness + anti-cheese signed. (candy-glass/prism already real from Slice 1.)
10–13. **Waves 2–5 by family:** finish playful (kinetic-kanban, signal-garden, tempo-forge, orbit-atlas,
   modular-harbor, kintsugi-circuit) · calm (recovery-cloister, monastic-grid, lunar-stack) · technical
   (blueprint-fold, analog-flight-recorder, chronograph-board, terrain-console) · luxe (carbon-atelier,
   meridian-magazine, glass-rail) · atmospheric (tidal-columns, split-horizon, cedar-workshop). ~5/slice, same accept.
14. **Photosensitivity rule** (G11) in guard + recipe `version` field (G4/G15). *Accept: seeded flashing recipe rejected.*
15. **A3 gate flip** — completeness contract + hash attestation + staged Launch Control rollout + kill-switch drill.
   *Accept: fuzzed unknown ids → default; 100% rollout, zero hash drift.* **← the "worlds go live for real users" moment.**
16. **Delete `UniversalThemeContext`** (Step 4) after telemetry-zero window. *Accept: prove-dead dossier.*
17. **Agent selector + MCP tool** (A2+A1; preview/propose/select) — structural no-write creds, zero-PII enum context,
   `agentWorlds` kill-switch. *Accept: red-team — injected candidate token string never reaches DOM; apply without
   human token fails.*
18. **Design-director QA agent (A3) + "change my vibe" (A5).** *Accept: agent output advisory only; vibe surface
   can only select approved worlds.*
19. **Agent world-factory (A4, Lab-only)** through the full §4.1 pipeline. *Accept: guard-violating proposal rejected
   fail-closed + logged with provenance; nothing agent-authored reaches prod without two human signatures.*

Cross-cutting gap slices fold into the above: G1 sanctioned-colorways + G2 fidelity tiers land with the ledger
(Slice 1/8); G3 transition with wave 1 (Slice 9); G6/G14 OG + poster pipeline before Slice 15; G8 analytics before
Slice 17; G12 "why this world?" with Slice 17; G7/G10 are Sean decisions (license terms, enterprise naming).

---

## 7. GUARDRAILS / INVARIANTS (non-negotiable — every slice)
- **Two engine invariants:** deterministic compiler (no clocks/randomness, same input→same hash); fail-closed
  validation (missing/invalid → default world, never a broken frame).
- **Law A** on all Swan-brand surfaces (chrome = Crystalline tokens; world = setting only). Law B native palettes
  are non-Swan only and never touch chrome.
- **Design never gates** (FLAG-LIFECYCLE-DOCTRINE) — worlds ship via committed routes + the resolver gate + Admin
  Design Studio; do NOT reintroduce per-page surface flags. The only real flags here are engine-lifecycle
  (`themeUnify`, `surfaceRename`, `agentWorlds`) + the staged rollout.
- **Token discipline:** `var(--token, #fallback)` everywhere; retired Galaxy-Swan hex banned as positive value;
  `--world-*` is engine-only in product code after Slice 7.
- **A11y floors in code** (not aspirational): WCAG 4.5:1 at brightest frame, 44px, reduced-motion static story,
  forced-colors, vestibular + photosensitivity caps. **Perf:** LCP≤2.5/INP≤200/CLS≤0.1, poster-first, per-world
  lazy chunk, static-atmosphere firewall on product surfaces.
- **Agents:** propose-only, no write creds, zero-PII enums, human approval gate, kill-switch, audit log.
- **Process:** Dry-Loop Law (hostile review to CLEAN×2 per slice, PROOF markers, no "done" without current-session
  proof + clean hostile pass — rule 74); batch-push at Sean's gate (rule 70); Linear SWA-69 synced; Hermes closeout
  memo; every engine file <250 lines (rule 4); 7-star docs on new files.
- **Rule 34:** no delete/move without grep + Sean approval; forbidden "safe to delete" language.

## 8. Definition of Done (program)
All 25 real ids have a hand-authored, ledger-green world recipe; the 2 originals refactored in with hash-identical
output; the two theme systems collapsed to `paletteThemeId`; `--surface-*` rename complete; dead code retired; the
A3 gate flipped to 100% with zero hash drift; the agent MCP tool + picker + QA agent + vibe surface live with the
iron-law governance proven by red-team; every slice passed Dry-Loop CLEAN×2 with proof; SWA-69 closed; Hermes memo
emitted. **The worlds are live for real users, machine-audited, agent-assisted, and better than the Opus-4.8 era.**