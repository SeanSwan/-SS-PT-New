> **Crystalline Canon — adopted 2026-07-19 (Sean-confirmed)** from KIMI-DESIGN-BRAIN-ENHANCED,
> the decisive rewrite of the prior Design Brain (killed the hedged "OR" laws; added z/duration/
> density scales + a `canon:contrast` CI trigger + the SOLID/LIQUID canon lifecycle). Prior version
> preserved at `design.md.pre-redo`. This canon is the source of truth; `design.html` mirrors it and
> loses on any conflict. The 6 builder-validated refinements (reduced-motion-in-JS, the fail-closed
> gate/flag scaffold, content-law-scans-comments, Gemini-is-author-not-gate, consult-kimi --effort
> medium, consumer-vs-emitter world-token boundary) live in the swan-design-router LAWs — canon +
> law are complementary. Validated by 7 shipped design-overhaul surfaces + their cross-cutting review.

# design.md — SwanStudios Design Brain (Crystalline Canon)

- **Crystal:** v2.0 · **Status:** CRYSTALLIZED — frozen; change only via §16 thaw · **Date:** 2026-07-04 · **Review pass:** Kimi K3
- **Supersedes:** Fable draft 2026-07-03. Survives: T0–T4 tiers, dual-glow concept, C11 chart environments, data-only Arctic Cyan, low-motion data cards, 44px discipline. Changes: everything vibes-based is now mechanized or deleted.
- **Mirror:** `design.html` is GENERATED from this file (`pnpm canon:build`). Hand edits are reverted by CI. One source, one truth.
- **Enforcement files:** `canon/tokens.json` · `canon/route-manifest.json` · `canon/signature-moments.json` · `canon/motion-caps.json` · `canon/copy-lexicon.json` · `stylelint-config-swan` · gates: `canon:check`, `canon:contrast`, `canon:build`.

## §1 How canon works — Crystallization

- Lifecycle: **LIQUID → CRYSTALLIZED → (thaw) → LIQUID.**
- LIQUID: proposal in `canon/liquid/`, experimental tokens namespaced `--x-*`, expires 14 days after opening. Expired LIQUID is deleted, not extended.
- CRYSTALLIZED: merged here + `tokens.css` regenerated, versioned, lint-enforced. Canon contains zero pending, proposed, placeholder, or pick-one markers. Undecided = not canon.
- Thaw: PR naming one law, the measured failure (numbers, not feelings), and the revert plan.
- Every law names its enforcement mechanism (lint / CI / generated / crystallization review). A law with no mechanism is deleted at review. Policy is hope; mechanism is law.

## §2 Taste Bible

North star: **a dark vault where light does the work.** Every surface is obsidian depth; every accent is light that entered crystal and came out changed — refracted, split, edged in gold. Nothing decorates; everything refracts.

Five tests, run at every crystallization review, screenshots attached to PR:

1. **Mute test** — motion off, the frame still reads premium. If it needs animation to feel expensive, it's cheap.
2. **Grayscale test** — desaturated, hierarchy survives on value alone. Color is emphasis, not structure.
3. **320 test** — designed at 320px first; nothing critical clips; nothing needs hover.
4. **Screenshot test** — a stranger names the one big idea in 3 seconds. If they list three, cut two.
5. **Jeweler's test** — would a jeweler ship this edge? Glow, border, facet, grain: crisp, deliberate, placed. Slop is a smeared edge.

Positive canon (what we steal from): cut crystal, black sapphire water, ice caustics, museum-vault lighting, watchmaker typography, ledger discipline. We admire restraint with one violent flourish per page — budgeted, registered (§8).

Copy taste: short declaratives; numerals over adjectives; ≤1 exclamation per view; banned lexicon in §14; drama = one Cormorant italic beat per **viewport**, never per component.

## §3 Optics, not creatures

- The swan is never drawn. No illustration, no mascot, no feather motif, no swan emoji, no AI-generated bird. The ONLY creature asset is the registered wordmark/logomark lockup, used 1:1, never re-rendered.
- Brand is expressed through optical physics: refraction, dispersion, caustics, internal reflection, facet edges, frost bloom, depth light. A surface that wants "more brand" gets better optics, never a bird.
- Imagery law: macro crystal / ice / water-caustic photography or physically rendered caustics; sapphire-grade duotone; grain per §9. Real training photography allowed in `mkt` world only, graded; no stock gym tropes (high-fives, avocados, pastel wellness).
- Iconography: geometric stroke icons, 1.5px stroke on a 24px grid, 20/24 sizes; no filled cartoons, no emoji-as-icon, no creature glyphs.
- Enforcement: asset CI scans filenames/alt/imports against the creature lexicon; violations fail the build; final call at crystallization review.

## §4 Dispersion law — rainbows are physics or they are nothing

Multi-hue rendering is legal ONLY as dispersion: one pale source, split by an edge. Four conditions, all mechanized:

1. **Spectral order.** Gradient stops must be monotonic in wavelength, either direction. Canon wavelengths (nm, approx): Wing Purple 420 · Swan Lavender 450 · Arctic Cyan 470 · Ice Wing 488 · Gilded Fern 580. Danger red is never part of a spectrum — alarm is not light-play.
2. **Refractive geometry.** Spectra live on facet edges (≤2px), caustic spots (≤24px), or one split band (≤64px tall). Never fills, never text, never conic border loops, never full-bleed washes.
3. **Intensity budget.** Total spectral coverage ≤2% of viewport, shared across all spectral elements; spectral opacity ≤0.6; caustic band ≤0.14.
4. **Reduced-motion → static.** Spectra never loop; hover-brighten is SNAP opacity only.

Crystallized consequences:

- **Legendary rarity** = faceted edge: 1.5px spectral fringe along the card's top facet, ordered violet→blue→cyan→gold, 0.5 alpha; hover → 0.8 at SNAP. The old cyan→purple→gold animated wash is BANNED (order reversal = physically illiterate light).
- **Ops aurora** = caustic band: off-canvas pale source top-left, refracted monotonic violet→blue→cyan with gold only as the terminal warm stop, ≤64px, ≤0.14 alpha, static. Old order banned.
- Enforcement: `swan/dispersion-order` maps every gradient stop to nearest canon wavelength and fails non-monotonic sequences; multi-hue gradients outside `.spectral-fringe` / `.caustic-band` are rejected. This is the rainbow lint.

## §5 Worlds & lenses — the `--world-` tie

- **World** = where a surface lives. Three worlds: `mkt` (marketing, storefront, onboarding) · `pro` (client/trainer/admin dashboards, Swan Coach, Coach Command Center) · `ops` (Hermes operator cockpit, Sean-only).
- **Lens** = how a world is viewed. Two lenses: `density` (comfort | compact | cockpit) and `motion` (full | calm). Permitted subsets: mkt = comfort · full · pro = comfort|compact · calm (+1 registered signature/route) · ops = compact|cockpit · calm (zero signatures, zero ambient loops).
- **The tie:** every route declares its world in `canon/route-manifest.json`; the shell sets `<body data-world data-lens-density data-lens-motion>`. Components NEVER set `data-world`; they may only narrow density within world allowance.
- **Consumer vs emitter boundary (proven across 7 shipped surfaces):** a design surface is a pure CONSUMER of `--world-*` — it READS them through a single `*.tokens.ts` bridge and re-skins for free when the world switches. It must NEVER emit or modify `--world-*` names, `SurfaceLensGate`, `makeLensFrame`, or `AppearanceProfile` — those belong to the World-Engine / Lane-A. (The design-overhaul money-path audit confirmed 0 violations of this boundary; the Living Worlds lanes EMIT the world tokens, the surfaces CONSUME them.)
- **Token mechanics:** components consume world-scoped semantics only — `--world-bg`, `--world-surface`, `--world-panel`, `--world-edge`, `--world-text`, `--world-wash`. Raw palette tokens are legal only inside `tokens.css` and the world layer:

```css
[data-world="mkt"], [data-world="pro"] {
  --world-bg:#0A0A0F; --world-surface:#141419; --world-panel:#1A1A24;
  --world-edge:rgba(96,192,240,.22); --world-text:#E0ECF4; --world-wash:none;
}
[data-world="ops"] {
  --world-bg:#0E2A1E; --world-surface:#123527; --world-panel:#1A4032;
  --world-edge:rgba(96,192,240,.22); --world-text:#E0ECF4; --world-wash:var(--caustic-band);
}
```

Ops keeps text/edge/glow identical — Cyberforest is a bg-layer swap, nothing more. Kill-switch panel, tier badges, receipts: unchanged law, rendered through the same semantics.
- **Leakage is a build error:** eslint bans `--world-ops-*`, `data-world="ops"`, and `ops/*.css` imports under `frontend/src/**`; route manifest is CI-checked against the bundle. The old "please don't" policy is deleted — replaced by mechanism.

## §6 Color, contrast & Dual-Button Glow — revalidated per surface

Palette (crystallized here in full — the brain knows, it does not point):

| Token | Hex | Role |
|---|---|---|
| `--midnight-sapphire` | `#002060` | Primary fills |
| `--royal-depth` | `#003080` | Elevated surfaces |
| `--ice-wing` | `#60C0F0` | Cyan glow, XP, focus |
| `--arctic-cyan` | `#50A0F0` | DATA ONLY (charts). Lint-blocked elsewhere |
| `--gilded-fern` | `#C6A84B` | Gold edges, rare-tier, deltas |
| `--frost-white` | `#E0ECF4` | Text primary |
| `--swan-lavender` | `#4070C0` | Badge fills/graphics — NOT text-bearing fills |
| `--swan-lavender-deep` | `#3560B0` | NEW — text-bearing lavender fills |
| `--wing-purple` | `#8B5CF6` | Glow/graphics/epic-tier — NOT text-bearing fills |
| `--wing-purple-deep` | `#6D3FD1` | NEW — text-bearing purple fills (Accent button) |
| `--lavender-text` / `--purple-text` / `--danger-text` | `#8FB2EE` / `#B49CFA` / `#F0938A` | NEW — small text on dark (the "pending" tints, now crystallized) |
| `--obsidian-black` `#0A0A0F` · `--carbon` `#141419` · `--graphite` `#1A1A24` | — | Ground layers |
| `--danger` | `#E5484D` | Destructive/T4 only; ≤1 red element per view unless erroring |

Contrast table (WCAG formula, ≈ computed; `canon:contrast` recomputes exactly on every token change and fails regressions):

| Pair | Ratio | Verdict |
|---|---|---|
| Frost White / Midnight Sapphire | ≈12.7:1 | any text |
| Frost White / Royal Depth | ≈10.1:1 | any text |
| Frost White / Swan Lavender Deep | ≈5.1:1 | any text |
| Frost White / Wing Purple Deep | ≈5.3:1 | any text |
| Frost White / Swan Lavender | ≈4.1:1 | **BANNED (text)** |
| Frost White / Wing Purple | ≈3.5:1 | **BANNED (text)** |
| Gilded Fern / Graphite | ≈7.4:1 | any text |
| Ice Wing / Obsidian | ≈9.7:1 | any text |
| lavender/purple/danger-text / Carbon | ≈8.5 / 7.9 / 8.0:1 | small text |
| Arctic Cyan / Carbon | ≈6.7:1 | data only |

Semantics: success = Ice Wing · info = lavender-text · warn = Gilded Fern · danger = `--danger`/`--danger-text`. Rarity: common lavender · rare gold · epic purple · legendary = §4 faceted edge.

**Dual-Button Glow — law stands** (blue bg → Wing Purple glow; purple bg → Ice Wing glow), **now surface-relative.** Focus/hover indication must clear 3:1 non-text contrast against the surface beneath. Crystallized matrix:

| Surface | Blue button (purple halo) | Purple button (cyan halo) |
|---|---|---|
| Obsidian page | alpha ≥0.60 (0.5 ≈ 2.8:1 — fail), blur 24px | alpha ≥0.55, blur 24px |
| Carbon card | ≥0.55, blur 20px | ≥0.50, blur 20px |
| Graphite modal | ≥0.55, blur 20px | ≥0.50, blur 20px |
| Ops forest-mid | halo fails at ALL alphas → 2px solid `--purple-text` stroke (≈5.0:1) | 2px solid Ice Wing stroke (≈5.6:1) |

Caps: ≤2 shadow layers, blur ≤32px, spread ≤8px, decorative glow ≤0.5 alpha. **Revalidation trigger:** any PR adding a surface token or placing a button on a surface not in this matrix MUST extend the matrix in the same PR; `canon:contrast` fails otherwise. Forced-colors: glows removed, 2px outlines. Danger button: no glow, ever — destruction is not celebrated.

## §7 Typography

Faces unchanged: Plus Jakarta Sans (headings/UI), Cormorant Garamond Italic (drama), Fira Code (data, tabular), Sora (micro-labels, gaming-surface UI). Scale unchanged (hero 64–120 · H1 40–56 · body 16–18 · micro 11–12 @0.08em). New law:

- Cormorant budget = **one italic beat per viewport**. The old per-section rule let dashboards accumulate six drama lines. Full-phase empty states may spend the beat; inline empties use Sora micro-label + one plain sentence.
- Numerals never in Cormorant. Body prose ≤72ch. Never Inter/Roboto/Arial/Helvetica as display.

## §8 Two-speed law — SNAP or DRIFT, nothing between

Everything that changes state does so at exactly one of two speeds. No third speed exists; there is no "medium."
Runtime quality ships as Full/Lean/Still; Reduced Motion is a separate accessibility override across every quality mode, never a fourth quality tier.

- **SNAP (response):** {120, 160, 200}ms, `--ease-snap: cubic-bezier(0.16,1,0.3,1)`. Hovers, presses, toggles, focus, toasts, tab switches.
- **DRIFT (narrative/ambient):** transitions {600, 720, 900}ms, `--ease-drift: cubic-bezier(0.4,0,0.2,1)`; ambient loop periods {4000, 6000, 8000}ms.
- Tokens only: `--speed-snap[-fast|-slow]`, `--speed-drift[-loop]`. Raw time values in transition/animation shorthand are a lint error (`swan/two-speed`). Transform + opacity only; layout-animating properties banned.

Mechanized caps (`canon/motion-caps.json`, CI-enforced):

- Signature moments: ≤1 per route, marked `data-signature`, registered in `canon/signature-moments.json` WITH its reduced-motion fallback. CI fails a route with 2 moments or a fallback-less registration.
- Ambient loops: ≤2 per viewport; opacity delta ≤0.15; transform delta ≤8px or 2%. Sheen duty cycle ≤25%.
- Ops world: ambient 0, signature 0, SNAP only.
- Reduced motion (CSS + JS gates): SNAP→0ms, DRIFT→static end-state, loops stopped. Not a degraded experience — the same design, still.
- The two speeds also govern process: UI changes move at SNAP (flagged, one-revert); canon moves at DRIFT (crystallization cycle, §16). Nothing ships at a third speed.

## §9 Space, elevation, z — recipes crystallized inline

- Spacing scale: 4 8 12 16 24 32 48 72 108 160 240 px. Section gaps 160–240 desktop / 72–108 mobile. Arbitrary values are lint errors.
- Radius: 20 cards · 12 controls · 999 pills · 24 modals.
- Elevation = glass + glow. Three recipes, now living IN the brain (the "quoted in source §C12" pointer is dead):
  1. **Sapphire glass:** `linear-gradient(160deg, rgba(0,48,128,.55), rgba(10,10,15,.75)); backdrop-filter: blur(14px); border: 1px solid rgba(96,192,240,.22); box-shadow: 0 8px 32px rgba(96,192,240,.10), inset 0 1px 0 rgba(224,236,244,.06);`
  2. **Luxury gold-edge:** sapphire glass + `border-color: rgba(198,168,75,.32); box-shadow: 0 8px 32px rgba(198,168,75,.08), inset 0 1px 0 rgba(198,168,75,.12);`
  3. **Obsidian:** `rgba(20,20,25,.72); backdrop-filter: blur(10px); border: 1px solid rgba(96,192,240,.14); box-shadow: 0 4px 16px rgba(0,0,0,.5);`
  No fourth recipe. New elevation need = LIQUID proposal.
- Grain: ≤1 layer per viewport, ≤5% opacity, static asset — no per-frame turbulence.
- z-scale (tokens; raw z-index banned by `swan/z-scale`): `--z-base 0 · --z-raised 10 · --z-sticky 100 · --z-overlay 200 · --z-modal 300 · --z-toast 400 · --z-max 500`. `translateZ(0)` parents carry position + z-index.

## §10 Layout & density

- Grid primary; flex for intra-component rows. Weighted columns always; `repeat(N,1fr)` N>2 warns, N=4 errors (equal 4-up is the generic-AI tell). Three z-stacks minimum on hero surfaces.
- Wide law (decisive — the OR is dead): add weighted columns up to 6 as width grows; content CAPS at 2240px centered; cards never stretch to fill 4K. Heroes may full-bleed; type caps at §7 max.
- Mobile: 320 first, verify 375/414; stack > squeeze; shelf scroll needs visible affordance; primary CTA in thumb zone; targets ≥44px with ≥8px gaps.
- Density lens reconciles 44px with the cockpit: comfort = 44px rows · compact = 36px · cockpit = 32px floor, `@media (pointer:fine)` only. Coarse pointers force ≥44px regardless of lens — mechanized in the density layer, not per-component.
- Dashboards: Phase-2 current state owns the area; role density (admin > trainer > client) is expressed through the density lens, never through ad-hoc squeezing.

## §11 Components

- **Cards:** SheenCard (sell/showcase, full recipe, hover motion) vs Data card (truth surfaces: low-motion, no pointer tracking, no loops, no hover-only controls, grouped facts never duplicated). Nesting depth ≤1: a card in a layout panel is legal; a card in a card is not. The chat stream is a stream, not a card — T1 DRAFT cards inside it are legal.
- **Buttons (GlowButton):** ≥44px, 12px radius. Primary = Midnight Sapphire → purple glow · Accent = `--wing-purple-deep` fill (600-weight label) → cyan halo · Luxury = Graphite + Gilded Fern · Ghost = transparent + electric border · Danger = `--danger`, no glow. States: hover (+1–2% scale at SNAP) / active 0.98 / focus-visible per §6 matrix / disabled 40% no glow / loading spinner + persistent label.
- **Inputs:** label above always; Graphite field, electric border; focus = ONE accent per form (law, not a pick); error = danger border + message + `aria-describedby`; destructive never adjacent to submit.
- **Tables:** Sora uppercase header 70% white; Carbon rows, cyan 8% separators, ≥48px rows; numerals Fira right-aligned; <768px collapse to stacked data cards.
- **Charts:** Victory + `chartTheme.ts` only; Arctic Cyan primary series; every chart in a C11 environment (headline, Cormorant insight line if budget allows, gold/purple delta, annotation, next-action footer); lazy + SafeChart.
- **Chat:** user right/Royal Depth, coach left/Graphite + Ice Wing edge; proposals = labeled T1 DRAFT cards with ≥44px approve/dismiss; streaming without layout shift; user-facing name is "Swan Coach," never "AI."
- **Modals/drawers:** Graphite obsidian glass, 24px radius; focus-trapped, ESC closes (not mid-T4), focus returns to trigger; T3 confirm names action+target+tier with a verb on the button; T4 = two-step arm + rollback line; never stacked.
- **Nav:** left rail (72px collapsed), Ice Wing active edge; mobile bottom tabs ≤5; breadcrumbs ≥3 levels only; progress/workout never buried below social/profile.
- **Tier badges T0–T4:** ice/lavender/gold/purple/red, text+color always, ambiguity rounds UP, chains show max; badge small text uses §6 text tokens.

## §12 States & onboarding

Every data component ships four states. Empty = Cormorant beat (if §7 budget available) + one CTA that creates a real thing; never "No data," never mock-filled. Loading = geometry-matched skeletons (static under reduced-motion). Error = plain words + retry, one danger accent. Success = inline confirmation; celebration is a SNAP beat, not a loop. Onboarding: one question per screen on mobile, persistent progress, role activation targets (trainer: first template + invite; trainee: first log + proof), next-best-action visible without scrolling.

## §13 Build law — build-exact / full-stack-real / reversible

1. **Build-exact.** Implement exactly the spec: this doc + route manifest + component contract. No speculative props, no might-need variants, no unused tokens. Dead-token/dead-code CI. Spec ambiguous? STOP — open a LIQUID proposal. Keyboard improvisation is how generic happens.
2. **Full-stack-real.** Every rendered value traces to a real endpoint or query. Mocks exist only with `data-mock` + visible DRAFT badge + linked ticket; production build FAILS on `data-mock`. Loading/error/empty are real states of the same query, never separate fake screens.
3. **Reversible.** Every change ships as a single revertable unit; risky UI behind a flag; destructive actions carry an undo path (T4 two-step arm + rollback note stands); schema-bound UI ships expand-contract; every canon thaw names its revert plan. If you can't undo it in one step, you may not ship it in one step.

## §14 Anti-generic bans — each with its mechanism (no mechanism, no ban)

| Ban | Mechanism |
|---|---|
| Galaxy-Swan hexes `#0A0A1A` `#00FFFF` `#7851A9` | stylelint hex ban |
| MUI / Tailwind imports | eslint import ban |
| Raw durations, raw z-index, arbitrary spacing | `swan/two-speed`, `swan/z-scale`, `swan/spacing` |
| Hand-written token fallbacks | `tokens.css` generated from `canon/tokens.json`; `swan/fallback-match` autofixes drifted hexes |
| Non-dispersion multi-hue; holographic foil text; rainbow conic borders | `swan/dispersion-order` (§4) |
| Arctic Cyan outside `chartTheme.ts` | token-usage lint |
| `repeat(4,1fr)`, equal-N grids, cards-in-cards | stylelint pattern + VR snapshot |
| Creature imagery, swan illustration, feather motifs, emoji-as-icon, ✨ glyphs | asset CI scan + crystallization review |
| Copy slop: "delve, unlock, elevate, seamless, journey, empower, supercharge," yoga/meditation lexicon, user-facing "AI," >1 "!" per view | copy CI grep (`canon/copy-lexicon.json`) |
| Placeholder-as-label, hover-only controls | jsx-a11y lint + VR |
| Lorem ipsum, fake metrics, dressed-up mocks | CI grep + `data-mock` build gate (§13) |
| Stacked modals, centered-everything, plastic gradient fills, glass off-recipe | crystallization review with a named reviewer — what isn't mechanized is judged, by name, on record |

## §15 Accessibility floor

4.5:1 text per §6 crystallized table (CI-recomputed) · 3:1 non-text for focus indication per §6 matrix · focus-visible everywhere, logical order, restoration on close · no hover-only controls · targets per §10 density law · reduced-motion per §8 · color never sole signal · forced-colors = outlines, no glows.

## §16 Crystallization protocol

1. Open LIQUID in `canon/liquid/`: law text, mechanism, `--x-*` tokens, 14-day expiry.
2. Mechanize enforcement BEFORE review. A law whose lint lands "later" is rejected.
3. Review: five taste tests with screenshots, `canon:contrast` recompute, dispersion check, manifest/registry diffs.
4. Merge = crystal version bump + tokens.css + mirror + fallback map regenerated — one commit, one revert.
5. Thaw requires measured failure (numbers) + revert plan. One thaw = one law.

## §17 Implementation notes

- React 18 + TS + styled-components. Any interpolated shared style fragment uses the `` css`` `` helper (mount crash is real — kept from the old rule 43).
- 300-line file cap; blueprint header beyond 100 lines. Performance tiers (full/lean/reduced) ship in the same file as the component.
- Victory + `chartTheme.ts` only; lazy + SafeChart; cursor pagination on feeds.
- `tokens.css` is generated, never hand-edited; component fallbacks come from the generated map.
- `1440px` width ≠ 1440p. QA matrix classes: 320/375/414 · 768 · 1440 · 2560×1440 · 3840×2160.

---

**Bottom line.** The old doc told people what Swan looks like. This one makes it mechanically difficult to ship anything else: the purple button passes contrast because the failing hex can no longer hold text; the rainbow is physics because the lint rejects reversed wavelengths; Cyberforest can't leak because the import doesn't resolve; motion has two speeds because no third duration compiles; and canon has no holes because "pending" is a build error. Taste is still human — but it now judges at crystallization, on record, with the five tests in front of it.
