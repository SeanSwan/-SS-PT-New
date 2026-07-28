# SWAN WORLD ENGINE — Comprehensive Build Handoff

- **Date:** 2026-07-12 · **Author:** Fable (claude-fable-5), Final Decider · **Status:** READY FOR BUILDER AGENT
- **Commissioned by:** Sean (CEO), directive 2026-07-12: expand the Swan Design Brain so it can generate intense, beautiful, award-tier themed-world designs — "realistic websites, cinematic websites, tiny miniature cities, James Webb space, glaciers, mountains, jungles, waterfalls, caves, voxel gaming, Tron, cyberpunk, neon metropolitans, alien worlds" — pulled at random when asked, tied to the psychology of websites.
- **How to use this file:** paste it (or point the agent at this path) as the FULL work order for a builder agent. It is self-contained. The agent builds exactly what is specified here, in Fable's voice and taste, not its own. Where the agent must exercise judgment, this doc names the quality bar and gives gold-standard exemplars to match.

---

## 0. Mission, identity, and the one architectural law

You (builder agent) are extending the SwanStudios **Design Brain** at `docs/ai-workflow/design-brain/`. Audit finding (2026-07-12, verified): the brain currently knows exactly TWO worlds — Crystalline Swan (product) and Cyberforest (Sean-only operator) — and its motion doctrine is a deliberate *restraint system* (parallax ≤0.4, one R3F "surgical accent" max, one signature moment per page). That restraint is CORRECT for the production app and you will not weaken it.

**The one architectural law of this build: you are adding a LICENSED LANE beside the restraint system, never loosening the restraint system itself.** The World Engine is a new, explicitly-gated creative tier (M4 "Experience") plus a themed-world catalog, a technique arsenal, and a psychology layer. Product surfaces (dashboards, storefront checkout, Swan Coach, onboarding) remain untouched, capped at M0–M3, Crystalline Swan only. If any change you are about to make would alter how an existing product surface is designed, stop — you have left your lane.

Non-negotiables that survive in EVERY world and at EVERY motion tier, including M4: reduced-motion static storytelling (the story must survive with zero motion), three performance tiers (full/lean/reduced) in the same file, WCAG 4.5:1 text contrast, 44px touch targets, no autoplay audio, no flashing >3/sec, LCP ≤2.5s poster-first, battery guards (pause off-viewport, teardown on unmount), and rule 43 (`css`` ` helper for interpolated shared style fragments).

## 1. Read these files FIRST, in this order

1. `CLAUDE.md` — the operating rules. Rules 1–11, 22–25, 40, 43, 64, 67 bind you.
2. `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` — source of truth; wins every conflict.
3. `docs/ai-workflow/design-brain/index.md` — the folder law: every file you add gets a row there in the same pass.
4. `docs/ai-workflow/design-brain/design.md`, `motion.md`, `cinematic-pages.md`, `website-archetypes.md`, `anti-patterns.md` — the doctrine you are extending. Match their voice: dense, tabular, rule-per-line, every rule with a WHY.
5. `.claude/skills/swan-design-router/SKILL.md` — the router you will upgrade.
6. `.ai-workflow/coordination/claude.lane.md` + `codex.lane.md` + `review-queue.md` — Rule 67 live coordination. Read the other agent's lane before every edit session; claim your files in your own lane block; never `git add -A`.

## 2. Coordination and safety rules (hard requirements)

- **Branch:** work on a fresh branch `<agent>/world-engine-<date>` off current `origin/main`. Do NOT push to main; Sean gates the push.
- **Rule 67:** prepend a session block to your lane file claiming the exact file paths below before editing. Release the claim when done.
- **Docs-only slice.** You create/edit markdown docs and ONE skill file. You write NO runtime code, NO frontend components, NO backend changes. The factory skill (deliverable 7) *describes* a process; it does not ship components.
- **Commit style:** `docs(design-brain): <slice>` per file-group; commit per deliverable so review is cheap.
- **No secrets, no PII** in any doc (rule 44). No real client names — IDs/roles only.
- **Do not touch:** `design.md` §1–28 substance, `anti-patterns.md` bans, `qa-gates.md`, any `adapters/` file except the one-line pointers specified below, anything outside `docs/ai-workflow/design-brain/`, `.claude/skills/swan-design-router/SKILL.md`, and the new skill directory.

## 3. Deliverable 1 — `docs/ai-workflow/design-brain/worlds.md` (the themed-world catalog)

The heart of the engine. A catalog of **18 worlds in 5 families**, each a complete, immediately-usable design direction. Header block matching the house style (Date / Author: "Fable via builder agent, per SWAN-WORLD-ENGINE-BUILD-HANDOFF-2026-07-12" / Status: CANONICAL within Design Brain scope / Authority chain: SWAN-CINEMATIC-DESIGN-SYSTEM.md > design.md > this file).

### 3.1 The two palette laws (write these into the doc preamble verbatim in spirit)

- **Law A — Swan-Tinted World.** The world supplies the *setting* (imagery, atmosphere, media, particles); all UI chrome — buttons, text, glow, focus rings, panels — stays on Crystalline Swan tokens. Dual-Button Glow intact. **Required for anything on a SwanStudios-brand surface** (sswanstudios.com marketing pages, brand films, Content Studio outputs published under the Swan name).
- **Law B — Licensed Departure.** The world runs its own curated native palette (5–8 named colors with roles, defined in the world entry). Allowed ONLY for: world-factory gallery outputs, campaign microsites not under Swan chrome, client/agency demo work, and internal experiments. Still dark-first by default, still WCAG 4.5:1, still token-with-fallback discipline (`var(--world-*, #hex)`).
- **Galaxy-Swan clarification (write this in, it will otherwise paralyze reviewers):** the retired Galaxy-Swan *brand tokens* (`#0a0a1a`, `#00FFFF`, `#7851A9`) remain banned **on SwanStudios-brand surfaces**. A Law-B cyberpunk/Tron world legitimately uses electric cyans and purples of its own naming — that is not a Galaxy-Swan resurrection. The ban is about the retired brand identity, not about the colors existing in a non-Swan world.

### 3.2 World entry schema (every world gets ALL of these fields)

| Field | Content |
|---|---|
| Name + family | evocative two-word name |
| Mood words | 3–5, the contract every later choice is checked against (per cinematic-pages.md §1) |
| Palette law | A, B, or "A on Swan surfaces / B in the factory" |
| World palette | Law B worlds: 5–8 named colors w/ hex + role. Law A worlds: which Swan tokens dominate and in what ratio |
| Atmosphere recipe | the z-stack: background world, midground, foreground, particle/weather layer; light source + direction; fog/depth treatment; grain % |
| Motion language | how this world MOVES — pacing adjectives + which techniques (by `techniques.md` ID) are native to it, and the world's signature transition |
| Typography lean | which of the 4 Swan faces leads (Law A) or a named face *category* (Law B — e.g. "extended geometric sans," never a specific rights-encumbered font demand) |
| Signature techniques | 2–4 IDs from `techniques.md` this world is built around |
| Seedance seed brief | one ready-to-run paragraph for the hero asset, in `SWAN-ASSET-STORYBOARDING.md` E1 template language, including negative prompts |
| Psychology note | which principle(s) from `psychology.md` this world weaponizes and why it converts (2–3 sentences) |
| Licensed surfaces | where this world may ship |
| Reduced-motion still | what the zero-motion story of this world looks like (one sentence — the poster) |
| Anti-cheese line | the one way this world goes tacky, named explicitly, so builders steer away (e.g. voxel → "Minecraft clone," cyberpunk → "purple-pink wallpaper soup") |

### 3.3 The roster (build all 18; sketches below are Fable's taste — honor them)

**Family: NATURAL SUBLIME** *(awe via vastness + intricate detail; the family closest to Swan's own frozen-forest DNA)*

1. **Glacier Cathedral** — ice caves, aurora, deep blue light through frozen mass. *(FULLY WRITTEN EXEMPLAR — see §3.4; this is the quality bar.)*
2. **Evergreen Dominion** — endless pine forest from canopy height; mist banks between ridgelines; god rays; birds crossing frame as scroll-triggered accents. Cold greens + Frost White fog; Law A natural fit. Slow, patient motion — parallax mist layers, nothing darts.
3. **Emerald Canopy** — jungle interior: layered giant leaves, bioluminescent undergrowth accents, humidity haze, macro flowers. Denser and warmer than Evergreen Dominion; motion is dripping, unfurling, breathing.
4. **Cascade Vault** — waterfall + cave system: water as the light source, wet stone, spray particles, cathedral-scale caverns behind the fall. Scroll descends *into* the cave (vertical journey = the arc). Sound design opt-in only.
5. **Prairie Horizon** — hillside meadows, wildflowers, birds, huge sky; the wide-open counterpoint to the cave worlds. Horizon line as the layout's structural device; wind as the motion language (fields moving in waves at 0.2 parallax).
6. **Alpine Apex** — peaks above cloud line, thin cold air, summit light. Vertical scroll = ascent; altitude markers as C9 counters; the CTA lives at the summit. Gilded Fern as sunrise-on-snow accent works beautifully under Law A.

**Family: COSMIC** *(awe via scale; the James Webb lane)*

7. **Webb Deep Field** — JWST aesthetics: star fields with diffraction spikes, deep-field galaxy clusters, infrared oranges/golds against absolute black. Scroll = zoom deeper into the field (scroll-scrubbed sequence is native here). Numbers psychology: cosmic scale makes product metrics feel inevitable.
8. **Nebula Drift** — gas-cloud nurseries, volumetric color, slow rotation; particle swarms (T2) as the signature technique. The most shader-native world in the catalog.
9. **Exo Eden** — a beautiful alien world: twin moons, impossible flora, bioluminescent oceans, colors that read organic-but-wrong in a gorgeous way. Law B required (its point is a non-Earth palette). The "show me something nobody's seen" world.

**Family: CONSTRUCTED TECH** *(competence + desire; night-city energy)*

10. **Grid Runner** — Tron: light-line geometry on black, cycle trails, wireframe horizons, hard 90° camera moves. UI itself becomes the world (borders are light-lines). Law B; disciplined 2-color + black.
11. **Neon Meridian** — cyberpunk metropolis: rain, holograms, signage canyons, reflective streets. *(FULLY WRITTEN EXEMPLAR — see §3.4.)*
12. **Chrome Sovereign** — the sophisticated luxury metropolis: penthouse-at-dusk, brushed metal, glass towers, warm interior light against blue-hour city. The "wealthy golf client" world — Law A compatible (Sapphire + Gilded Fern are made for this).
13. **Signal City** — procedural cityscape flythrough (T3 procedural + T8 scroll-film): camera gliding through a generated city; the transcript-1 "fly through a 3D city" experience, formalized with perf tiers.

**Family: MINIATURE & PLAY** *(delight + charm; tilt-shift and toys)*

14. **Tiny Metropolis** — miniature city / tilt-shift: shallow depth of field, model-railway charm, tiny animated citizens as easter eggs. Sections of the page are city districts; nav is a map.
15. **Pocket Worlds** — floating micro-dioramas: each content section is its own tiny island/world orbiting in space, approached by scroll. Natural fit for feature walks (each feature = one diorama).
16. **Voxel Realm** — voxel gaming: chunky 3D blocks, satisfying build/break animations, sprite-sheet motion, game-HUD UI language. Mini-game easter egg (T10) is native here. Anti-cheese line matters most here.

**Family: CINEMATIC REAL** *(trust via film craft)*

17. **Film Frame** — photoreal cinematic: anamorphic framing, film grain, letterboxed hero moments, blocking-and-coverage storytelling; the "this is a movie" world for brand films. Kuleshov-cut dividers (C10 video-cut) native.
18. **Archive Editorial** — documentary/museum grade: large-format photography, captioned exhibits, restrained motion, editorial typography doing the heavy lifting. The most restrained world in the catalog — its inclusion PROVES the engine isn't just maximalism.

### 3.4 Two gold-standard exemplar entries (write these two IN FULL first; every other entry must match their density)

**GLACIER CATHEDRAL** *(Natural Sublime · Law A: "A on Swan surfaces / B in the factory")*
- **Mood words:** glacial, vast, luminous, patient, sacred.
- **Palette (Law A ratios):** Obsidian Black ground 50% → Midnight Sapphire/Royal Depth mass 30% → Ice Wing as *light-through-ice* 15% (glow edges, crevasse light, aurora band) → Frost White type 4% → Gilded Fern 1% (a single warm accent per act — low-sun glint). Arctic Cyan reserved for any data moments.
- **Atmosphere recipe:** BG = slow aurora band + ice-mass parallax still (0.25 multiplier); MID = C12 sapphire glass panels reading as cut ice slabs; FG = Frost White display type + CTA; PARTICLE = drifting ice crystals at 0.03 opacity + 3% grain. Light source: below-horizon blue with one act-boundary shift to gold (temperature arc per cinematic-pages.md §3). Fog: depth-fade on background masses only.
- **Motion language:** nothing hurries. Ambient 12–20s loops (aurora drift), narrative reveals at the slow end of `--motion-narrative` (700–900ms), one crevasse-descent scroll-scrub (T8) as the signature. Transitions: luma-through-white ("ice flare") act cuts.
- **Typography lean:** Plus Jakarta Sans display tightened −2% tracking; Cormorant italic for the sacred beats ("the mountain does not negotiate").
- **Signature techniques:** T8 scroll-film (descent into the crevasse), T2 particle field (crystals), T12 atmospheric system (aurora + god rays), T6 variable-font weight thaw on the hero word (weight 200→700 as ice "compresses").
- **Seedance seed brief:** "Slow dolly through a vast glacial ice cave, walls of deep sapphire-blue ice with internal luminosity, shafts of pale cyan light through the ceiling, drifting ice crystal motes, aurora glow visible through the cave mouth, no people, no text, photoreal with subtle fantasy luminosity, seamless loop closure, 8s. Negative: green tones, warm interior lighting, cartoon, lens flare kitsch, retired-brand cyan #00FFFF saturation."
- **Psychology note:** pure awe (vastness + accommodation) — awe slows perceived time and increases willingness to engage and share; the patient pacing *is* the persuasion. Peak-end: the gold light shift at Act 3→4 is the peak; the calm CTA is the end.
- **Licensed surfaces:** Swan brand films, hero/landing experiences (Sean-approved), factory outputs, campaign microsites.
- **Reduced-motion still:** one composed frame — crevasse light shaft on sapphire ice, headline set in the light.
- **Anti-cheese line:** goes tacky the moment ice becomes *frosted-glass UI decoration everywhere* — the world is the cathedral, not a blur filter.

**NEON MERIDIAN** *(Constructed Tech · Law B)*
- **Mood words:** electric, rain-slick, dense, alive, midnight.
- **World palette (Law B):** `--nm-void #060608` (ground), `--nm-signal-magenta #FF2E88` (signage/CTA), `--nm-current-cyan #23D5E8` (holograms/data), `--nm-sodium-amber #FFB13D` (street warmth, the humanizing 5%), `--nm-hologram-violet #9B5CFF` (depth accents), `--nm-wet-steel #1A1F2E` (surfaces), `--nm-rain-white #E8F0F8` (type). Discipline: magenta OR cyan dominates a scene, never both at parity; amber appears in every act (it's what keeps the world humane).
- **Atmosphere recipe:** BG = signage-canyon parallax with rain streaks (shader T1 or layered video); MID = wet-steel panels with hologram edge-light; FG = rain-white type + magenta CTA; PARTICLE = rainfall at two depths + steam. Light source: signage glow from above + reflection from below (double-source is this world's signature look). Reflections: every light source repeats, blurred, on the ground plane.
- **Motion language:** the city never sleeps but the *reader's lane is calm* — ambient neon flicker and rain live in the background layers; foreground responds crisply (120–200ms). Signature transition: "hologram re-materialize" (scanline + opacity) between acts. Glitch used ≤2 times per page or it becomes noise.
- **Typography lean:** extended geometric sans for display (category, not a named font), condensed mono for data/HUD moments.
- **Signature techniques:** T1 shader background (rain + refraction), T4 R3F scene (hovering hologram object, M4 only), T7 kinetic type (signage-style headline build), T12 atmosphere (rain/steam system).
- **Seedance seed brief:** "Rain-soaked neon metropolis street canyon at night, towering holographic signage in magenta and cyan, amber street-level light, wet asphalt mirror reflections, steam from vents, slow forward dolly, cinematic depth of field, no readable real-brand text, no people in foreground, seamless loop, 8s. Negative: daylight, pink-purple wallpaper gradient soup, cartoon anime style, readable trademarked logos."
- **Psychology note:** curiosity gap + processing disfluency — density and partial occlusion (steam, signage bokeh) make the eye *work*, which reads as depth and coolness for younger/enthusiast audiences; amber warmth prevents alienation. Von Restorff: the single magenta CTA against cyan-dominant scenes isolates the action perfectly.
- **Licensed surfaces:** factory outputs, campaign microsites, client/agency demos, Content Studio experiments. NOT Swan-brand surfaces without Sean's explicit exception.
- **Reduced-motion still:** one rain-frozen frame, signage bokeh, amber window light, headline in rain-white.
- **Anti-cheese line:** dies the moment it becomes a flat purple-pink gradient with "CYBER" in a chrome font — the world is *wet, layered, amber-warmed density*, not a Synthwave poster.

### 3.5 World-roulette contract (end of worlds.md)

Define the randomization behavior the router will invoke: when a task says "surprise me / random world / world roulette," pull 2–3 worlds from DIFFERENT families (never two siblings), present them as the router's standard concept directions (one per world), and always include the mandated restrained option (website-archetypes rule — Archive Editorial or a Law-A natural world qualifies). Random ≠ exempt: every roulette direction still writes the B2 arc and scene ledger.

## 4. Deliverable 2 — `docs/ai-workflow/design-brain/techniques.md` (award-tier technique arsenal)

Thirteen techniques, each with: **ID (T1–T13) · what it is · the awe it buys · minimum motion tier (M-budget) · perf budget · fallback tiers (full/lean/reduced) · a11y notes · stack notes (styled-components/R3F/GSAP/canvas) · when it's the WRONG tool.** Match motion.md's voice. The M-tier column is the licensing mechanism: techniques marked M4 are *illegal* below M4, which is how the restraint system stays intact.

1. **T1 Shader surface** (GLSL fragment background: rain, refraction, caustics, aurora) — M4. Budget <3ms/frame, DPR ≤2, `frameloop="demand"` idle. Fallback: video loop → still.
2. **T2 Particle field / swarm** (GPU-instanced points; text-to-particle assembly; crystal/star/rain systems) — M4 for swarms, M3 for ≤200-particle ambient fields. Fallback: sparse CSS particles → none.
3. **T3 Procedural generation** (cityscapes, terrain, starfields generated at runtime) — M4. Deterministic seed so QA is reproducible.
4. **T4 R3F full scene** (3D as scaffolding: hero worlds, orbiting products, dioramas) — M4 ONLY (below M4 the existing "surgical accent" rule holds). One canvas, `<Suspense>` + 2D fallback, still mandatory.
5. **T5 Scroll-scrubbed frame sequence** — M3 (already doctrinal; cross-reference cinematic-pages.md §8 rather than restating — one pointer, no duplication).
6. **T6 Variable-font animation** (weight/width/slant axes animated on scroll or hover) — M2+. Cheap, huge payoff; flag FOUT guard + `font-variation-settings` perf note (it is NOT compositor-only — budget it like a layout property, animate on few elements).
7. **T7 Kinetic / generated typography** (letterform builds, scramble, signage reveals, letterform pin-grids) — M2+ with the motion.md stagger caps; scramble effects get static equivalents (a11y).
8. **T8 Scroll-film** (the page as a continuous film: scene ledger + scrub + pins beyond M3 counts) — M4. Extends cinematic-pages.md; at M4 the pin cap rises from 2 to 4 and scroll travel to 20vh, BUT the scene ledger + static storyboard remain mandatory.
9. **T9 Audio-reactive / ambient sound** — M4, opt-in ONLY (explicit user gesture starts audio; visible mute; never autoplay). Visuals must be complete with sound off.
10. **T10 Playable moment** (mini-game, physics toy, easter egg) — M4. Must be skippable, never gate content or conversion, keyboard-operable.
11. **T11 3D product orbit** (generated/scanned model on a lit stage, scroll- or drag-orbited) — M3 as surgical accent, M4 as stage centerpiece.
12. **T12 Atmospheric system** (layered weather: rain, snow, mist, god rays, aurora; the world's "climate") — M3 at ≤2 layers, M4 unrestricted layers. Always transform/opacity composited layers, never filter-on-large-surface.
13. **T13 Living data** (data-driven generative visuals — real metrics rendered as constellations/growth rings/city lights) — M2+. The bridge technique: brings World Engine beauty back into product-adjacent proof sections while honoring the data-truth rule (real data only).

## 5. Deliverable 3 — `docs/ai-workflow/design-brain/psychology.md` (the why-it-converts layer)

Ten principles, each with: **what it is (2–3 sentences, cite the researcher/effect name) · where it already lives in Swan doctrine (map to B2 acts / C-patterns / motion tiers — this doc makes the implicit explicit, it does not invent a parallel system) · how the World Engine uses it · the failure mode when over-applied.**

1. **Awe** (vastness + need for accommodation — Keltner/Haidt): time-perception dilation, increased sharing/generosity. Act 1's emotional target, the Natural Sublime + Cosmic families' engine. Over-applied: awe fatigue — why one signature moment beats five.
2. **Curiosity gap** (Loewenstein): partial information compels resolution. Scroll itself is the mechanism; C3 sticky walks exploit it. Over-applied: clickbait feel, trust erosion.
3. **Von Restorff isolation:** the distinct item is remembered. The signature moment IS this principle; also the single-accent CTA discipline (Neon Meridian's magenta).
4. **Peak-end rule** (Kahneman): experiences are judged by peak + ending. Maps exactly to "CTA at Act 3→4 emotional peak" + calm Act-4 close. The World Engine's act-boundary temperature shifts are peak engineering.
5. **Aesthetic-usability effect:** beautiful interfaces are perceived as more usable and are forgiven more. The business case for the entire engine — and the warning label (beauty must never *replace* usability; QA gates still bind).
6. **Processing fluency vs. strategic disfluency:** easy processing = trust/clarity (dashboards, docs archetype); deliberate difficulty = depth/luxury/exclusivity (cinematic worlds, density done right). Name which lever each world family pulls.
7. **Goal-gradient effect:** motivation accelerates near completion. Progress indicators, onboarding funnels, XP bars; in scroll-films, act markers/progress affordances keep long pages feeling finishable.
8. **Zeigarnik effect:** open loops are remembered. Teaser beats early in the arc that resolve in Act 3 (set up a question in the hero; pay it off at the peak).
9. **Social proof + authority** (Cialdini): proof beats adjectives — already doctrine (real data, real footage, credentials rule); worlds must never bury the proof act under spectacle.
10. **Paradox of choice** (Schwartz): fewer options convert. One CTA per cinematic page, roulette capped at 2–3 directions, tier shelves at 3–5. The restraint system's psychological justification, stated plainly.

Close the doc with the **Psychology receipt**: any M3+ page names, in its scene ledger or pre-task receipt, which 2–3 principles each act is running. One line each. This is how "tied to the psychology of websites" becomes enforceable rather than vibes.

## 6. Deliverable 4 — `docs/ai-workflow/design-brain/experience-mode.md` (the M4 tier)

The licensing document. Contents:

1. **What M4 is:** the Experience tier above M3 — the page as a *place*. Everything in M2/M3 plus the M4-only techniques (T1–T4, T8–T10, unrestricted T12).
2. **What M4 relaxes** (explicit table, old cap → M4 cap): R3F surgical-accent-only → R3F may be scaffolding (one canvas still); signature moments 1/page → 1 *page-level* + 1 *per act*; pins ≤2 → ≤4; scroll travel 8–14vh → up to 20vh; parallax ceiling 0.4 → 0.6 (the hard 0.6 stays); simultaneous animating elements 3/viewport → 5.
3. **What M4 NEVER relaxes:** the §0 non-negotiables list, verbatim. Plus: the scene ledger + static storyboard are MORE mandatory at M4, not less; the first-frame rule (poster must sell alone) binds; conversion pages still get exactly ONE CTA.
4. **Licensing table** (surface × allowed?): product dashboards/Coach/checkout/onboarding = **NEVER** · Swan marketing/landing = M2–M3 default, M4 only with Sean's explicit per-page approval · brand films/campaign microsites = M4 eligible · Content Studio/experiments = M4 eligible · world-factory outputs = M4 native · client/agency demos = M4 eligible.
5. **The M4 gate ritual:** invoking M4 requires, in the task thread: the world (from worlds.md), the scene ledger, the psychology receipt, the perf-tier plan, and Sean's approval line for Swan-brand surfaces. No ritual → the build is M3 by definition.
6. **Perf & battery law at M4:** budgets scale (total JS for experience machinery ≤ 350KB gz in lazy chunks; sequence payloads per cinematic-pages.md §8; GPU <4ms/frame at M4), device-class gates (full/lean/reduced) decide tier at runtime, and lean tier of an M4 page must be a *good M2 page*, not a broken M4 one.

## 7. Deliverable 5 — stitching into the existing brain (small, surgical edits)

1. `index.md`: add rows for the four new files + the skill pointer, per the folder law. Standing: CANONICAL.
2. `motion.md`: add ONE pointer line at the end of §1: "A fourth licensed tier (M4 Experience) exists for non-product surfaces — rules in `experience-mode.md`; nothing in this file is relaxed by it on product surfaces."
3. `website-archetypes.md`: add matrix row + full section for **#21 Experience / World Showcase site** — arc: Mkt 4-act stretched; hero: world-native (per worlds.md entry); motion: M4; the archetype that hosts factory outputs, campaign microsites, and brand-statement pages. Include Fable brief + builder brief + Harness QA + Village questions like every other entry, and the composition rule: #21 embedded in another archetype does NOT promote the host to M4 — M4 never travels by inheritance onto product surfaces (this deliberately overrides the "chains inherit the max" rule for the M4 boundary; say so explicitly).
4. `cinematic-pages.md`: one pointer line in §5 caps table: "M4 pages use the extended caps in `experience-mode.md` §2."
5. `adapters/reviewers.md`: one line adding to the reviewer checklist: "M4 work: verify the M4 gate ritual artifacts exist and the surface is licensed per experience-mode.md §4; M4 techniques on an unlicensed surface = automatic REVISE."

## 8. Deliverable 6 — router upgrade (`.claude/skills/swan-design-router/SKILL.md`)

Surgical additions only (do not restructure the file):

1. **Load order:** add `worlds.md` / `techniques.md` / `psychology.md` / `experience-mode.md` to load-order item 4's topic-file list, loaded when the task is cinematic/experience/world-themed.
2. **World roulette:** new subsection under the ideation gate — triggers ("random world," "surprise me," "world roulette," any request for a themed/experience site), behavior per worlds.md §3.5, output = the standard 2–3 concept-direction format with `WORLD:` and `PALETTE LAW:` and `PSYCHOLOGY:` lines added to the direction template.
3. **M4 routing:** when a direction proposes M4, the router requires the experience-mode gate ritual and states the licensing-table verdict for the target surface in the receipt. Unlicensed surface → the router refuses M4 and offers the M3 version.
4. **Receipt extension:** add `WORLD:` (or "Crystalline Swan — default") and `MOTION BUDGET: M0–M4` lines to the mandatory pre-task receipt.

## 9. Deliverable 7 — `.claude/skills/swan-world-factory/SKILL.md` (the generation factory)

A new skill codifying the transcript-1 method ("design the prompt that designs the sites; get out of the model's way; verify; iterate") as a repeatable SwanStudios process. The skill DESCRIBES the run protocol; each run is Sean-initiated (token spend is real — the skill must say the agent never fires a factory run unprompted).

Contents:

1. **Purpose:** batch-generate N complete, self-contained experience sites (single-file HTML or minimal Vite bundles — factory outputs are NOT repo frontend code) across randomized worlds, for Sean to browse and pick winners.
2. **Run protocol:** (a) roll N worlds via roulette (different families); (b) for each: write logline + mood words + scene ledger + psychology receipt (compressed, in-file header comment); (c) build autonomously in parallel (subagents/workflow — one agent per site); (d) **three iteration passes per site** — after completing, re-enter with a fine-tooth hostile pass looking for design problems and opportunities to complexify/refine, fix, repeat ×3 (transcript-1's core quality lever); (e) self-verify in a real browser (Playwright/agent-browser: screenshot at scroll 0 + act boundaries, console clean, reduced-motion pass); (f) emit a gallery `index.html` linking all outputs with one-line world + technique credits.
3. **Output location:** `experiments/world-factory/<YYYY-MM-DD>/` — add this path to `.gitignore` in the same slice (rule 39; propose the ignore line, Sean approves). Outputs are throwaway until promoted; promotion into the real app goes through the normal router/receipt/QA pipeline.
4. **Constraints inherited:** every output honors the §0 non-negotiables even as a throwaway (reduced-motion, contrast, no autoplay audio); Law B palettes free; no real-brand assets; no stock photography; generated/procedural/CSS-drawn media only unless Sean supplies assets.
5. **What the factory is NOT:** not a bypass of the ideation gate for production surfaces; not a component library; not allowed to write into `frontend/`.

## 10. Build order and the iteration protocol (how YOU work)

1. Read §1 files → claim lane → branch.
2. Build in this order: `worlds.md` (exemplars first, then roster) → `techniques.md` → `psychology.md` → `experience-mode.md` → stitching edits (§7) → router (§8) → factory skill (§9). Commit per deliverable.
3. **Three hostile passes on your own work** (the same discipline the factory demands): after each file, attack it — Is any entry thinner than the two exemplars? Does anything weaken a product-surface cap? Does any world read as a tacky version of itself (check every anti-cheese line)? Would SWAN-CINEMATIC-DESIGN-SYSTEM.md win a conflict you accidentally created? Fix, then re-read once more cold.
4. **Fable-fidelity check:** before finishing, re-read §3.4's two exemplars, then spot-check three random entries you wrote. If they are listy/generic where the exemplars are opinionated/specific ("goes tacky the moment…" energy), rewrite them. The single most likely failure of this build is *schema-compliant blandness*. Taste is the deliverable.

## 11. Acceptance criteria (the review gate will check exactly these)

- [ ] All 18 worlds present, every schema field filled, no entry materially thinner than the §3.4 exemplars.
- [ ] Both palette laws + the Galaxy-Swan clarification stated; every Law-B palette has 5–8 named roles.
- [ ] T1–T13 each carry an M-tier license, perf budget, all three fallback tiers, and a "wrong tool when" line.
- [ ] All 10 psychology principles mapped to EXISTING doctrine anchors (B2/C-patterns/motion tiers) + the psychology-receipt rule present.
- [ ] experience-mode.md: relax table, never-relax list, licensing table, gate ritual — all four present; product surfaces NEVER row intact.
- [ ] M4 non-inheritance rule stated in archetype #21.
- [ ] index.md rows added; motion.md/cinematic-pages.md/reviewers.md pointer lines added; nothing else in those files changed (diff-verifiable).
- [ ] Router: roulette + M4 routing + receipt extension added without restructuring existing sections.
- [ ] Factory skill: Sean-initiated-only stated; 3-iteration-pass protocol; browser self-verification; gitignored output path proposed.
- [ ] Zero changes outside the files named in this handoff. Zero relaxation of any M0–M3 cap on product surfaces.
- [ ] Every new file: house-style header, authority-chain line, 7-star doc standard (rule 14).
- [ ] Rule 67 lane claimed/released; commits per deliverable; branch NOT pushed to main.

## 12. What NOT to do (each of these has burned us before)

- Do NOT "improve" existing doctrine while you're in the neighborhood (Karpathy surgical-changes principle; rule 37).
- Do NOT invent new Crystalline Swan tokens or modify the active palette — Law B worlds get `--world-*`-namespaced palettes; the Swan palette is untouchable.
- Do NOT resurrect Galaxy-Swan on any Swan-brand surface, and do NOT let fear of it strip legitimate cyans/purples from Law-B worlds (§3.1 clarification exists for exactly this).
- Do NOT write runtime code, components, or anything in `frontend/`/`backend/`.
- Do NOT weaken, footnote, or "except" the calm zones (motion.md §4) — operator and data surfaces stay calm forever.
- Do NOT name specific commercial fonts in Law-B worlds (categories only) or reference cloning specific sites/designers (cinematic-pages.md §1 deconstruction rule binds the factory too).
- Do NOT pad thin worlds with adjectives to pass review — if an entry is weak, make a decisive taste call (that is what "in Fable's vision" means).

## 13. Closeout requirements (when the build is done)

Per rules 41/57/60: run the closeout gate; report plain-English + technical summaries; list every file created/changed with line counts; state which acceptance boxes are verified vs. deferred; run the rule 38 hygiene check (this build should create ZERO temp artifacts); recommend the next slice (expected: triangle review of the new docs, then the first live use — a world-roulette concept run on a real surface Sean picks, or a first factory run of 5 sites).

---

*Authority note for the builder: where this handoff and any Design Brain file disagree, `SWAN-CINEMATIC-DESIGN-SYSTEM.md` > `design.md` > this handoff > your judgment. Where this handoff is silent, match the densest adjacent doctrine and flag the gap in your closeout rather than silently deciding.*
