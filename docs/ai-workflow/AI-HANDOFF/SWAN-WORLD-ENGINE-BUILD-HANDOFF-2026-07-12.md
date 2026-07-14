# SWAN WORLD ENGINE — Comprehensive Build Handoff

- **Date:** 2026-07-12 · **Author:** Fable (claude-fable-5), enhanced by Codex hostile review · **Status:** V2 BUILDER SPEC — STRUCTURAL BLOCKERS REPAIRED
- **Commissioned by:** Sean (CEO), directive 2026-07-12: expand the Swan Design Brain so it can generate intense, beautiful, award-tier themed-world designs — "realistic websites, cinematic websites, tiny miniature cities, James Webb space, glaciers, mountains, jungles, waterfalls, caves, voxel gaming, Tron, cyberpunk, neon metropolitans, alien worlds" — pulled at random when asked, tied to the psychology of websites.
- **How to use this file:** point the builder at this path as the full work order. Preserve Sean's intent and Fable's specificity; repair contradictions rather than diluting the vision. The two gold exemplars remain the taste bar.
- **Effect tier:** T1 specification → T2 bounded local docs/ignored-experiment writes. **Execution owner:** Codex/Claude builder. **Verification owner:** independent hostile reviewer + Browser Harness. **Review by:** 2026-10-10. **Rollback:** revert the isolated branch; no runtime or production data is touched by Phase A.

---

## 0A. Hostile-review verdict and V2 repair contract
**Original verdict: REVISE.** The 18-world vision was strong, but five structural blockers could have produced a schema-complete system that was contradictory, unregistered, ambiguous beside Hermes safety tiers, and never proved in a browser.

| Blocker | V2 resolution |
|---|---|
| M4 overrode source docs that it declared supreme | Add narrow M4 licensed-lane pointers to both authoritative visual source docs; M0–M3 and every product rule remain unchanged |
| “M4 does not promote the host” created a leakage path | Live M4 never embeds on product surfaces; eligible non-product hosts inherit M4; product previews are inert M0 posters or pausable prerecorded M2 media |
| Technique IDs T1–T13 collided with Hermes T0–T4 command-effect tiers | Rename visual techniques WFX-01–WFX-13 and carry an explicit glossary |
| New factory duplicated the site generator and was absent from the operator registry | Make it a thin, manual-only batch orchestrator over the canonical single-site generator and register its T1→T2 boundary |
| Documentation acceptance could pass without one working output | Add Phase B: a deterministic five-family proof run with manifest, gallery, browser QA, independent review, and recursive P0/P1 repair |
**Fidelity contract.** Immutable: 18 named worlds, five families, Glacier Cathedral + Neon Meridian exemplars, anti-cheese specificity, licensed M4 boundary, and palette separation. Improvable: technology, identifiers, retrieval schema, evidence quality, accessibility, performance, QA, and coherence. Sean remains the final taste owner. The builder may not replace Fable's worlds with its own, but must correct anything that contradicts higher authority or cannot be verified.
**Glossary.**
- `WFX-*` = visual technique identifier.
- `M0–M4` = motion/experience budget.
- `Full / Lean / Still` = runtime quality mode; reduced-motion is a user preference that forces the static story.
- `B0–B3` = rendering backend rung, from semantic poster through frontier spatial.
- `T0–T4` = Hermes/Swan command effect and safety tier; never use these labels for visual techniques.
## 0. Mission, identity, and the one architectural law
You (builder agent) are extending the SwanStudios **Design Brain** at `docs/ai-workflow/design-brain/`. Audit finding (2026-07-12, verified): the brain currently knows exactly TWO worlds — Crystalline Swan (product) and Cyberforest (Sean-only operator) — and its motion doctrine is a deliberate *restraint system* (parallax ≤0.4, one R3F "surgical accent" max, one signature moment per page). That restraint is CORRECT for the production app and you will not weaken it.
**The one architectural law of this build: you are adding a LICENSED LANE beside the restraint system, never loosening the restraint system itself.** The World Engine is a new, explicitly-gated creative tier (M4 "Experience") plus a themed-world catalog, a technique arsenal, and a psychology layer. Product surfaces (dashboards, storefront checkout, Swan Coach, onboarding) remain untouched, capped at M0–M3, Crystalline Swan only. If any change you are about to make would alter how an existing product surface is designed, stop — you have left your lane.
Non-negotiables that survive in EVERY world and at EVERY motion tier, including M4: reduced-motion static storytelling; Full/Lean/Still runtime modes; WCAG 4.5:1 text contrast; 44px touch targets; no autoplay audio; no more than three flashes in any one-second period; poster-first LCP ≤2.5s, INP ≤200ms, and CLS ≤0.1 at p75; visible Pause Effects and Skip-to-Content controls for qualifying movement; off-viewport/hidden-tab pause; teardown on unmount; and rule 43 (`css`` ` helper for interpolated shared style fragments).
### 0.1 Rendering ladder — beauty survives capability failure
- **B0 Semantic Poster (unconditional):** real DOM heading, copy, CTA, navigation, and a world-native still. It must sell the page with JavaScript disabled.
- **B1 Cinematic Media:** CSS/SVG plus AVIF→WebP→JPEG/PNG and poster-first video. No GPU API required.
- **B2 Production Spatial:** Three.js WebGL2, directly or through an approved React-18-compatible R3F adapter after a separate dependency spike.
- **B3 Frontier Spatial:** WebGPU through an isolated Three WebGPURenderer, TypeGPU, or raw-WebGPU adapter. Experimental until adapter/device/pipeline creation, first render, context loss, performance, and fallbacks pass.
Selection uses successful initialization plus observed performance with hysteresis, never user-agent sniffing. Failure falls down the ladder without reload, blank output, lost content, or changed CTA. No canvas owns unique copy, navigation, pricing, legal text, form state, or conversion logic; decorative canvases are `aria-hidden`, and informative visuals have a DOM equivalent.
**Current dependency truth:** SwanStudios is React 18 and has Framer Motion, but no Three.js, R3F, Drei, GSAP, or TypeGPU dependency. This spec may define those lanes; no docs-only pass silently installs them. R3F, if later chosen before a React upgrade, must use the React-18-compatible major.
## 1. Read these files FIRST, in this order
1. `CLAUDE.md` — operating rules; product, privacy, coordination, and no-main-push constraints bind the whole build.
2. `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` + `SWAN-ASSET-STORYBOARDING.md` — visual and asset authority; V2 adds only a narrow M4 pointer to each.
3. `docs/ai-workflow/design-brain/index.md`, `design.md`, `motion.md`, `cinematic-pages.md`, `website-archetypes.md`, `anti-patterns.md`, `qa-gates.md` — doctrine being extended, never replaced.
4. `docs/ai-workflow/design-brain/adapters/cinematic-site-generator.md` — canonical single-site production contract; the batch factory must delegate to it.
5. `docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` + `FABLE-WORKFLOW-INTEGRATION-SPEC.md` + `FABLE-CONTEXT-COMPRESSION-PROTOCOL.md` — registration, ownership, stale-date, and progressive-disclosure rules.
6. `.claude/skills/swan-design-router/SKILL.md` — router to upgrade surgically.
7. `.ai-workflow/coordination/claude.lane.md` + `codex.lane.md` + `review-queue.md` — read the other lane before every edit, claim exact paths, never `git add -A`.
## 2. Coordination and safety rules (hard requirements)
- **Isolation:** do not switch the dirty shared root. Create `<agent>/world-engine-<date>` in an isolated worktree from current `origin/main`, then bring only this handoff into it. If the worktree cannot be created, remain on the current branch and use Rule 67 rather than moving user work.
- **Rule 67:** claim every exact path before editing and release only after fresh verification. Never `git add -A`; stage explicit paths only if Sean asks for a commit.
- **Phase A is docs/skills only:** Design Brain markdown, two surgical authority pointers, router, registry row, and one thin factory skill. No frontend/backend runtime code and no dependency installation.
- **Phase B is an ignored local proof run:** five self-contained experimental sites plus gallery/manifest/receipts. It may not write into `frontend/` or `backend/` and may not contact production services.
- **No secrets or PII:** repo/public data only; no real client names, health notes, payment data, credentials, private screenshots, or live identifiers.
- **Named scope:** the four World Engine docs; Design Brain index/motion/cinematic/archetype/reviewer/knowledge pointers; two visual source pointers; synchronized `design.md`/`design.html` runtime-quality terminology only; design router; world-factory skill; skill/operator registry; deterministic verifier + `world-roulette.v1` implementation/tests; desktop Karpathy-vault authority repair; this handoff. `anti-patterns.md` and `qa-gates.md` remain unchanged.
- **`.gitignore` boundary:** Sean's goal authorizes the first proof run. Add only `experiments/world-factory/`, verify it with `git check-ignore -v`, and reject all output if the rule is absent.

## 3. Deliverable 1 — `docs/ai-workflow/design-brain/worlds.md` (the themed-world catalog)
The heart of the engine. A catalog of **18 worlds in 5 families**, each a complete, immediately-usable design direction. Header block matching the house style (Date / Author: "Fable via builder agent, per SWAN-WORLD-ENGINE-BUILD-HANDOFF-2026-07-12" / Status: CANONICAL within Design Brain scope / Authority chain: SWAN-CINEMATIC-DESIGN-SYSTEM.md > design.md > this file).
### 3.1 The two palette laws (write these into the doc preamble verbatim in spirit)
- **Law A — Swan-Tinted World.** The world supplies the *setting* (imagery, atmosphere, media, particles); all UI chrome — buttons, text, glow, focus rings, panels — stays on Crystalline Swan tokens. Dual-Button Glow intact. **Required for anything on a SwanStudios-brand surface** (sswanstudios.com marketing pages, brand films, Content Studio outputs published under the Swan name).
- **Law B — Licensed Departure.** The world runs its own curated native palette (5–8 named colors with roles). Allowed only for non-Swan factory outputs, non-Swan campaign microsites, client/agency demos, and internal experiments. Still dark-first by default, WCAG 4.5:1, and `var(--world-*, #fallback)` disciplined. Sean's M4 approval controls intensity, not palette law: Law B never ships under Swan chrome; adapt the world through Law A instead.
- **Galaxy-Swan clarification:** electric cyan/purple remain legitimate hues in Law-B worlds, but the exact retired Galaxy-Swan hex values may appear only in an explicit ban/negative prompt, never as a positive palette assignment. Swan-branded surfaces always remain Law A.
### 3.2 World entry schema (every world gets ALL of these fields)

| Field | Content |
|---|---|
| Name + family | immutable evocative name + one of the five canonical families |
| Stable ID + retrieval keys | `world.<family>.<slug>` plus 4–8 aliases/tags for Karpathy/Hermes retrieval; IDs never change when prose is refined |
| Mood words | 3–5 words that constrain every later choice |
| World DNA | material, light, weather, camera, depth, topology, interaction, sonic-silence, and primary/accent-world genes; at most one opt-in accent world |
| Audience + content fit | who this helps, which content job it carries, and the mismatch that disqualifies it |
| Palette law | Law A, Law B, or A-on-Swan/B-in-non-Swan-factory; entries may narrow, never broaden, the central license table |
| World palette | Law B: 5–8 named roles. Law A: Swan-token ratios. Every contrast-critical pairing is named |
| Atmosphere recipe | background/midground/foreground/weather stack; light source/direction; fog/depth; grain; static topology |
| Motion language | pacing, signature transition, WFX IDs, and what remains when all motion stops |
| Typography lean | Swan face roles for Law A or a rights-safe face category for Law B |
| Signature WFX | 2–4 WFX IDs plus each technique's maturity/dependency status |
| Backend ladder | B0–B3 rungs actually eligible for this world; higher rungs may never own unique meaning |
| Seedance seed brief | E1-shaped ready prompt with negative prompts and fallback still |
| Asset provenance | generator/model version, prompt/source, license/consent/likeness, timestamp, hash, responsive derivatives |
| Psychology hypotheses | 2–3 hypothesis IDs with evidence strength, target KPI, counter-metric, falsification/stop condition; never a conversion guarantee |
| Proof + action contract | Act-2 proof spine, one unique conversion action, and where the same action repeats at Act 3→4/page end |
| Licensed surfaces | a strict subset of the central experience-mode table |
| Reduced-motion still | the composed zero-motion story/poster |
| Anti-cheese line | the exact way the world becomes tacky, derivative, unreadable, or dishonest |
### 3.3 The roster (build all 18; sketches below are Fable's taste — honor them)
**Family: NATURAL SUBLIME** *(awe via vastness + intricate detail; the family closest to Swan's own frozen-forest DNA)*
1. **Glacier Cathedral** — ice caves, aurora, deep blue light through frozen mass. *(FULLY WRITTEN EXEMPLAR — see §3.4; this is the quality bar.)*
2. **Evergreen Dominion** — endless pine forest from canopy height; mist banks between ridgelines; god rays; birds crossing frame as scroll-triggered accents. Cold greens + Frost White fog; Law A natural fit. Slow, patient motion — parallax mist layers, nothing darts.
3. **Emerald Canopy** — jungle interior: layered giant leaves, bioluminescent undergrowth accents, humidity haze, macro flowers. Denser and warmer than Evergreen Dominion; motion is dripping, unfurling, breathing.
4. **Cascade Vault** — waterfall + cave system: water as the light source, wet stone, spray particles, cathedral-scale caverns behind the fall. Scroll descends *into* the cave (vertical journey = the arc). Sound design opt-in only.
5. **Prairie Horizon** — hillside meadows, wildflowers, birds, huge sky; the wide-open counterpoint to the cave worlds. Horizon line as the layout's structural device; wind as the motion language (fields moving in waves at 0.2 parallax).
6. **Alpine Apex** — peaks above cloud line, thin cold air, summit light. Vertical scroll = ascent; altitude markers as C9 counters; the CTA lives at the summit. Gilded Fern as sunrise-on-snow accent works beautifully under Law A.
**Family: COSMIC** *(awe via scale; the James Webb lane)*
7. **Webb Deep Field** — space-telescope deep-field aesthetics: diffraction-spiked stars, galaxy clusters, infrared oranges/golds against absolute black; actual telescope imagery requires documented source/license/attribution. Scroll = zoom deeper into the field (scroll-scrubbed sequence is native here). Numbers psychology: cosmic scale makes product metrics feel inevitable.
8. **Nebula Drift** — gas-cloud nurseries, volumetric color, slow rotation; particle swarms (WFX-02) as the signature technique. The most shader-native world in the catalog.
9. **Exo Eden** — a beautiful alien world: twin moons, impossible flora, bioluminescent oceans, colors that read organic-but-wrong in a gorgeous way. Law B required (its point is a non-Earth palette). The "show me something nobody's seen" world.
**Family: CONSTRUCTED TECH** *(competence + desire; night-city energy)*
10. **Grid Runner** — luminous-grid futurism: disciplined light-line geometry on black, cycle-like trails, wireframe horizons, hard 90° camera moves; never clone protected logos, vehicles, type, or interface language. UI itself becomes the world (borders are light-lines). Law B; disciplined 2-color + black.
11. **Neon Meridian** — cyberpunk metropolis: rain, holograms, signage canyons, reflective streets. *(FULLY WRITTEN EXEMPLAR — see §3.4.)*
12. **Chrome Sovereign** — the sophisticated luxury metropolis: penthouse-at-dusk, brushed metal, glass towers, warm interior light against blue-hour city. The "wealthy golf client" world — Law A compatible (Sapphire + Gilded Fern are made for this).
13. **Signal City** — procedural cityscape flythrough (WFX-03 procedural + WFX-08 scroll-film): camera gliding through a generated city; the transcript-1 "fly through a 3D city" experience, formalized with perf tiers.
**Family: MINIATURE & PLAY** *(delight + charm; tilt-shift and toys)*
14. **Tiny Metropolis** — miniature city / tilt-shift: shallow depth of field, model-railway charm, tiny animated citizens as easter eggs. Sections of the page are city districts; nav is a map.
15. **Pocket Worlds** — floating micro-dioramas: each content section is its own tiny island/world orbiting in space, approached by scroll. Natural fit for feature walks (each feature = one diorama).
16. **Voxel Realm** — voxel gaming: chunky 3D blocks, satisfying build/break animations, sprite-sheet motion, game-HUD UI language. Mini-game easter egg (WFX-10) is native here. Anti-cheese line matters most here.
**Family: CINEMATIC REAL** *(trust via film craft)*
17. **Film Frame** — photoreal cinematic: anamorphic framing, film grain, letterboxed hero moments, blocking-and-coverage storytelling; the "this is a movie" world for brand films. Kuleshov-cut dividers (C10 video-cut) native.
18. **Archive Editorial** — documentary/museum grade: large-format photography, captioned exhibits, restrained motion, editorial typography doing the heavy lifting. The most restrained world in the catalog — its inclusion PROVES the engine isn't just maximalism.
### 3.4 Two gold-standard exemplar entries (write these two IN FULL first; every other entry must match their density)
**GLACIER CATHEDRAL** *(Natural Sublime · Law A: "A on Swan surfaces / B in the factory")*
- **Mood words:** glacial, vast, luminous, patient, sacred.
- **Palette (Law A ratios):** Obsidian Black ground 50% → Midnight Sapphire/Royal Depth mass 30% → Ice Wing as *light-through-ice* 15% (glow edges, crevasse light, aurora band) → Frost White type 4% → Gilded Fern 1% (a single warm accent per act — low-sun glint). Arctic Cyan reserved for any data moments.
- **Atmosphere recipe:** BG = slow aurora band + ice-mass parallax still (0.25 multiplier); MID = C12 sapphire glass panels reading as cut ice slabs; FG = Frost White display type + CTA; PARTICLE = drifting ice crystals at 0.03 opacity + 3% grain. Light source: below-horizon blue with one act-boundary shift to gold (temperature arc per cinematic-pages.md §3). Fog: depth-fade on background masses only.
- **Motion language:** nothing hurries. Ambient 12–20s loops (aurora drift), narrative reveals at the slow end of `--motion-narrative` (700–900ms), one crevasse-descent scroll-scrub (WFX-08) as the signature. Transitions: luma-through-white ("ice flare") act cuts.
- **Typography lean:** Plus Jakarta Sans display tightened −2% tracking; Cormorant italic for the sacred beats ("the mountain does not negotiate").
- **Signature techniques:** WFX-08 scroll-film (descent into the crevasse), WFX-02 particle field (crystals), WFX-12 atmospheric system (aurora + god rays), WFX-06 variable-font weight thaw on the hero word (weight 200→700 as ice "compresses").
- **Seedance seed brief:** "Slow dolly through a vast glacial ice cave, walls of deep sapphire-blue ice with internal luminosity, shafts of pale cyan light through the ceiling, drifting ice crystal motes, aurora glow visible through the cave mouth, no people, no text, photoreal with subtle fantasy luminosity, seamless loop closure, 8s. Negative: green tones, warm interior lighting, cartoon, lens flare kitsch, retired-brand cyan #00FFFF saturation."
- **Psychology note:** pure awe (vastness + accommodation) — awe slows perceived time and increases willingness to engage and share; the patient pacing *is* the persuasion. Peak-end: the gold light shift at Act 3→4 is the peak; the calm CTA is the end.
- **Licensed surfaces:** Swan brand films, hero/landing experiences (Sean-approved), factory outputs, campaign microsites.
- **Reduced-motion still:** one composed frame — crevasse light shaft on sapphire ice, headline set in the light.
- **Anti-cheese line:** goes tacky the moment ice becomes *frosted-glass UI decoration everywhere* — the world is the cathedral, not a blur filter.
**NEON MERIDIAN** *(Constructed Tech · Law B)*
- **Mood words:** electric, rain-slick, dense, alive, midnight.
- **World palette (Law B):** `--nm-void #060608` (ground), `--nm-signal-magenta #FF2E88` (signage/CTA), `--nm-current-cyan #23D5E8` (holograms/data), `--nm-sodium-amber #FFB13D` (street warmth, the humanizing 5%), `--nm-hologram-violet #9B5CFF` (depth accents), `--nm-wet-steel #1A1F2E` (surfaces), `--nm-rain-white #E8F0F8` (type). Discipline: magenta OR cyan dominates a scene, never both at parity; amber appears in every act (it's what keeps the world humane).
- **Atmosphere recipe:** BG = signage-canyon parallax with rain streaks (WFX-01 shader or layered video); MID = wet-steel panels with hologram edge-light; FG = rain-white type + magenta CTA; PARTICLE = rainfall at two depths + steam. Light source: signage glow from above + reflection from below (double-source is this world's signature look). Reflections: every light source repeats, blurred, on the ground plane.
- **Motion language:** the city never sleeps but the *reader's lane is calm* — ambient neon flicker and rain live in the background layers; foreground responds crisply (120–200ms). Signature transition: "hologram re-materialize" (scanline + opacity) between acts. Glitch used ≤2 times per page or it becomes noise.
- **Typography lean:** extended geometric sans for display (category, not a named font), condensed mono for data/HUD moments.
- **Signature techniques:** WFX-01 shader background (rain + refraction), WFX-04 spatial scene (hovering hologram object, M4 only), WFX-07 kinetic type (signage-style headline build), WFX-12 atmosphere (rain/steam system).
- **Seedance seed brief:** "Rain-soaked neon metropolis street canyon at night, towering holographic signage in magenta and cyan, amber street-level light, wet asphalt mirror reflections, steam from vents, slow forward dolly, cinematic depth of field, no readable real-brand text, no people in foreground, seamless loop, 8s. Negative: daylight, pink-purple wallpaper gradient soup, cartoon anime style, readable trademarked logos."
- **Psychology note:** curiosity gap + processing disfluency — density and partial occlusion (steam, signage bokeh) make the eye *work*, which reads as depth and coolness for younger/enthusiast audiences; amber warmth prevents alienation. Von Restorff: the single magenta CTA against cyan-dominant scenes isolates the action perfectly.
- **Licensed surfaces:** factory outputs, non-Swan campaign microsites, client/agency demos, Content Studio experiments. Law B never ships under Swan chrome; use a Law-A Neon Meridian adaptation for Swan work.
- **Reduced-motion still:** one rain-frozen frame, signage bokeh, amber window light, headline in rain-white.
- **Anti-cheese line:** dies the moment it becomes a flat purple-pink gradient with "CYBER" in a chrome font — the world is *wet, layered, amber-warmed density*, not a Synthwave poster.
### 3.5 World-roulette contract (end of worlds.md)
Roulette is a deterministic, suitability-filtered draw: `surface/license → audience/content fit → capability fit → recent-use diversity → seeded family-balanced draw`. Record catalog version, seed, eligible set, rejected worlds/reasons, recent-use history, final draw, and restrained comparison. For 2–3 directions, choose families uniformly before choosing a world so the six-world Natural family does not dominate. For a five-site proof, choose exactly one per family. Random never bypasses the B2 arc, scene ledger, approval, palette law, or M4 gate.

## 4. Deliverable 2 — `docs/ai-workflow/design-brain/techniques.md` (World Effects arsenal)
Use visual IDs **WFX-01–WFX-13**. Every entry contains: job · emotional payoff · motion budget · maturity · current dependency truth · eligible backend rungs · measurable Full/Lean/Still budgets · failure recovery · reduced-motion/static result · a11y · implementation notes · wrong-tool condition.
Maturity labels are mandatory:
- **AVAILABLE:** installed or browser-native with a working repo pattern.
- **PROGRESSIVE:** browser-native behind feature detection with a complete fallback.
- **DEPENDENCY-GATED:** not installed; requires a separate version/architecture spike and approval.
- **RESEARCH-ONLY:** factory/lab only; never promoted as a required path.
1. **WFX-01 Shader Surface** — M4 · DEPENDENCY-GATED/PROGRESSIVE. Describe inputs/seed/time and the same effect at every rung. Stable production path is GLSL/WebGL2; frontier path is isolated WGSL/WebGPU. Required fallback: B3 → B2 → encoded media/CSS → B0. Handle adapter/device/pipeline failure, `device.lost`, WebGL context loss, error scopes, compile timeout, and disposal.
2. **WFX-02 Particle Field / Swarm** — M3 for ≤200 subtle particles; M4 for GPU swarms. Instancing, deterministic seed, density governor, offscreen pause, and no particle-carried meaning. Still mode removes particles without losing composition.
3. **WFX-03 Procedural Generation** — M4 · DEPENDENCY-GATED. City, terrain, starfield, flora. Fixed catalog version + seed + scene time + quality/backend override. No bare `Math.random()`, `Date.now()`, or independent clock in render-critical state.
4. **WFX-04 Spatial Scene** — M4 scaffolding only on licensed non-product experiences; M3 retains the canonical surgical accent. One canvas default. Three.js WebGL2 is the production target after a dependency spike; R3F is an adapter, not architecture. Reuse resources, instance repeats, add LOD, progressive loading, and demand-render only when the scene can rest.
5. **WFX-05 Scroll-Scrubbed Frame Sequence** — M3 · PROGRESSIVE. Reuse `cinematic-pages.md` §8 economics; poster is truth, sequence is enhancement.
6. **WFX-06 Variable-Font Animation** — M2+ · PROGRESSIVE exception to transform/opacity-only. One contained display line, never body/CTA/data; static reduced mode; measure layout/paint cost and FOUT.
7. **WFX-07 Kinetic / Generated Typography** — M2+ · AVAILABLE/PROGRESSIVE. Respect stagger caps, expose final readable text to assistive tech, and never delay comprehension.
8. **WFX-08 Scroll Film** — M4 orchestration. Up to four justified pins and 20vh only with a ledger, visible skip, no scroll hijack, and a complete static storyboard.
9. **WFX-09 Audio-Reactive Atmosphere** — M4 · PROGRESSIVE. Intentional user activation only, visible keyboard-operable mute/stop, hidden-tab pause, transcript/caption equivalent for any informational audio, and full experience with sound unavailable.
10. **WFX-10 Playable Moment** — M4. Optional, skippable, touch + keyboard operable, no conversion/content gating, no forced pointer lock/fullscreen, and no reward dark pattern.
11. **WFX-11 3D Product Orbit** — M3 surgical / M4 centerpiece · DEPENDENCY-GATED. Drag controls need keyboard buttons and DOM description; B1 turntable video + B0 still fallbacks.
12. **WFX-12 Atmospheric System** — M3 ≤2 restrained layers; M4 **budget-bounded**, never “unrestricted.” Transform/opacity layers; large-surface filter animation rejected.
13. **WFX-13 Living Data** — M2+. Real values only. On product/product-adjacent surfaces a canonical Victory chart or accessible table remains authoritative; generative art is supplemental and may not alter scale, certainty, comparison, or meaning.
### 4.1 Runtime performance law
- The LCP poster, heading, and CTA require zero 3D/WebGPU engine bytes. Experience machinery lazy-loads only after B0 is stable.
- Field targets at p75: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1.
- Full and Lean budgets apply to authored render/main-thread work and missed-presentation behavior, not raw rAF cadence. A 120-rAF window calibrates display cadence; rAF callback p95 is presentation cadence, not authored work and is never a numeric pass/fail threshold. Still/reduced: no continuous loop.
- No main-thread animation task >50ms in the canonical trace.
- Cap drawing-buffer pixels, not raw DPR: default Full ≤3.7MP, Lean ≤2.1MP; a world may be stricter.
- Default draw-call target: Full ≤300, Lean ≤150. Estimated texture/buffer memory: Full ≤192MiB, Lean ≤96MiB unless a measured scene sets a lower ceiling.
- Adapt from observed frame behavior with hysteresis; never oscillate quality visibly. A visible Full/Lean/Still session override wins.
- Pause off-viewport and when `document.hidden`; dispose listeners, workers, media, WebGL/WebGPU resources on unmount.
### 4.2 Frontier annex — research lanes, not inherited permissions
- **F1 WebGPU compute worlds:** large particle simulation, procedural terrain/cities, fluid/SDF effects; B3 research-only until B2/B1/B0 parity passes.
- **F2 Browser-native continuity:** View Transitions and CSS scroll/view timelines behind feature detection; unsupported and reduced-motion paths show the final state immediately.
- **F3 Worker rendering:** OffscreenCanvas/module worker for expensive scenes; DOM remains authoritative; messages bounded/coalesced; main-thread lean fallback.
- **F4 Photoreal spatial capture:** Gaussian-splat portals only for authorized environments; progressive LOD, memory/transfer manifest, consent/provenance, video/still fallback.
- **F5 Frame-synchronous media:** `requestVideoFrameCallback()` where decoded-frame sync is essential; WebCodecs only for real low-level frame transformation, not ordinary playback.
- **F6 WebXR portal:** deferred by default; Sean-approved campaign/installation only, explicit Enter XR, permissions/capability checks, conventional web fallback, no conversion gating.
Research anchors to cite in `techniques.md`: W3C WebGPU · official Three.js WebGPURenderer guide · R3F React-version/performance guides · MDN View Transitions/scroll-driven animation/OffscreenCanvas/media APIs · W3C Web Audio/WCAG · Playwright clock/media/snapshot docs. These guide experiments; Swan verification remains the gate.

## 5. Deliverable 3 — `docs/ai-workflow/design-brain/psychology.md` (ethical, testable experience hypotheses)
Keep Fable's ten principles, assign stable IDs **PSY-01–PSY-10**, and stop writing them as conversion facts. Every entry includes: definition/researcher · primary source · evidence strength/replication caveat · applicable audience/context · existing Swan B2/C/motion anchor · World Engine use · accessibility exclusion · ethical/dark-pattern failure · target KPI · counter-metric · falsification threshold · stop condition.
1. **PSY-01 Awe** — Keltner/Haidt; vastness + accommodation. Natural Sublime/Cosmic Act 1. Hypothesis: a singular, relevant awe beat can increase voluntary exploration; awe fatigue and slow task completion are counter-signals.
2. **PSY-02 Curiosity Gap** — Loewenstein. Partial information may pull the next scroll; never hide pricing, consent, proof, navigation, or CTA clarity.
3. **PSY-03 Von Restorff Isolation** — distinct items are remembered. One signature moment and one accent CTA; repeated isolation destroys isolation.
4. **PSY-04 Peak-End** — Kahneman and collaborators. Design the Act 3→4 peak and calm close; do not manufacture emotional pressure.
5. **PSY-05 Aesthetic-Usability** — perceived beauty may improve perceived usability; it never excuses actual friction, inaccessibility, or errors.
6. **PSY-06 Processing Fluency / Strategic Disfluency** — clarity for trust and tasks; optional atmosphere may carry contained disfluency. Navigation, forms, consent, pricing, proof, CTA, and readable copy stay fluent.
7. **PSY-07 Goal Gradient** — progress visibility may support completion. Honest act/progress markers only; no false progress or completion coercion.
8. **PSY-08 Zeigarnik / Open Loops** — context-dependent hypothesis. Tease and resolve within the same story; no manipulative cliffhanger.
9. **PSY-09 Social Proof + Authority** — real, consented proof and accurate credentials. No fake counts, borrowed authority, or proof buried under spectacle.
10. **PSY-10 Paradox of Choice** — limit simultaneous choices while keeping comparison and escape paths available.
Close with two receipts:
- **Psychology receipt:** per act, 2–3 hypothesis IDs, mechanism, audience/context, accessibility exclusion, KPI, counter-metric, falsifier, stop condition.
- **Experiment receipt:** one primary metric, guardrails (task completion, bounce, INP/LCP, accessibility errors, opt-out), variant/version, exposure period, and decision rule. No cherry-picking. Until Swan evidence exists, every claim is marked `[HYPOTHESIS]`.

## 6. Deliverable 4 — `docs/ai-workflow/design-brain/experience-mode.md` (the M4 licensed lane)
1. **Authority reconciliation:** M4 exists only because the two source docs receive narrow pointers to this license. Those pointers do not loosen M0–M3, product surfaces, calm zones, palette discipline, or data truth.
2. **Eligible relaxation table:** M3 surgical 3D → M4 one spatial canvas may scaffold an eligible non-product experience; signature budget → one page-level crescendo with one subordinate focal beat per act; pins ≤2 → ≤4 justified; travel 8–14vh → ≤20vh justified; parallax recommended 0.2–0.4 with hard 0.6 ceiling unchanged; concurrent elements 3 → 5 only when frame/attention budgets pass. WFX-12 remains budget-bounded.
3. **Never-relax list:** B0 complete story, Full/Lean/Still, reduced-motion static story, first-frame poster, 4.5:1, 44px, one unique conversion action (may repeat at Act 3→4 and page end), no autoplay audio, experience-mode §10-required Pause Effects/Skip, Play/Mute/Stop only when audio is included, no >3 flashes/second, no canvas-only information, no focus capture, source/asset provenance, privacy, data truth, offscreen pause, disposal, and rollback.
4. **Licensing table:**
   - Product dashboards, storefront/checkout, Coach, onboarding, live operator/command surfaces: **LIVE M4 NEVER**.
   - Product surfaces may display only inert B0 posters or pausable prerecorded M2 previews of World Engine work.
   - Swan marketing/landing: M2–M3 default; M4 only with Sean's per-page approval and Law A.
   - Swan brand films/campaigns: M4 eligible with Sean approval and Law A.
   - Non-Swan microsites, client/agency demos, factory outputs: M4 eligible; Law B allowed.
   - Hermes Operations Center: M1 calm Cyberforest only; World Engine spectacle never applies.
5. **Inheritance:** a live M4 module on an eligible non-product host promotes the whole host to M4 for license, performance, accessibility, approval, and QA. A product host refuses the live module; it may accept only the flattened B0/M2 preview.
6. **Gate ritual:** target surface/license verdict · World ID/catalog version · palette law · one logline · B2 arc + scene ledger · psychology receipt · WFX/maturity manifest · B0–B3 ladder · asset/provenance manifest · performance/quality plan · §10-required pause/skip and, when audio is included, Play/Mute/Stop controls · Sean approval line when required · rollback.
7. **Adaptive-quality law:** use §4.1 targets and capability initialization, not UA sniffing or a single `navigator.gpu` check. Adapter/device/pipeline/context loss downgrades in-place; the DOM story and CTA never change.
## 7. Deliverable 5 — surgical stitching and authority repair
1. `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`: one M4 pointer in the 3D rule and performance-tier area. State that only licensed non-product/approved marketing experiences may use M4; product rules remain untouched.
2. `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md`: one pointer under A6. M0–M3 keep “one short 3D moment”; M4 follows `experience-mode.md`.
3. `design-brain/index.md`: rows for worlds, techniques, psychology, experience mode, world factory, and knowledge entities.
4. `motion.md`: one pointer after §1; no calm-zone or M0–M3 edit.
5. `website-archetypes.md`: matrix row + full **#21 Experience / World Showcase** entry. On eligible non-product hosts, live embedding promotes the host to M4. On product hosts, live M4 is refused; only an inert B0 or pausable prerecorded M2 preview is allowed.
6. `cinematic-pages.md`: pointer from caps to M4 extended caps and B0/B3 loss matrix.
7. `adapters/reviewers.md`: automatic REVISE for missing ritual, unlicensed live M4, Law-B-under-Swan, missing loss fallback, or failed Pause/Skip.
8. `adapters/knowledge.md`: versioned entities `World`, `WorldFamily`, `WorldEffect`, `PsychologyHypothesis`, `SurfaceLicense`, `WorldRecipe`, `WorldRun`; edges `BELONGS_TO_FAMILY`, `USES_EFFECT`, `LICENSED_FOR`, `FALLS_BACK_TO`, `TESTS_HYPOTHESIS`, `GENERATED_IN_RUN`. Graph output still enters `graph-imports/` quarantine; nothing writes directly to wiki.
9. `SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md`: register the factory as T1 planning / T2 bounded ignored experiment writes, repo/public data, KEEP MANUAL ONLY, Sean supplies N/seed/budget, delegates single-site work, no production promotion.
10. Synchronize only the Full/Lean/Still + separate Reduced Motion terminology in `design.md` and its mandatory `design.html` visual mirror. Leave their tokens/product rules unchanged; leave `anti-patterns.md` and `qa-gates.md` unchanged.
11. Add deterministic `verify-world-engine.mjs` + tests and executable `world-roulette.v1` + tests. The verifier must reject per-entry schema gaps, repeated-regex state drift, keyword-only word salad, stale mirror terminology, missing stitching, and consumer substitution of the roulette algorithm.
## 8. Deliverable 6 — router upgrade (`.claude/skills/swan-design-router/SKILL.md`)
Surgical additions only:
1. **Progressive disclosure:** for world/cinematic work, load `worlds.md` manifest/roulette first; query only selected world headings, referenced WFX entries, relevant PSY entries, and `experience-mode.md` if M4 is proposed. Do not bulk-load the whole engine for a normal product task.
2. **Roulette triggers:** “random world,” “surprise me,” “world roulette,” or explicit themed-experience request. Apply the suitability pipeline and emit seed/catalog/eligible/rejected receipt.
3. **Direction template additions:** `WORLD ID`, `PALETTE LAW`, `MOTION BUDGET`, `BACKEND LADDER`, `WFX`, `PSYCHOLOGY HYPOTHESES`, `LICENSE VERDICT`.
4. **M4 refusal:** unlicensed target → refuse M4 and offer M3/B0-M2 preview. A Law-B world targeting Swan → translate to Law A, never grant an exception.
5. **Receipt extension:** world/catalog/seed, eligibility rejects, surface license, one unique action, proof spine, scene ledger, WFX maturity, B0–B3, performance mode, §10-required pause/skip, audio Play/Mute/Stop when included, asset provenance.
6. **Factory distinction:** an explicit factory batch authorizes autonomous choice inside ignored experiments only; real/promotion surfaces still stop at Sean's concept-direction selection gate.
7. **External references:** retain the Mobbin gate. If unavailable, write `[MOBBIN UNAVAILABLE]`; it is never a reason to clone or stall a docs-only factory experiment.
## 9. Deliverable 7 — `.claude/skills/swan-world-factory/SKILL.md` (thin manual-only batch orchestrator)
The factory does not duplicate visual doctrine. It delegates each site to `adapters/cinematic-site-generator.md`, then adds seeded batch selection, bounded parallelism, repeated review, a gallery, and a run manifest.
1. **Invocation:** Sean supplies N, purpose, output boundary, and optional seed/budget. Never run unprompted. Confirm output path is ignored before any write; if not, stop for approval of the exact `.gitignore` line.
2. **Selection:** family-balanced deterministic roulette. Save catalog version, seed, eligible/rejected sets, recent-use history, chosen worlds, WFX/PSY manifests.
3. **Concurrency:** bounded worker pool `min(N, 3)` so one root slot remains for coordination. Queue remaining sites; one agent may build multiple sites sequentially. No unbounded “one agent per site.”
4. **Per-site contract:** logline, mood words, World DNA, scene ledger, psychology receipt, proof/action, B0–B3 ladder, performance/asset manifest in the file header; then delegate to the canonical single-site generator.
5. **Three distinct repair passes form one minimum hostile cycle; repeat the complete cycle after repairs until no P0/P1 remains:**
   - Pass 1 — story, hierarchy, world specificity, anti-cheese.
   - Pass 2 — accessibility, responsiveness, performance, capability failure, cleanup.
   - Pass 3 — originality, cross-world differentiation, subtraction, fidelity. Remove anything without a narrative, information, or emotional job.
6. **QA:** every output smoke at 375/414/768/1440/2560×1440, reduced motion, keyboard, overflow, console, network, B0 fallback. Finalists run full QA Gates 1–3 plus act-boundary/brightest-frame/performance captures. FAIL output is hidden or visibly labeled FAIL.
7. **Manifest/gallery:** hashes, tool/browser versions, world/WFX/PSY credits, license/provenance, quality/backend, screenshots, findings/fixes, verdict. Gallery may link only PASS outputs by default.
8. **Promotion:** never automatic. A winner returns through the normal router, concept approval, canonical surface receipt, licensing, tests, and deploy gates.

## 10. Build order and proof protocol
### Phase A — canonical engine specification
1. Re-read lanes → isolate worktree → preserve handoff → claim exact files.
2. Add authority pointers.
3. Build `worlds.md` → `techniques.md` → `psychology.md` → `experience-mode.md`.
4. Stitch index/motion/archetype/cinematic/reviewer/knowledge/registry pointers.
5. Upgrade router and thin factory skill.
6. Run the minimum three-pass hostile cycle per artifact—contradictions/safety → completeness/evidence → fidelity/subtraction—and repeat after repairs until no P0/P1 remains.
7. Status after Phase A may be only: **canonical World Engine specification built**.
### Phase B — deterministic five-family proof
1. Confirm/approve ignore boundary; generate one site from each family using a recorded seed.
2. Use only local/generated/CSS/procedural assets; no PII, secrets, production APIs, trademarked interfaces, or unlicensed likenesses.
3. Produce five sites, manifest, gallery, screenshots, automated receipts, and hashes.
4. Browser-test loss/fallback paths: B3 success when available, B3 unavailable, adapter/device/pipeline rejection, context loss where simulatable, forced B2, B2 unavailable, B1/B0, JS-disabled poster.
5. Under exact policy `swan-world-factory.review-policy.v2`, predeclare distinct site author, `browserQaWorker`, and independent reviewer; reviewer differs from author and QA worker. That QA worker runs the full suite, the reviewer stamps current artifacts, then the same QA worker runs gallery-only. Review issues APPROVE/REVISE with P0–P3 evidence; repeat the full three-pass repair cycle until no P0/P1 remains. `BLOCKED` is reserved for a genuine external legal, licensing, or authority constraint.
6. Only after Phase B passes may the result be called a **working World Engine proof**. It is still not a promoted production engine.

## 11. Acceptance criteria
### Phase A
- [ ] 18 immutable worlds, five families, two full exemplars; every entry carries all World DNA/schema fields and a decisive anti-cheese line.
- [ ] Law A/B unambiguous; Law B never under Swan chrome; retired exact hexes appear only in bans/negative prompts, never positive palettes.
- [ ] No visual `T1–T13` identifiers remain; WFX-01–WFX-13 present; glossary keeps WFX/M/B/T namespaces distinct.
- [ ] Every WFX entry declares maturity, dependency truth, backend rungs, measurable budgets, Full/Lean/Still, recovery, a11y, and wrong-tool condition.
- [ ] Every PSY entry carries evidence strength, context, `[HYPOTHESIS]`, ethical/accessibility failure, KPI, counter-metric, falsifier, and stop condition.
- [ ] experience-mode contains relax table, never-relax list, license table, safe inheritance rule, ritual, performance law, and backend-loss rule.
- [ ] Source pointers reconcile M4 without altering M0–M3 or product/calm-zone rules.
- [ ] #21 refuses live product embedding; eligible non-product hosts inherit M4.
- [ ] Router uses progressive disclosure and deterministic suitability roulette; unlicensed M4 and Law-B-under-Swan are refused.
- [ ] Factory is registered, manual-only, bounded, delegates to the single-site generator, and requires ignored output + receipts.
- [ ] Knowledge adapter defines versioned entities/edges while preserving quarantine-first promotion.
- [ ] Scope diff contains no frontend/backend runtime code, dependency, production config, secret, or PII change.
### Phase B
- [ ] Five-family deterministic manifest records catalog, seed, eligible/rejected worlds, WFX/PSY, provenance, hashes, versions, and verdicts.
- [ ] Each site has a complete semantic B0 poster and no canvas-owned copy/navigation/CTA/legal/form state.
- [ ] Backend-loss matrix falls cleanly without blank output, reload, lost action, or uncaught error.
- [ ] Browser smoke passes at 375/414/768/1440/2560×1440 plus reduced motion, keyboard, overflow, console/network, Full/Lean/Still, and JS-disabled B0.
- [ ] Finalists pass full Gates 1–3, brightest-frame contrast, lazy-load evidence, frame/pixel/draw-call/memory targets, offscreen pause, and teardown.
- [ ] Required Pause Effects and Skip satisfy experience-mode §10; when audio is included, visible Play/Mute/Stop controls are keyboard/screen-reader accessible.
- [ ] Independent reviewer reports zero P0/P1 after recursive fixes; failed outputs are not presented as equal winners.
- [ ] No paid AI Village run occurred without Sean's explicit per-run permission.
- [ ] No production promotion, push to main, deploy, or live data access occurred.
## 12. What not to do
- Do not “improve” neighboring product doctrine, install graphics dependencies, or write frontend/backend runtime code in Phase A.
- Do not ship WebGPU-only truth, R3F 9 on React 18, user-agent device classes, unbounded DPR/layers/workers, or raw scroll layout mutation.
- Do not use a live M4 module on any product, checkout, Coach, onboarding, or operator surface.
- Do not use strategic disfluency in navigation, copy, pricing, proof, forms, consent, or CTA.
- Do not call a psychology hypothesis a conversion fact; do not use dark patterns, fake scarcity, fake social proof, or coercive progress.
- Do not say “make it Tron” or clone a site. Use “luminous grid futurism”; use space-telescope deep-field principles unless an actual image has documented license/attribution.
- Do not use protected logos, characters, trademarked signage/interfaces, real-person likenesses without consent, or unproven asset rights.
- Do not accept the first generated asset/site. Do not add complexity merely to satisfy a pass; the final pass subtracts.
- Do not edit `.gitignore` without the exact approval/authorized proof-run boundary; do not allow ignored experiments to hide review receipts.
- Do not let Fable fidelity override Sean's ownership, source authority, accessibility, performance, privacy, or reproducibility.
## 13. Closeout requirements
Run verification-before-completion, then closeout-evidence-lock. Report blockers first; plain-English summary; technical summary; exact changed files/line counts; exact checks and results; acceptance boxes verified/deferred; source/reference links; lane release; rule-38 artifact inventory; residual external constraints.
Use honest status language:
- After Phase A only: **canonical World Engine specification built**.
- After a clean Phase B: **working World Engine proof verified locally**.
- Never claim production-ready/live/deployed without a separately approved promoted implementation, canonical surface receipt, full app tests, and deployment evidence.
No automatic continuity closeout. No push to main. A later promotion slice selects a proof-run winner, routes it through the normal concept gate, and treats every generated file as untrusted experimental input until reviewed.

---
*Authority: `SWAN-CINEMATIC-DESIGN-SYSTEM.md` + `SWAN-ASSET-STORYBOARDING.md` > `design.md` > `experience-mode.md` > this handoff > builder judgment. A subordinate file may narrow authority, never secretly broaden it.*
