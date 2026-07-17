# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** .ai-workflow/fusion/kimi-world-atmosphere-enhance.md
**Seed:** docs/ai-workflow/AI-HANDOFF/WORLD-ENGINE-LIVING-ENVIRONMENT-BUILD-BLUEPRINT-2026-07-17.md
**Tokens:** 5248 in / 10462 out · **Cost:** ~$0.1727 · **Wall:** 350.3s

---

# HOSTILE DESIGN + FRONT-END REVIEW — WorldAtmosphere Enhancement Work Order

## (a) VERDICT

**SHIP-WITH-CHANGES** — Slice 1 (worldId seam) starts today untouched; three changes below are **blocking for Slice 2**, and the first one decides whether this system is premium or clip-art.

---

## (b) Design weaknesses, most-severe first

**1. The subject-matter trap — this spec commissions clip-art and calls it atmosphere.**
The founder's list (whales, dolphins, hummingbirds, bees, "physically-correct rainbows") is being treated as a requirements doc. The moment a recognizable silhouette drifts behind a workout log, this stops being *place* and becomes a screensaver — the exact failure mode the doc itself names. Fireflies + snow + embers + comets is the Windows-bliss-with-particles genre. Worse, it creates an unownable asset pipeline: who draws the swan, QA's it at 3840, keeps it on-brand across 18 worlds? The doc confuses **subject matter** with **atmosphere**. Atmosphere is light, depth, particulate, refraction — never fauna. This is the cheapest-looking possible outcome of an expensive system, and it's the #1 ask.

**2. The anti-distraction contract is asserted, not mechanized.**
"Alive, never a screensaver, NEVER distracts from the data" appears three times and is specified zero times. The actual levers are missing from every contract: a **per-layer max luminance delta** vs. the base gradient (cap in OKLCH lightness units), **velocity caps** (ambient drift period ≥ 20s; particles ≤ ~10px/s), and **amplitude caps** (opacity oscillation Δ ≤ 0.03 — sub-perceptual). Without these, "restraint" is delegated to per-primitive builder taste, which is how you get a pulsing breathing loop behind a PR table. The `signaturePhenomenon` and Crystallize ripple especially need caps, since they're the highest-energy events in the system.

**3. Translucency voids the strongest structural claim.**
"Zoned decoration — structurally impossible under tables/charts/dense cards" is only true if every `--world-panel` is **opaque**. A crystalline design language almost always wants translucency/sheen. If any panel has alpha < 1, drifting particulate and caustics move *behind live text*, and the CI contrast matrix as specced (flat world × palette × lens pairs) **never tests the composite**. This is simultaneously a WCAG 4.5:1 hole and a lie in the architecture doc. Fix: either a min-alpha floor on world panels, or a worst-case composite fixture (atmosphere at max-luminance point, behind min-approved panel alpha, text on top) added to the receipt matrix.

**4. Mobile perceptibility rounds to zero.**
At 375/414, single-column dense cards fill the viewport; a fixed layer *below all content* is visible only in ~16px gutters. The doc names the gym-floor phone as the primary thermal constraint while shipping it a feature it can't see. Either design explicit **reveal zones** (header transparency band, edge-glow weighted for narrow viewports, section-gap exposure) or admit the atmosphere is desktop-first and stop spending thermal budget on it at <768px.

**5. `signaturePhenomenon` as a required field guarantees gimmick monoculture.**
Scarcity is what makes a signature premium. Mechanize it as schema-required and world #9 gets a derivative stunt. Worse, "physically-correct rainbow" is an **impossible ask of the medium** — scalar-parameterized CSS gives you a conic-gradient arc, which is kitsch, not physics. Keep the field **optional in schema, required by promotion policy for the 5 flagships only**.

**6. Non-determinism breaks "place."**
No `seed` scalar anywhere. A place whose grain and particulate rearrange on every mount is not the same place when you return — determinism is a core property of *place*, and it costs one allowlisted integer. Screenshot-diffability and cross-tab consistency (seed flow step 6) also depend on it.

**7. Crossfade color space is unspecified.**
The 250ms world-switch crossfade between two dark gradients interpolates through sRGB mud (the gray dip between deep blue and purple) unless you mandate **stacked-layer opacity crossfades only** (never token-value transitions on a single layer) or `color-mix(in oklch, …)`. Specify one or the boot polish dies in the middle frame.

---

## (c) Implementation-fidelity attacks

- **The file budget is miscounted, not stretched.** "Say so if it needs a 5th file" — it needs ~14. Ten typed primitives with render + reduced fallback + validation cannot live in a 300-line `compileWorld` + `<WorldAtmosphere>`. The correct pattern is `primitives/` with one module per primitive (~40–90 lines each) plus a `registry.ts`, a `useMotionVeto` hook, and a `particulateCanvas` module. All under 300 lines — fine — but **Slice 2 is no longer M; it's L**, and the doc should say so.
- **Two failure modes are conflated.** "Unknown type → fail closed to Crystalline" is correct for *content-security* failures and wrong for *capability* mismatches. A runtime-2.x client loading a 3.0 world shouldn't lose the entire world to one unknown layer — it should **skip that layer and keep the rest**, logged to the qa receipt. Split the rules; add `engine: ">=3.0"` negotiation for persisted `{worldId, version}`.
- **Canvas particulate smuggles per-frame JS into a "transform/opacity only" contract.** Either spec the full machinery (rAF gated on `visibilitychange` + `data-motion-mode` listener, DPR cap, explicit canvas `width`/`height` attrs, ≤4ms frame budget, static frame under reduced motion) or use the cheaper trick: **paint noise once, animate the baked bitmap via CSS transform**. Pick per primitive. And ban animated `filter`/`backdrop-filter` outright — `bloom` must be faked with pre-baked radial-gradients, or 4K repaints will cook the phone.
- **Reduced-motion has a hole: one-time events.** Every spec covers ambient loops; none covers *triggered* motion — the Crystallize ripple, the PR gold bloom, signature triggers. A one-time 800ms bloom is still motion. Spec: under veto, all triggered events collapse to an **opacity-only ≤150ms settle, no transform/scale**.
- **New tokens must inherit house rules explicitly**: every `--atmo-*` from new primitives goes through `var(--x, <Crystalline fallback>)` (existing stylelint rule extends), oklch strings only in JSON, no hex, `signaturePhenomenon` colors are token refs — and the gold PR bloom must be checked against focus-ring and state-hue collision (rule 10 redundant-cue survives a gold flash over a streak-gold tint).
- **Particulate density must scale by viewport area** or 3840 gets 9× the particles of 1440; at 320px, see (b)4 — decide whether particulate even mounts <768px.
- Unaffected but verified: 44px targets, roving-tabindex radiogroup, sibling-actions — all live in the switcher (seed gate 7), untouched here; atmosphere adds no interactives, no DOM-nesting risk, stays `aria-hidden`.

---

## (d) The ONE highest-impact change

**Reframe the entire expansion as crystalline optics: phenomena, never creatures — and enforce taste by construction.**

Every new primitive is an optical phenomenon rendered through the facet/refraction/caustic vocabulary the brand already owns: `particulate`, `caustics`, `light-shafts`, `aurora-ribbon`, `star-field`, `fog-band`, `chromatic-facet`, `ring-pulse`, `bloom`. The enforcement is structural, not a review note: **the closed renderer has no arbitrary-geometry primitive** — no path data, no inline SVG shapes — so a whale is *unauthorable in the format*, forever. Fail-closed becomes taste-closed.

The founder's subjects all survive translation, better: Deep-Ocean Whale-Song Vault = caustics + a slow `ring-pulse` — light rings propagating like sonar (that's the impossible thing: light moving at the speed of sound). "Physically-correct rainbow" → **physically-motivated dispersion caustic**: the hue *order* (red-out/violet-in) is baked into the renderer; the world supplies only angle/spread/intensity scalars. Honest physics, no kitsch. The swan — the one silhouette that genuinely belongs to the brand — is relocated to the only place a figurative mark is premium: the **Crystallize artifact itself**, a faceted swan crystallizing in the above-content layer, one-time, reduced-safe.

One move kills the clip-art risk, the asset pipeline, the impossible rainbow, and the "no two worlds share a soul" problem — and makes every world unmistakably SwanStudios at a 100ms glance, because all phenomena share one light physics.

**Sequencing:** this reframe lands **before Slice 2** (it defines the primitive set Slice 2 builds); determinism + crossfade color space land in Slice 2; luminance caps + composite contrast fixture land in Slice 3; flagship signatures are Slice 3 polish.

---

## (e) What a design-savvy competitor out-builds here

1. **Restraint.** They ship 5 perfectly tuned worlds; we ship 18 with a zoo of primitives. They win the screenshot war on tuning density, not count — every mediocre world we publish is their marketing.
2. **Determinism + oklch fades, day one.** Both are nearly free; both read as craft; the spec currently has neither.
3. **Opt-in pointer/tilt micro-parallax** — one layer, ≤0.5% amplitude, hard-vetoed. It's the cheapest "alive" trick that exists, and our fixed layer is inert behind glass without it. Offer it per-world, default off.
4. **Solar-reactive worlds.** We already have `data-daypart`; the doc lists time-of-day as an *open question*. They'll commit — light shafts tracking local sun — while we're still asking.
5. **They would never render the dolphins.** If we do, they get to be the adults in the comparison post.
