# Kimi Design Brief — The Swan Rank Badge + Living Companion Progression System

- **Date:** 2026-07-22 · **Requested by:** Sean · **For:** Kimi K3 (FULL creative-direction control) · **Status:** brief for paid consult
- **Consult remit:** you are the lead designer. Architect the whole system — the rank/tier/prestige cadence, the badge visual language, AND the companion/pet ecosystem. Sean wants marvelous, collectible, alive. Go beyond the references.

---

## 0. The ask, in Sean's own words (so you feel the intent)

Sean has a level system (1–1000) with a living "crystal ring" already built (see §2). He now wants it to become a **ranked BADGE + living companion ecosystem**, "Swanified" from an Overwatch-style rank badge reference, and taken further:

> "Swanify these badges… take it to the next level and make it better. I like how Overwatch did their ranks, but I don't want to copy it — give it a Swan Studios spin. Blend **The Molt** (the badge whitens and refines into a crystalline swan as you climb — swans literally go grey→white as they mature) with **Crystal Growth** (the badge is a living gem that accretes facets). And: once you get to certain levels, your **AVATAR comes out and walks around your ring** — walking around it, climbing through it, or just hanging out. You can **choose which avatar**, and you **unlock different avatars** at certain levels. You should also **unlock cute little PETS/companions** — little cute friends that hang around, **like Final Fantasy, like the tiny guardian-spirit familiars that follow the magical-girl in that anime** [mahō-shōjo spirit companions], **a dash of Pokémon, a sprinkle of Disney, a bit of Overwatch.** Really cute. Full open creative control — make something marvelous."

**You have full creative control**, including expanding the palette/spectrums and inventing the companion cast, the rank names, and the cadence.

---

## 0.5. BIGGER CONTEXT — this feeds a game universe + must be highest-quality/potato-scalable

Two things reshape how you should design this badge/companion/element system:

1. **It is the seed of the "Swanverse" — an infinite good-vs-evil planet universe you build by leveling up in real life** (full lore: `docs/ai-workflow/brainstorms/swanverse-game-universe-vision-2026-07-22.md`). Leveling doesn't just make a prettier badge — it unlocks **companions, elements, and eventually whole PLANETS** the player develops and redeems. So design the badge/companion/element system as the **on-ramp to that universe**, with room to grow into planets/worlds. The **elements you design should map to planet/biome types** (fire planets, glacier planets, verdant planets…) so the element system and the future planet system are one coherent language.

2. **It builds on a ~60%-already-built RPG** (`docs/ai-workflow/brainstorms/swanstudios-rpg-game-2026-06-13.md`). CRITICAL for the companion design: **companion pets ALREADY EXIST in the codebase** — `CompanionPetService.mjs` has 5 species (crystal_dragon / iron_wolf / ember_phoenix / frost_swan / shadow_panther) × 6 evolution stages (~300 variants). The avatar is "You, crystallized" — a Crystalline Swan champion (Bronze Forge → Silver Edge → Titanium Core → Obsidian Warrior → Crystalline Swan). **Extend these — do not invent a competing pet/avatar silo.** Your cute-familiar cast should build on / evolve the existing 5 species and the Crystalline Swan champion, not replace them.

3. **STANDING QUALITY MANDATE (Sean):** highest visual quality is the ante, AND it must scale to **potato PCs**. Design tiered quality (Ultra→Potato) from the start — LOD, dynamic resolution, aggressive low-spec/2D fallback, per-tier particle/effect budgets, and a perf floor that guarantees a working (simpler) experience on the worst device. "Beautiful on a 4090 AND runs on a 5-year-old laptop." Bake this into every companion/element/badge treatment you propose (not just the ring's Full/Lean/Still).

## 1. What this system IS (the synthesis)

A **living rank emblem** that is three things at once:
1. **A ranked BADGE** — an escalating Crystalline frame around the level indicator (the Overwatch-style rank ladder, Swanified). Grey/raw at the bottom → crystalline-white → gold-radiant at the top. Ranks change the whole frame; sub-tiers add detail.
2. **A living CRYSTAL RING** (already built, §2) at the badge's core — the animated progress ring that evolves every level.
3. **A companion STAGE** — as the user ascends, a chosen **avatar** and unlocked **pets/familiars** appear in/around the badge, animated: walking the rim, climbing the facets, perching, idling. Cute, collectible, alive.

The whole thing is the **trophy of the training journey** and lives on the client home (and profile / leaderboard / share card).

## 2. What already exists (build ON this — don't discard it)

A `CrystalProgressRing` React + styled-components + inline-SVG component ships on a branch:
- Level-indexed engine (1–1000): dials are smooth functions of level; the ring evolves every level (continuous, no dead zone).
- Flowing purple↔cyan↔gold spectrum fill, electricity filaments circling on ONE master clock, a §4 dispersion fringe on the leading edge, escalating FX (aura, orbitals, faceted gems, twin counter-rotating band, inner glyph, progress-tip spark, and a radiant crown at L1000).
- 20 named eras every 50 levels. Numeral sanctuary scrim. Full/Lean/Still + reduced-motion. GPU-safe (transform/opacity; static geometry rotated — never animated stroke path data or SVG filters). ONE styled wrapper; dynamics via CSS custom properties.

The **badge frame wraps this ring**; the ring stays the animated centerpiece.

## 3. The reference (PRINCIPLE ONLY — Sean wants to BEAT it)

Overwatch 2's endorsement/rank badge ladder (Sean's reference images):
- **10 Ranks**, each a distinct **frame material + color** escalating grey → green → teal → purple → gold, with increasingly ornate metal frames, chevrons, and a crown motif at the top ranks.
- **5 sub-badges per rank** (a new sub-tier every 50 player levels), where the frame gains embellishment.
- A **player card**: hexagonal framed portrait + radiant gold crown at high tiers, "LEVEL 950", a rank title ("Mythic Architect"), and 3 stat circles below.

The lesson: Overwatch escalates **material and metal**. Nobody escalates **living light + a growing crystal + companions that inhabit the badge.** That's the SwanStudios opening. Their badge is inert; ours breathes, grows, and has little friends living on it.

## 4. The SwanStudios world you're designing inside

- **Brand:** "Enchanted Apex: Crystalline Swan" — a dark vault where light does the work. Frozen enchanted forest + deep-ocean luxury vault. The swan is expressed through **optical physics** (refraction, dispersion, caustics, facet edges), NEVER drawn as a cartoon mascot — EXCEPT: Sean is now explicitly asking for **cute companion creatures/avatars**, which is a NEW, deliberate exception to the "no creatures" rule for the COMPANION layer only (the badge frame + ring stay optical/crystalline; the companions are the cute layer). Flag how you reconcile "cute Pokémon/Disney companions" with "crystalline luxury vault" so it feels premium-cute, not childish — this tension is the key design problem.
- **Palette (base):** Midnight Sapphire #002060 · Ice Wing #60C0F0 · Wing Purple #8B5CF6 · Swan Lavender #4070C0 · Gilded Fern gold #C6A84B · Frost White #E0ECF4 · Obsidian #0A0A0F. Banned: Galaxy-Swan #0a0a1a/#00FFFF/#7851A9. You may add named exotic ascension spectrums for high ranks.
- **The Molt** is canon-perfect: real swans mature grey→white. Use it — the badge/companion literally refines from a grey cygnet toward a radiant crystalline swan.

## 5. What we need you to DESIGN (deliverable)

### A. The cadence architecture (Sean left this to you)
Design the exact rank/sub-tier (and optional **prestige** past 1000) math that evenly and satisfyingly divides 1000 levels. Sean's instinct was "ranks every ~100, sub-tiers every ~10" (≈10×10=100 states) but explicitly wants YOUR take — propose the cadence you think is best (could be non-uniform: faster early rewards, rarer high ranks). Name every rank. Say what changes at a sub-tier vs a rank vs a prestige.

### B. The badge frame visual language
For each rank: the frame silhouette (hexagon/shield/crest/organic-crystal?), material/color, embellishments, and the crown/wing motif at the top. How it wraps the existing ring. How sub-tiers accrete detail without a full reskin. The **Molt** mapped onto the frame (grey→white→radiant). The **Crystal Growth** mapped onto it (facets accreting). Describe the **top-rank / L1000 ultimate badge** in loving detail.

### C. The companion ecosystem (the exciting part)
- **Avatars:** what are they (crystalline swan forms? guardian figures? the user's chosen persona?)? How does the user pick one? How do avatars unlock by level? How does an avatar "walk around / climb through / hang out" on the badge without being distracting on a data dashboard?
- **Pets/familiars:** design a starter CAST of cute companions (name + look + personality + the "mini spirit-familiar / Pokémon / Disney" vibe, rendered in Crystalline style — think tiny crystal-cygnets, ice-sprites, aurora-wisps, frost-foxes). How they unlock. How they idle/animate. How many can be shown at once.
- **The reconciliation:** how does "cute companions" stay premium and on-brand (luxury crystalline vault), not clutter or kiddie? This is the make-or-break.
- **Collection surface:** where does the user see/manage what they've unlocked (a companion drawer? a "menagerie"?). (Concept only — not asking for the full UI.)

### D. Motion & performance (this renders on a DATA dashboard)
- Everything GPU-safe (transform/opacity). ONE master clock discipline (companions phase-lock or use minimal independent idle loops — you decide, but justify against battery). SVG-first; say where sprite-sheets/Lottie/tiny-PNG companions are warranted vs pure SVG.
- Full/Lean/Still quality modes + a reduced-motion still that is itself beautiful (companions freeze in a charming pose, not vanish).
- Companions must never occlude the level number or the accessible progress readout.

### E. Build order
What to prototype FIRST to prove the system (likely: badge frame wrapping the ring for ~3 sample ranks + the L1000 ultimate + ONE companion doing its idle). Then the expansion order.

### F. Product hooks (Kimi, add these if they strengthen it)
Unlock moments, the "you leveled up — new companion!" celebration beat, a shareable badge card (Sean wants "something people screenshot"), and how this drives the SwanStudios retention loop (train → level → unlock → show off). Rank against the Product Core Loop.

### G. Elemental system (added by Sean — design this in)
Sean wants **plasma + electricity in different colors and variations**, and **the classical ELEMENTS woven through the system — earth, fire, air, water (and beyond: ice, lightning/plasma, light, void…).** Design how elements fit:
- **Are elements a second axis** (e.g. each RANK or each companion has an elemental affinity, giving a matrix: a Fire-Sovereign badge vs a Water-Sovereign badge), or a **progression of states** (climb through elements as you ascend: earth → water → ice → air → fire → lightning/plasma → light), or **cosmetic variants** the user can choose/unlock (recolor the ring/electricity: cyan plasma vs violet plasma vs gold-fire vs emerald-earth)? Recommend the model that's most collectible + coherent, and say why.
- **Electricity/plasma variations:** define a set — e.g. Ice-plasma (cyan), Void-plasma (violet), Solar-plasma (gold), Ember (fire-orange, used sparingly since red-adjacent is the danger reserve — reconcile this), Verdant (earth-green), Aero (pale air-white). Each changes the ring's filament color + behavior (fire crackles upward, water flows smooth, air drifts, earth is slow/crystalline, lightning is sharp/fast). Keep them GPU-safe (recolor + speed/behavior params on the SAME one-clock engine, not new animators).
- **How elements interact with the Molt + Crystal Growth + companions:** does a Fire companion look different from an Ice companion? Do elements tint the badge frame? Keep it premium, not a rainbow mess — the §4 dispersion discipline and the "one violent flourish" restraint still apply; elements are *chosen character*, not chaos.
- **Danger-red reservation:** the palette reserves red for destructive/alarm states. Fire/ember elements skirt this — define how you keep fire feeling like warm gold-orange energy, not an error state.

Give: the element set, the axis decision (affinity vs progression vs cosmetic vs a blend), the per-element ring/electricity/companion treatment, and how unlocking/choosing elements works alongside ranks.

## 6. Constraints (design freely, inside these)
- Stack: React 18 + TS + styled-components + SVG (+ sprite-sheet/Lottie for companions if you justify it). No MUI, no Tailwind.
- Privacy: this is committed to the repo — no real user PII; IDs/roles only.
- A11y: badge is decorative; the real progressbar + level number stay accessible; companions never trap focus or block the number; color never the sole signal.
- Cute-but-premium: the #1 risk is the companions making a luxury product feel like a mobile-game cash-grab. Solve that.

Be bold, be adorable, be marvelous. Sean gave you the keys — design a badge people rank up for and companions people fall in love with.

---

## KIMI K3 VERDICT (2026-07-22, high effort, ~$0.077) — SHIP-WITH-CHANGES

Full review: `AI-Village-Documentation/kimi-consults/swan-badge-companion-2026-07-22.md`. The bones are good (build-on-existing, one-clock, tiered quality, reduced-motion dignity). Apply these before/while building — they are now BINDING design law for this system:

### ⭐ THE #1 FIX — Companion Art-Direction Charter (the premium-cute answer)
The make-or-break was delegated with no anchor. Kimi's charter (adopt verbatim):
- **Shared geometry DNA:** companions are built from the SAME facet primitives as the ring + badge (hexagonal/prism facets, crystalline planes, internal glow, **no outlines, no soft cartoon shading**). A crystal-cygnet = a low-poly faceted form with Ice Wing core light through Frost White planes — NOT a rounded chibi bird.
- **Cute through PROPORTION + MOTION, not style:** oversized head-to-body ratio, tiny waddle gait, head-tilt idle, curious blink. Cuteness lives in animation + silhouette, so the rendering style stays 100% Crystalline-vault. (That's the Disney/Pokémon lesson that transfers — appeal is motion, not art style.)
- **Restraint budget:** max 2 visible companions; internal-glow lighting only (NO drop shadows — shadows on a dark vault = mud); eyes = two small facet-glints; no mouth lines.
- **The Molt applies to companions too:** your first familiar is a gunmetal cygnet-sprite that whitens as IT levels — companion system mirrors the badge system (feels authored, not bolted on).

### Other binding changes
1. **Low-tier Molt = gunmetal/brushed-pewter + a single living cyan filament, NOT grey.** Grey reads as disabled/locked and shows the newest (most churn-prone) users the ugliest artifact. Overwatch never makes Bronze ugly — just bronze. Every rank, including L20, must be gorgeous. Add a min frame-luminance floor per rank vs the obsidian vault.
2. **Data-driven architecture (protects the ≤300-line rule):** `ranks.config.ts` + `companions.config.ts` (typed data), ONE generic `<BadgeFrame>` + `<CompanionSprite>` renderer, variants as props/tokens. Procedural tinting over unique assets — cap unique-asset count (100 badges × 300 pets × 6 elements = 1,800+ variants = art-pipeline bankruptcy otherwise).
3. **Mobile culling + breakpoint matrix + simultaneous-FX budget:** 320/375/414 → badge min 96px, companions culled to zero (or one static ≤20px perched familiar), rim-walking off, Lean default. 768/1024 → one companion, Full. 1440+ → full cast within budget. Max 2 companions + max 3 concurrent motion systems, always (or the L800 badge is a slot machine).
4. **Tokens + a11y:** `var(--token, #fallback)` names for all colors; map the ring's cyan explicitly to Ice Wing `#60C0F0` (never near retired `#00FFFF`). Badge-as-button must be a SIBLING to the progressbar, never an ancestor (nested-interactive/ARIA trap); 44px, focus ring, `role=button`+label. Unlock = `aria-live` polite announce. Elements distinguished by shape/behavior, not hue alone.
5. **Tiered means tiered UP:** Ultra tier = **R3F/WebGL with real dispersion/caustic shaders** (streamer/screenshot flex); Lean/Still = the existing SVG engine. Potato path stays the floor.
6. **Competitor out-builds to steal:** reactive companions (react to each other + to your real workout state — celebrate on log, sulk after a missed week), a dedicated **share-card RENDERER** (server/canvas composition, not a screenshot), and **sound + haptics** on unlock beats.

### Build-first order (Kimi): the Art-Direction Charter → one generic BadgeFrame wrapping the ring for ~3 sample ranks + L1000 → ONE companion doing its idle (gunmetal cygnet) → then expand. Data-driven from file one.

**Status:** design doctrine settled. NEAR-TERM buildable = badge frame + config architecture + one companion, on the existing ring engine. The planet/universe layer stays post-December (`swanverse-game-universe-vision-2026-07-22.md`). Next design step when Sean is ready: `story` skill to grow the universe, and/or `swan-design-router` to build the badge frame from this doctrine.
