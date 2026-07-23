# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/brainstorms/swan-badge-companion-progression-2026-07-22.md
**Seed:** (none)
**Tokens:** 3800 in / 4375 out · **Cost:** ~$0.0770 · **Wall:** 211.4s

---

# Kimi K3 — Hostile Design + Front-End Review
**Artifact:** Swan Rank Badge + Living Companion Progression brief (2026-07-22)

---

## (a) VERDICT: **SHIP-WITH-CHANGES**

This is one of the better briefs I've reviewed — it builds on existing code instead of greenfield-ing a competing silo, it names the make-or-break tension (cute vs. luxury), and the potato-scalability mandate is baked in rather than bolted on. But it has four holes that will produce bad front-end outcomes if we ship as-is, and one of them is the single hardest problem in the document getting zero guardrails.

---

## (b) Design weaknesses, most-severe first

**1. The #1 risk is identified, then fully delegated with no art-direction anchor.** §4 and §6 both flag "premium-cute is make-or-break" — and then hand the consultant nothing. No silhouette language, no eye-proportion discipline, no outline/fill rules, no reference for what "premium-cute" means inside a crystalline vault. "Pokémon + Disney + mahō-shōjo" as the only anchors points *directly* at the mobile-gacha cash-grab look Sean fears. A brief that names its biggest risk and provides no style charter for it is outsourcing the verdict on its own product. This is the document's biggest failure.

**2. The Molt's grey→white arc makes the majority experience the ugliest one.** Real user distribution is a pyramid — most users live at L1–150 for months. "Grey/raw cygnet" at the bottom collides with two things: (a) **disabled-state UI convention** — grey reads as inactive/locked, and (b) **retention logic** — you're showing your newest, most churn-prone users the least beautiful artifact at the exact moment you need to hook them. Overwatch never makes Bronze ugly; it makes it *bronze* — real material, real craft. The brief never once asks "what does the L20 user see, and is it gorgeous?" The Molt needs a reinterpretation: grey-cygnet should be **gunmetal/brushed-pewter with a single living cyan filament** — refined restraint, not absence of polish.

**3. Grey-on-Obsidian contrast.** Molt-stage grey frames on `--obsidian` (#0A0A0F) vault backgrounds will be near-invisible or muddy. The frame is decorative (a11y-exempt), but a rank badge you can't *see* fails its entire purpose. Brief needs a minimum frame luminance floor per rank against the vault background.

**4. Zero mobile-density spec for the companion layer.** This is a data dashboard at 320px. An avatar "walking the rim" plus two familiars on a ~120px badge = 10–14px sprites that read as visual noise and make the badge look broken, not alive. The brief specifies "companions never occlude the number" but says nothing about **culling by viewport**. There is no defined minimum badge size, no per-breakpoint companion budget, no "at <768px companions retreat into the menagerie" rule. This will ship cluttered on the devices most clients actually use.

**5. Combinatorial explosion with no asset budget.** 10 ranks × 10 sub-tiers ≈ 100 badge states, + existing 300 pet variants, + an element system that — if the affinity-matrix model wins §G — multiplies badge tints × ranks and pet recolors × species × stages (300 pets × 6+ elements = 1,800+ variants). The brief asks the designer to *choose* the element model but never states a production-cost ceiling. Without a "procedural tinting over unique assets" mandate, this is an art-pipeline bankruptcy. The correct default is already implied by the one-clock engine (recolor + behavior params on shared geometry) — say it out loud and cap unique-asset count.

**6. Signature moment: present, but threatened by accumulation.** The rim-walking avatar IS the signature moment — genuinely novel, nobody else has it. But §C wants avatars *and* multiple pets *and* elemental plasma *and* the existing ring FX (aura, orbitals, twin band, glyph, spark, crown) all at once. The "one violent flourish" restraint is cited but the feature list violates it. At L800 with everything unlocked, this badge is a slot machine. The brief needs an explicit **simultaneous-FX budget** (e.g., max 2 companions visible, max 3 concurrent motion systems) so the signature moment survives contact with the rest of the system.

**7. No layout context.** Where does this badge live on client home — hero slot, header widget, profile card? Size range? What hierarchy does it hold against stats/streaks/CTAs? A trophy with no pedestal spec gets placed wherever there's room and dies there.

---

## (c) Implementation-fidelity attacks

- **Tokens.** House rule is `var(--token, #fallback)` — the brief ships a hex palette with **no token names**. Fix now: `--midnight-sapphire`, `--ice-wing`, `--wing-purple`, `--swan-lavender`, `--gilded-fern`, `--frost-white`, `--obsidian`, each consumed as `var(--ice-wing, #60C0F0)`. Also: the existing ring's "cyan" must be explicitly mapped to Ice Wing `#60C0F0`, never anywhere near retired `#00FFFF` — the brief bans Galaxy-Swan correctly but doesn't close the loop on the legacy ring's cyan channel. "Swan Lavender" naming `#4070C0` (a blue) is a naming bug that will confuse every future consumer.
- **44px + interaction model missing.** §C speculates about a companion drawer/menagerie but never defines the badge's interaction model. If the badge is the entry point (tap badge → menagerie), it must be a single 44×44px+ target, keyboard-focusable with a visible focus ring in `--ice-wing`, with `role="button"` + label — while the inner progressbar stays a separate, non-nested accessible element. Badge-as-button wrapping a progressbar is a **nested-interactive / invalid-ARIA trap** waiting to happen. Spec it: button sibling to progressbar, never ancestor.
- **Responsive matrix absent.** Required behavior per breakpoint: **320/375/414** — badge min 96px, companions culled to zero (or one static perched familiar at ≤20px), rim-walking disabled, Lean mode default; **768/1024** — one companion, Full mode; **1440+** — full cast within the FX budget; **2560/3840** — SVG scales cleanly (good), but sprite-sheet companions will raster-blur at 3–4× DPR — if sprites are used, mandate @2x/@3x sources or SVG-only. None of this is in the brief.
- **Master-clock discipline: commend, one caveat.** One clock, phase-locked companions, transform/opacity only, static geometry rotated — this is exactly right and I co-sign it. Caveat: sprite-sheet/Lottie companions (§D permits them "if justified") introduce independent frame loops that *break* the one-clock discipline unless stepped from the same rAF. Spec: sprite frame-index driven by the master clock, not Lottie's internal timeline.
- **Reduced-motion: good.** "Companions freeze in a charming pose, not vanish" is the correct call — commend. Add: `prefers-reduced-motion` must also kill the plasma behavior-param variations (fire crackle, lightning sharpness), which are exactly the vestibular triggers.
- **≤300 lines/file: at severe risk.** A 5-species × 6-stage × element-variant companion system plus 100 badge states in React components will produce 1,500-line god-files unless the brief mandates **data-driven architecture**: badge/companion definitions as typed config/data modules (ranks.config.ts, companions.config.ts), one generic `<BadgeFrame>` and `<CompanionSprite>` renderer, variants as props/tokens. Write this into §6 or the build will violate house rules by file three.
- **styled-components: correct pattern already specified.** One styled wrapper + CSS custom properties for dynamics — right approach; extend the same rule to companions and the badge frame, no inline `style={{}}` animation props.
- **A11y beyond the progressbar.** Unlock celebrations ("new companion!") need a polite `aria-live` announcement, not just visual confetti. Element identity must never be color-only (§6 says this for the badge — extend it explicitly to elements: fire vs. ice needs shape/behavior distinction, not hue alone).

---

## (d) The ONE highest-impact change

**Write the Companion Art-Direction Charter before anything else is designed.** It's the declared make-or-break and it currently has zero content. One page, non-negotiable rules:

- **Shared geometry DNA:** companions are built from the *same facet primitives* as the ring and badge frame — hexagonal/prism facets, crystalline planes, no outlines, no soft cartoon shading. A crystal-cygnet is a low-poly faceted form with internal glow (Ice Wing core light through Frost White planes), not a rounded chibi bird.
- **Cute through proportion and motion, not through style mismatch:** oversized head-to-body ratio, tiny waddle gait, head-tilt idle, curious blink. Cuteness lives in *animation and silhouette*, so the rendering style stays 100% Crystalline-vault. That's the Disney/Pokémon lesson that transfers — appeal is motion, not art style.
- **Restraint budget:** max 2 visible companions, internal-glow lighting only (no drop shadows — shadows on a dark vault are mud), eyes as two small facet-glints, no mouth lines.
- **The Molt applies to companions too:** your first familiar is a grey gunmetal cygnet-sprite that whitens as *it* levels — the companion system mirrors the badge system, which makes the whole thing feel authored instead of bolted on.

This single page converts "cute vs. luxury" from an unsolvable tension into a coherent system — cute creatures rendered in the vault's own material language. That is the premium-cute answer, and it should be in the brief, not discovered mid-consult.

---

## (e) Where a design-savvy competitor out-builds this

1. **Real-time 3D at the Ultra tier.** The potato mandate is right, but the Ultra tier is capped at SVG/CSS. A competitor ships React Three Fiber with genuine refraction, dispersion, and caustics shaders on the crystal, and our most premium tier — the one streamers and screenshotters have — looks flat by comparison. Fix: Ultra tier = WebGL/R3F ring with shader dispersion, Lean/Still = the existing SVG. Tiered means tiered *up*, not just down.
2. **Companion social/behavioral depth.** Competitor's pets react to *each other* (two familiars playing), react to user state (pet celebrates when you finish a workout in real time, sulks after a missed week), and have seasonal variants. Our brief's companions are animated ornaments. Reactive state is what creates the "I'm emotionally attached to my frost-fox" retention loop Sean actually wants.
3. **The share card as a render target, not a screenshot.** Competitor generates a server/canvas-rendered share image with the badge, rank title, and companion posed — designed composition, not whatever the dashboard looked like. §F mentions "something people screenshot" but doesn't spec a dedicated share-card renderer. Screenshot-bait is designed, not hoped for.
4. **Sound/haptics on unlock moments.** The level-up celebration beat is specified visually only. A single crystalline chime + haptic tick on mobile does more for the dopamine loop than another 200ms of particles.
5. **The low-ladder experience** (see b.2). A competitor who makes Bronze feel like a crafted object retains the users we lose while they're staring at a grey cygnet for their first three months.

---

**Bottom line:** approve the brief after adding (1) the Companion Art-Direction Charter, (2) the low-tier Molt reinterpretation (gunmetal-premium, not grey-disabled), (3) the mobile culling + breakpoint matrix with a simultaneous-FX budget, (4) token names with Crystalline fallbacks and the interaction/ARIA model, and (5) a data-driven architecture mandate to protect the ≤300-line rule. The bones — build-on-existing, one clock, tiered quality, reduced-motion dignity — are genuinely good. Don't let the consultant discover the cute-vs-luxury answer by accident; it's the whole ballgame.
