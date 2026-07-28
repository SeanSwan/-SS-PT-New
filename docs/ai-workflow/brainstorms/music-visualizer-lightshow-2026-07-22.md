# Brainstorm: Music Visualizer / Light-Show Component ("Swan Visualizer")

**Date:** 2026-07-22  ·  **Status:** complete  ·  **For:** net-new standalone component → later ported into SwanStudios (gallery background + music box)

**Sean's verdicts (2026-07-22):** All 5 Phase-2 suggestions ADOPTED (mic mode, snapshot/record, idle-ambient, strobe limiter, one-action flows). First deliverable = a LIVE standalone artifact Sean can watch + play his own MP3 through this session, then refine + port.

## Summary
A generative music-visualizer / light-show component in the spirit of the classic iTunes / Windows Media Player visualizer, but more beautiful and far more extensive. It draws endless procedural art (spirals, geometric shapes, organic bloom/flowers/bubbles/orbs) driven by live audio analysis. Ships with its own "music box" (upload + play your own MP3s), can run as a full-page gallery background, and exposes a plugin slot so Sean can inject his own custom scene designs. Spotify/Pandora integration is explicitly end-game. Built standalone-first with portability as a day-one design goal so it drops in and out of SwanStudios with no friction — or can become its own product.

## Key Decisions
- **Kickoff:** Interview first (grill-me), then build. — Sean chose the standard net-new path.
- **Home:** Standalone-first, engineered to port into SwanStudios later; could also become its own separate thing. — Sean's "take it in and out with no problem" requirement is a first-class design goal.
- **Spotify/Pandora:** end-game / Phase 4 — Sean called them "end game" himself; there's a hard technical wall (Spotify API gives no raw audio samples, only metadata).

## Q&A Log

### Q1: When it's at its most beautiful, which overall MOOD wins?
- **Recommended:** Elegant / dreamy / luxurious (matches Crystalline Swan brand, ports in natively).
- **Sean's answer:** ALL FOUR — elegant/dreamy/luxurious + trippy/psychedelic/hypnotic + cosmic/celestial/space + sharp/geometric/futuristic.
- **Implication:** Not a single-mood visualizer. The engine must span the full range of moods — this is the "extensive, rarely-repeating" requirement expressed at the mood level. Architecture must therefore group scenes into MOOD FAMILIES, and the director can either shuffle across all moods or lock to one. Default color themes per mood, but a shared "brand skin" (Crystalline Swan palette) must be selectable so it looks native when ported.

### Q2: How much control — self-driving vs. steered?
- **Recommended:** Auto default + collapsible manual override panel.
- **Sean's answer:** Auto default + manual override panel.
- **Implication:** Two modes on one engine. (1) AMBIENT/AUTO mode — a smart "director" shuffles scenes + moods endlessly with no input, ideal for the gallery-background use case (leave it running). (2) An overlay control panel (collapsible/hidden by default so it doesn't pollute the ambient view) exposing: lock-mood, force-specific-scene, freeze-current, intensity/complexity dial, palette/skin picker, speed. The director is a real component (weighted scene selection, smooth cross-fade between scenes, mutation of parameters over time) — not just `Math.random()`. Panel must be dismissible for clean fullscreen background.

### Q3: What does "introduce my own designs" mean?
- **Recommended:** Image/SVG assets the engine animates (launch), with the code-scene contract underneath as the power tier.
- **Sean's answer:** ALL FOUR — (a) drop in own images/SVG that the engine animates, (b) presets + sliders saved as named "my looks", (c) write/paste actual code for a custom scene, (d) AI-generate designs from a text prompt.
- **Implication:** The custom-design system is a layered stack, all four tiers, sequenced by effort:
  - **Tier 1 (launch): Asset-driven scenes.** Upload PNG/SVG → engine spawns/animates it (orbit, scale-on-bass, trail, palette-tint, beat-react). Zero code. Highest authorship-per-effort.
  - **Tier 2 (launch/near): Preset + slider curation.** Combine algorithm + palette + slider params → save named preset → it enters the rotation as "Sean's <name>". Zero code, zero art files.
  - **Tier 3 (portability phase): Code scene contract.** A documented `scene(id, (ctx, audio, t) => {...})` API with full canvas + audio access. This is the SAME contract the built-in scenes use — dogfooded. Unlimited power. Enables AI/tools to author scenes too.
  - **Tier 4 (end-game): AI text-to-scene.** Text prompt → AI emits a Tier-3 scene (or an asset). Most complex, likely paid API — defer to end-game alongside Spotify.
  - Key architectural consequence: **the scene plugin contract (Tier 3) is the foundation everything else compiles down to.** Built-in scenes, asset-scenes, and preset-scenes should all be expressible as scene-contract objects. Design the contract first.

### Q5: How do the player and visualizer share the screen?
- **Recommended:** Fullscreen visuals + floating player that auto-hides.
- **Sean's answer:** Fullscreen visuals + floating player that auto-hides.
- **Implication:** ONE layout serves both use-cases. Visualizer = full viewport (the beauty + the gallery-background job). The premium "pretty little screen" player is an overlay: glassy/glowing, floats (bottom-center default), and AUTO-HIDES after N seconds of no pointer/touch/key activity — reappears on mouse-move/tap/keypress (same UX as video-player chrome). Background mode = simply leave it hidden (and hide the cursor too when idle). Requires: an idle-timer + activity listeners, a fade transition (respect prefers-reduced-motion), and the control panel (Q2) sharing the same show/hide affordance. Fullscreen API support for true kiosk/background use.

### Q6: Rendering technology (the beauty ceiling)?
- **Recommended:** WebGL primary + Canvas-2D fallback.
- **Sean's answer:** WebGL primary + Canvas-2D fallback (max beauty).
- **Implication:** GPU rendering is the primary path — tens of thousands of particles, additive/bloom glow, fluid & plasma, depth, 60fps. Library choice TBD (likely a thin layer over raw WebGL, or three.js / pixi.js / regl / OGL — decide in planning; three.js gives the most out-of-box power, OGL/regl are lighter for portability). Canvas-2D is (a) the graceful fallback when WebGL is unavailable/`prefers-reduced-motion`/low-power, and (b) the EASY authoring surface for Sean's Tier-3 custom code-scenes (2D scenes are simpler to write). So the scene contract must support BOTH a WebGL scene type and a Canvas-2D scene type. Performance guardrails required: FPS monitor + adaptive quality (auto-reduce particle counts if the frame budget blows), respect reduced-motion, pause when tab hidden. Bundle-size watch (portability) — WebGL lib adds weight; lazy-load it.

### Q4 (Sean volunteered mid-grill): The music box must be "the real deal," not generic.
- **Sean's answer:** Must play his own MP3s AND other audio types; must have a "pretty little screen and everything" — a real, premium music player, not a bare play button.
- **Implication:** The music-box shell is a first-class premium UI surface, not an afterthought. Requirements captured: upload/queue local files (MP3 + other formats — AAC/M4A/WAV/OGG/FLAC where the browser supports them), a real playlist/queue, transport controls (play/pause/next/prev/seek/volume/shuffle/repeat), now-playing display with track title + optional album art (read from file metadata/ID3 tags when present), and a beautiful "pretty little screen" — album art + waveform/spectrum readout + track info styled to the Crystalline Swan aesthetic. Reduced-motion + accessible controls (44px targets, keyboard) per house rules. The visualizer and the music box are two halves of one polished product.

### Q7: What does "portable" mean in code terms?
- **Recommended:** React component + framework-agnostic core engine.
- **Sean's answer:** React component + framework-agnostic core engine.
- **Implication:** TWO-LAYER architecture.
  - **Core engine = plain framework-agnostic TypeScript** (no React): `AudioEngine` (Web Audio AnalyserNode → beat/bass/mid/treble/volume/waveform), `VisualEngine` (WebGL+Canvas2D renderer), `SceneLibrary` (all scenes as scene-contract objects), `Director` (weighted shuffle, cross-fade, param mutation), `PlayerCore` (playlist/transport/metadata). Distributable as a bare `<script>` on any HTML page → enables the "become its own standalone product" path.
  - **React wrapper = `<SwanVisualizer />`** — thin, props-configurable (`palette`, `mode`, `autoHideMs`, `scenes`, `initialPlaylist`, `showPlayer`, etc.), zero assumptions about SwanStudios' state/router/theme. Import = the entire port. styled-components for the shell UI (house rule 1), Crystalline Swan tokens with fallbacks (rules 3/6).
  - Consequence: engine gets its own test suite independent of React; the demo/standalone page and the SwanStudios embed both consume the same core.

### Q8a: How many built-in scenes for the first "wow" version?
- **Recommended:** 6–8 killer scenes across the 4 moods.
- **Sean's answer:** 6–8 killer scenes across the moods.
- **Implication:** Phase-1 scene set (draft, spanning all 4 mood families): dreamy organic bloom/petals, cosmic starfield/nebula, geometric mandala/sacred-geometry, psychedelic plasma/kaleidoscope, luminous particle spiral (fibonacci/golden), flow-field ribbons, + 1–2 more (bubbles/orbs, aurora curtains). Each polished, audio-reactive, and expressed as a scene-contract object.

### Q8b: How do we get the "rarely-repeats" feeling?
- **Recommended:** Smart param mutation + shuffle + scene-blending.
- **Sean's answer:** Smart param mutation + shuffle + blending.
- **Implication:** The DIRECTOR + per-scene parameter model is the core of the "endless" feeling, not raw scene count. Each scene exposes many tunable params (palette, density, speed, symmetry, shape, glow) that (a) re-seed randomly each time the scene starts and (b) drift/mutate continuously while playing. The director shuffles scenes AND can cross-blend two simultaneously. Result: even 6–8 base scenes → effectively non-repeating. This is the real reason iTunes felt infinite. Build the mutation/blend engine as a Phase-1 priority; adding more scenes later compounds on top of it (so effectively "both" — mutation now, scenes over time).

### Q9: Where do MP3s come from; persist them?
- **Recommended:** Local file pick/drag now; persist locally (IndexedDB) later; server/gallery music at port time.
- **Sean's answer:** Local file pick/drag now; persist locally later.
- **Implication:** Phase 1 music box is 100% client-side & backend-free — File API drag-drop / picker, plays via object URLs, private, instant. ID3/metadata read client-side (jsmediatags or Web equivalent) for title/artist/album-art. Later slice adds IndexedDB persistence for library + saved playlists + saved custom presets/scenes. Server-hosted / gallery-owned music is a SwanStudios-port-phase concern, keeping standalone-first clean.

## Key Highlights
- "Even more beautiful than iTunes" + "extensive so it takes a long time before you see the same thing again" are the two load-bearing quality bars.
- Must accept Sean's own designs (plugin/scene contract) — this is what makes it *his*, not a clone.
- Doubles as a page background AND a standalone music box.

## Architecture Notes (parent / children / whole)
- **Parent surface:** TBD — standalone page first; later a background layer + optional music-box widget inside SwanStudios (candidate: gallery / user dashboard home).
- **Children / composed parts:** audio engine (Web Audio AnalyserNode), visual engine (canvas renderer + scene library), scene director/randomizer, music-box UI shell, custom-scene plugin slot.
- **Fit with the Product Core Loop / dashboards:** ambient/brand + delight layer; not part of log→save→chart directly, but supports "make milestones shareable" + gallery/community belonging.

## Suggestions & Enhancements (Phase 2 — grill-me's recommendations)

**Things genuinely missing from the plan that strengthen it (surgical, not scope-for-its-own-sake):**

1. **Mic / line-in mode ("react to ANY sound").** Beyond MP3s, let the visualizer react to the device microphone (with permission). Instant party/ambient mode — react to a room, a Spotify song playing on external speakers (this is the *real* bridge around the Spotify-no-raw-audio wall!), a voice, anything. ~Small add on top of the audio engine (swap the source node). High delight-per-effort. **Recommend for Phase 1 or 2.**

2. **"Spotify wall" workaround via mic, stated plainly.** Because Spotify's API gives no raw samples, the honest path to "visualize my Spotify" without their (limited, now-deprecated) audio-analysis endpoints is: play Spotify out loud (or via loopback) → mic/line-in drives the visuals. Frame Spotify/Pandora *metadata* integration (tempo/energy/beat-grid) as a *separate, softer* end-game feature, not the primary path.

3. **Snapshot / record-a-moment.** A button to (a) save a still PNG of a beautiful frame, and (b) optionally record a short video/GIF loop of the current visual. This directly feeds SwanStudios' "make milestones shareable" core-loop goal AND your content-studio/gallery ambitions — a visualizer that produces shareable art is worth more than one that's only live.

4. **Beat-sync sensitivity + genre-friendliness.** A sensitivity/smoothing control so it looks great on both a quiet ambient track and a heavy bass track. Without it, one config looks dead on soft music and chaotic on loud music. Small, high-impact.

5. **"Idle / no-music" ambient mode.** As a *gallery background*, it must look gorgeous even when no music is playing (slow, breathing, self-animating). Don't let the visuals freeze to nothing without audio — drive them with a gentle synthetic oscillator when silent. Essential for the background use-case.

6. **Share/export a scene or preset as a file.** Since you're making your own looks (Tier 2/3), let a preset/custom-scene export to a small file you can re-import or hand to someone. Makes "my designs" portable and future-proofs a community/marketplace angle.

7. **Performance & battery safety as a feature, not an afterthought.** Fullscreen GPU animation can cook a laptop/phone. Adaptive quality, pause-on-hidden-tab, an explicit "low power" toggle, and reduced-motion honoring (house rule 25) protect the experience and the device.

8. **Accessibility floor (house rules 2/7/25).** Photosensitivity is real — a strobe/flash limiter and a reduced-motion path aren't optional for a light-show. 44px controls, keyboard transport, focus states on the player. Bake in from Phase 1.

**Deferred / end-game (agreed, parked):**
- Spotify / Pandora **metadata** integration (OAuth login, tempo/energy/beat-grid drive) — Phase 4.
- Tier-4 **AI text-to-scene** generation — Phase 4, likely paid API.
- SwanStudios server-hosted / gallery-owned music streaming — port phase.

## Minimal-Click Opportunities
- **Start the show:** land on page → it's ALREADY running the ambient auto-show (0 clicks to beauty). Music is the only thing that needs a click.
- **Play your music:** drag an MP3 anywhere onto the screen → it plays + visuals react. Target **1 action** (drag-drop), not "open menu → upload → select → confirm."
- **Go full background:** one control (or press F) → fullscreen + hide all chrome + hide cursor. 1 click to "gallery mode."
- **Save a look you love:** one "❤ freeze & save" button captures the current scene + its mutated params as a named preset. 1 click, not a settings dialog.
- **Grab a shareable image:** one "📸" button → PNG of the current frame downloads. 1 click.

## Whole-System Fit (parent / children / app)
- **Standalone (now):** its own `/visualizer` demo page (or a tiny standalone HTML shell) is the parent. Children = player shell, visual canvas, control panel, scene library.
- **SwanStudios (port):** best homes = (a) a full-screen **gallery/ambient background** mode behind a page, and (b) a **user-dashboard delight widget**. Because the core is framework-agnostic and the wrapper is one `<SwanVisualizer />` prop-driven component, the port is an import + palette prop, not a rewrite.
- **Brand coherence:** ships with a **Crystalline Swan palette skin** as one of several themes, so in-app it looks native (rules 3/6 token-with-fallback) while standalone it can be any mood.
- **Core-loop tie-in:** not part of log→save→chart, but the **snapshot/record** feature (#3) plugs into "make milestones shareable" + community/gallery belonging (rule 62), which is why it's worth more than a pure ambient toy.

## Minimal-Click Opportunities
<!-- filled in Phase 2 -->

## Theme System Architecture (Kimi K3 plan — 2026-07-22, ~$0.14)
Full plan: `docs/ai-workflow/AI-HANDOFF/KIMI-PLAN-visualizer-theme-system-2026-07-22.md`. Distilled:

- **Core idea — theme is NOT a skin.** A "world" = `palette × algorithm set × param ranges × audio mapping × post-processing × motion character` (palette is 1 of 6 axes). Forest/Glacier/James Webb differ because they use **different algorithm kernels + post + audio bindings + motion**, not a hue rotation.
- **Three authoring tiers:** Tier 0 = end-user composes in-UI (no code); Tier 1 = dev ships a **manifest JSON only** = a whole new world, zero TS; Tier 2 = dev ships manifest + one custom algorithm module (Canvas2D fn and/or a single fragment shader).
- **Two engine primitives:** `AlgorithmDefinition` (registered, param-schema'd generative algo with 1–2 renderer backends) and `ThemeManifest` (declarative data selecting/parameterizing/sequencing algorithms). The engine never special-cases "theme."
- **Manifest schema** (`ThemeManifest`): id/name/tags, `palettes[]` (weighted), `background`, `algorithms[]` (weighted slots with param overrides + ranges + audioMap), `director` (hold/crossfade/mutation), `motion`, `post` (bloom/feedbackTrail/grain/frost/chromatic), `safety` (**maxFlashHz — validator REJECTS >3, WCAG 2.3.1** + reducedMotion block). Safety enforced at the DATA layer via `validateTheme` → **user-created themes cannot bypass strobe safety.**
- **~10 built-in kernels** (flowField, particleSystem, deepField, strata, crystalGrowth, fogDrift, volumetricNoise, branchLSystem, kaleido, waveformRings), each ≤300 lines, each in BOTH backends → Tier-1 manifest-only themes work on WebGL.
- **Dual renderer:** native WebGL match → Canvas2D-hybrid (2D algo drawn offscreen, uploaded as texture, composited with post/crossfade) → shader-fallback. Fragment-only authors get a standard uniform contract (`u_time,u_res,u_bands,u_beat,u_wave,u_palette[8],u_feedback`) so ~20 lines of GLSL = a new algo.
- **Add-a-theme path:** `mkdir src/themes/<name>` → write `manifest.json` (+ optional `.algorithm.ts`) → auto-discovered via adapter (`import.meta.glob`), zero core/registry/UI/director edits. Bad manifest logs a named error and is skipped, never crashes.
- **Theme Studio (in-UI):** 3-step modal (Algorithms grid w/ live thumbnails → Palette & World → Tune & React) with **schema-driven controls** (one `ParamControl` component renders every param from its `ParamDef`), live real-engine preview, IndexedDB persistence (`user:` ids). Advanced "import algorithm module" = arbitrary-code-exec by design → explicit consent gate, never auto-load from shared files.
- **Import/export:** `.swantheme.json` envelope (manifest = fully safe to share; embedded custom code = opt-in, consent-gated). `schemaVersion`+`formatVersion` migration ladder. author/license/minEngineVersion fields already present → future marketplace is a hosting problem, not a format change.
- **Migration (NO rewrite):** current `Scene{draw}` → `AlgorithmDefinition.backends.canvas2d` (mechanical wrapper, `mood`→`tags`); `Palettes`→`PaletteDef[]`; `Director`→`ThemePlayer` reading manifest config (same math); wrap the 8 existing scenes into 4 starter mood-themes so day-one behavior is identical. AudioEngine + Player untouched.
- **Kimi's worker-bot build order:** (1) land types+registry+validateTheme; (2) wrap 8 scenes + 4 mood themes (regression checkpoint); (3) ThemePlayer + hybrid compositor; (4) port 2–3 scenes to dual-backend kernels + fill to 10; (5) Theme Studio UI + IndexedDB + import/export; (6) ship james-webb/glacier/forest content. Delete nothing until step 5 stable.

## WebGL "Best-Ever" Vision + Artistry (Kimi K3 plan #2 — 2026-07-22, ~$0.11)
Full plan: `docs/ai-workflow/AI-HANDOFF/KIMI-PLAN-visualizer-webgl-artistry-2026-07-22.md`. Sean's mandate: WebGL first (then Theme Studio); best visualizer ever; deep control; a true AUTO mode that walks the eye through every beautiful pattern, musically. Distilled:

- **Renderer:** bespoke **raw-WebGL2 micro-engine ("SwanGL", ~1,200 lines, zero deps)** — NOT pixi/three/OGL. Rationale: ~90% of the catalog is fullscreen fragment shaders + point-sprite particles (not a scene graph); zero dependency = perfect portability + code-splits entirely behind `import('./gl/SwanGL')` so the 2D path ships alone. OGL is the documented fallback if GPU fluid gets gnarly.
- **GPU pipeline (pass order):** audio textures (wave+fft as 1D R32F) → sim passes (transform-feedback particles / fluid / reaction-diffusion) → scene pass → HDR FBO (RGBA16F, with `u_morph` A/B blend during transitions) → feedback/trails → bright pass → 5-level bloom pyramid → composite (chromatic aberration beat-scaled → grain → vignette → ACES tonemap → sRGB + blue-noise dither). HDR-until-final is what gives *true* glow (2D fakes it with `lighter`).
- **Scene contract v2:** additive to the existing manifest — `{id, family, mood[], gpuCost, strobeRisk, audioMap, params, renderer:'gl'|'2d'|'both', frag?, particles?}`. Standard uniform contract (`u_time,u_dt,u_beat,u_beatPhase,u_bpm,u_sceneAge,u_morph,u_res,u_bands,u_wave,u_fft,u_palette[8],u_feedback,u_params[12],u_strobeGuard`) → a scene = one GLSL function (~40 lines). Old Canvas-2D scenes keep running under the fallback renderer, marked `renderer:'2d'`.
- **Degradation ladder:** WebGL2 → WebGL1 (ping-pong FBO particles) → Canvas-2D (existing 8 scenes = guaranteed floor). One `IRenderer` interface so Director/themes don't care. Adaptive quality governor (FPS EMA, hysteresis): DPR 2→1→ bloom 5→3 → particles ×0.5 → trails off → 2D. Reduced-motion enforced in the UNIFORM layer (works in both pipelines). **Strobe safety = a luminance-flash detector clamping `u_strobeGuard` BELOW Director/scenes/themes — un-overridable, both pipelines.**
- **GPU particles:** WebGL2 transform-feedback (audio sampled in the sim shader → particles literally dance to the waveform); 50k baseline / 250k high / 500k show-off, governor-gated. WebGL1 = ping-pong RGBA32F, half budget.

### The 44-algorithm catalog (the artistic core)
Six families: **Particle & Flow (9)** — Silk Flow, Murmuration, Strange Weather (Lorenz), Clifford Drift, Amber Fluid (real Navier-Stokes), Gray-Scott Garden (reaction-diffusion), Magnet Sands, Ember Rise, Tidal Particles. **Geometric & Symmetry (9)** — Mandala++, Kaleidophonic (wedge = live waveform), Truchet Cathedral, Moiré Veils, Penrose Sun, Julia Voyage (deep zoom), Flame Fractal, Lindenmayer Grove, Impossible Stair (Escher). **Organic (8)** — Physarum Veins (slime-mold), Petal Engine, Dendrite Frost (DLA), Biolume Deep, Aurora Ribbons, Smoke Cathedral, Caustic Pool, Coral Chorus. **Cosmic (7)** — Parallax Deepfield, Nebula Forge, Spiral Galaxy (200k particles, density waves), N-Body Ballet, Event Horizon (wormhole raymarch), Comet Choir, Pulsar Grid. **Waveform & Spectral (7)** — Oscilloscope Prime, Radial Spectrum, Spectrogram River, Lissajous Temple, Chladni Plate (physics-true cymatics), Frequency Terrain, Ribbon Notation. **Signature Swan (3, the ones nobody else has):** **CYGNUS** — 100k-particle murmuration that *converges into the Crystalline Swan silhouette on the drop*, holds a phrase, scatters (SDF of the swan mark); **FROZEN FOREST** — black-ice vault, dendrite frost grows inward while aurora glows through the crystal; **PELAGOS** — deep-ocean biolume vault, pitch black at silence, every beat sends a wavefront of living light.

### The AUTO director (the soul) — 4 modules, renderer-agnostic
- **MusicBrain (perception):** onset detector (spectral flux → beats w/o a grid), tempo estimator (autocorrelation → BPM + beat phase), energy model (short-term vs 30s average → calm/groove/build/drop), section detector (verse/chorus/drop + phrase clock at 4/8/16 bars).
- **Dramaturge (selection):** scores every scene at each phrase boundary = energyMatch + moodMatch + **coverageBoost (rises the longer a family is unseen — the coverage guarantee is STRUCTURAL, provably visits all 6 families over ~20 min)** + noveltyBoost (hard no-repeat floor) + paletteDiversity − recentness.
- **Transition grammar:** morphs not cuts, fired on phrase boundaries, beat-locked; 5 styles — Dissolve, Beat-Strobe Cut (strobe-guarded), Feedback-Warp, **Particle Handoff (A's particles fly to B's initial conditions — the showstopper)**, Iris. Plus intra-scene param random-walk + palette hue drift.
- **Curated Journeys (data-only mood graphs):** Cosmic Voyage (→ CYGNUS finale), Into the Forest, Geometric Descent, The Deep, and "Everything" (free-roam w/ coverage guarantee). Blendable (e.g. 70% Cosmic Voyage / 30% surprise).

### Control surface (deepest ever, effortless default) — 3 tiers, one schema
- **Tier 1 always-on:** Play, AUTO on/off, vibe quick-strip. **Tier 2 quick panel:** global (intensity/speed/sensitivity/bloom/trails/symmetry/mirror/zoom/rotate/bg/color-cycle) + **macro VIBE KNOBS** each retuning dozens of params: 🌀 Chaos↔Order, 🔥 Warm↔Cool, ✨ Sparse↔Dense, 🐢 Slow↔Fast + palette/transition/journey pickers. **Tier 3 Studio:** audio-routing matrix (any band/onset/energy/beat-phase → any routable param, per-route amount + curve), per-scene full params + enable/disable (curate your rotation), strobe readout (visible, not disableable), preset save/export/import (JSON, URL-hash shareable), HDR snapshot.

### Kimi's build order (13 non-destructive slices, ≤300-line files, 2D stays shippable until replaced)
1 IRenderer wrap (parity) → 2 SwanGL core (HDR FBO+ACES, lazy-import) → 3 uniform bridge + strobe-guard + reduced-motion (shared) → 4 post stack (bloom/trails/grain) → 5 scene contract v2 + 5 shader ports → 6 GPU particles + 5 particle scenes → 7 catalog wave 1 (12 scenes) → 8 MusicBrain → 9 Dramaturge + morph transitions + coverage ledger (AUTO v2 live) → 10 catalog wave 2 + 3 Swan signatures (CYGNUS last) → 11 full control surface + vibe knobs + presets → 12 journeys + polish → 13 (post-launch) Theme Studio.

## Proposed Build Phases (draft — for recursive planning)
- **Phase 1 — Standalone "wow" core:** framework-agnostic engine (AudioEngine + WebGL VisualEngine + Canvas2D fallback), 6–8 scenes across 4 moods, the mutation/blend Director, the premium auto-hiding music box (local file play, ID3, transport, playlist), idle-ambient mode, adaptive-quality + reduced-motion + strobe limiter, runs on its own demo page. **Milestone: it's beautiful and plays your music.**
- **Phase 2 — Custom designs + portability:** the `<SwanVisualizer />` React wrapper (prop-driven, Crystalline Swan skin), Tier-1 asset-drop scenes, Tier-2 preset/slider save, IndexedDB persistence, mic/line-in mode, snapshot/record, export/import presets.
- **Phase 3 — Extensive scene library + Tier-3 code scenes:** many more scenes (flowers/bubbles/orbs/fractals/kaleidoscope), the documented `scene(id, fn)` code contract, fullscreen/kiosk polish, port into SwanStudios (gallery background + dashboard widget).
- **Phase 4 — End-game:** Spotify/Pandora metadata OAuth integration, Tier-4 AI text-to-scene generation, server/gallery-hosted music.

## Recommended Rendering Library (to confirm in planning)
- Candidates: three.js (most power out-of-box, heavier), pixi.js (2D-GPU, great for particle bloom, lighter), OGL / regl / raw WebGL (lightest, most portable, more manual). Lean **pixi.js or OGL** for portability + particle strength; decide during recursive planning. Lazy-load whichever, to protect SwanStudios bundle size.

### Q10 (Sean volunteered post-prototype): Extensible THEME system — Kimi to plan.
- **Sean's ask:** "A way to add more themes easily" — named themes like Forest, Glacier, James Webb telescope, Nebula, etc. CRUCIALLY: themes are **not just recolors**. A theme can **change the entire way the algorithm works** so it produces genuinely different views. And there must be a way to **create new algorithmic themes**, not only pick from presets. Sean wants **Kimi** to build out the plan for making theme-adding easy.
- **Implication:** This RECONCEPTUALIZES the "custom designs" stack (Q3) and the scene/palette split. Two dimensions were conflated and must be separated cleanly:
  - **Palette** = color only (already exists: swan/aurora/ember/mono/auto).
  - **Scene/algorithm** = the generative math (bloom, spiral, nebula, mandala, flow, kaleido, orbs, wave).
  - **THEME (new, per Sean)** = a named bundle that can override BOTH — a curated palette AND a set of algorithms AND their parameter ranges — such that selecting "James Webb" vs "Forest" vs "Glacier" yields a distinctly different *world*, not a re-tint. A theme may ship its own brand-new algorithm(s).
  - So the object model becomes: **Theme → { palette(s), scene set (built-in refs + custom algorithm modules), param ranges/defaults, mood weighting, motion character }**. The Tier-3 scene-code-contract (Q3) is what a theme's custom algorithm plugs into. Themes must be **addable easily** (declarative manifest + optional algorithm module) and **user-creatable** (from the UI: compose existing algorithms + palette + ranges → save as a named theme; and, advanced, register a new algorithm).
- **Routing decision:** Sean explicitly wants **Kimi to build out the theme-extensibility plan/architecture**. Hand off a scoped brief to Kimi (via consult transport) asking for the best easy-to-extend theme architecture: theme manifest schema, how a theme overrides algorithm+palette+params, the add-a-theme developer path, the create-a-theme-in-UI user path, and how custom algorithmic themes register against the scene contract. This is a planning consult, NOT a build-by-Claude item yet.

### Q11 (Sean, 2026-07-22, mid-WebGL-build): Silent mode brain + Edgerunners world + keep the artistry coming
- **Sean:** "ask Kimi what to do for a silent mode where there is no music, and we want just beautiful visualizations. Implement a deep comprehensive feature model that connects to that brain and is smart as well. I love that whole brain thing and making it smart like a DJ — build onto that art and ideas and creativity. And you're always gonna have a Cyberpunk 2077 / Edgerunners vibe in there too — I love that show."
- **Implication / queued work:**
  1. **Silent mode = a first-class mode of the Director brain, not just synthetic-oscillator filler.** When there's no audio (or between tracks), the MusicBrain/Dramaturge should drive a *self-composed* generative performance — an internal "virtual conductor" that invents its own tempo/energy/section arcs so the visuals still build, breathe, peak, and morph like a real show. Comprehensive feature model connecting to the brain: internal LFO/oscillator bank + procedural energy envelope + phrase clock + journey selection, so silent mode is as intelligent and beautiful as music-driven mode. **→ Kimi consult after this build slice.**
  2. **Cyberpunk / Edgerunners world (standing catalog requirement):** a neon-noir night-city aesthetic must be in the catalog — think Night City: rain-slick neon, holographic glitch, chromatic aberration, scanlines, katana-cyan + hot-magenta + acid-yellow palette, brutalist megabuilding silhouettes, glitchy datamosh transitions. Add as a WORLD (theme) + likely 1-2 signature scenes (e.g. "NIGHT CITY" skyline + "GLITCH DIVE" datamosh). Pairs with the psychedelic/geometric families. This is a permanent Sean-love, keep it represented.
  3. **Keep pushing the artistic/DJ-brain angle** — Sean explicitly wants more creativity, not less. Every consult/slice should keep proposing marvelous new patterns and smart-director behavior.

## Sean's post-watch feedback + Kimi hostile review (2026-07-22, ~$0.08)
Full plan: `docs/ai-workflow/AI-HANDOFF/KIMI-PLAN-visualizer-hostile-review-2026-07-22.md`. Sean watched the live build; likes it, wants: more iTunes look, more colors + shapes, fix "big white blob" scenes (named **Aurora**, **Forest**), more randomness for LONGER (themes feel short). Kimi's verdict: "engine sound, tuning lazy — the white-blob defect is a pipeline-wide color-erasure cascade; variety problem is systemic (seen everything by minute 6)."

**Root cause of white blobs (5-stage cascade):** unbounded additive accumulation (3–6× HDR) → bright-pass threshold 0.4 catches the whole frame (bloom blurs everything, not just highlights) → bloom_amt 1.4 lifts mids to white → per-channel ACES desaturates toward white at the top (hue-erasure) → content sins (Aurora palette[4] near-white at the glow center; Forest stacks light-greens; both use too-broad `exp(-k*r)` falloff).

**Impact-ranked build order (Kimi):**
1. **Pipeline fix (★★★★★, fixes every scene):** luma-preserving tonemap (Reinhard-on-luma + RGB rescale, hue survives) replacing per-channel ACES; bright-pass threshold 0.4→0.85 + soft knee; bloom_amt 1.4→0.7; add `u_bloomScale` per-scene hook.
2. **Aurora + Forest surgery (★★★★★):** tinted glow not raw white (`glow*pal[i]`), tighter falloff (k×2.5 + pow shoulder), dark negative space, HDR ceilings (`col/=3.5; col=min(col,1.6)`); Forest → indexed `palRamp(f)` deep-teal→green→acid-yellow with dark leaf gaps. Freeze-frame acceptance test: <15% pixels above 0.9 luma / not within ΔE8 of white.
3. **Palette ramps (★★★★):** every palette a 5-stop ramp, ≥90° hue span, NO entry within ΔE10 of white, 3–4 palettes/world; `palRamp(field)` couples brightness↔hue (the "most iTunes-looking trick").
4. **Anti-repetition (★★★★):** coverage shuffle-bag (draw without replacement → 24 scenes × ~32s = 12.8 min before any recur); holdSec 16–40 → 24–70 (energy-correlated); macro-variant seeds per showing (symmetry 3–12, feature scale ×0.5–2.5, warp, palette offset, handedness → ~8 distinct variants/scene → 576 looks ≈ 5hr); incommensurate LFO intra-scene drift (0.113/0.071/0.047 Hz).
5. **New iTunes-core scenes batch 1:** Lissajous Scope, Starburst Rays, Voronoi Neon, Moiré Interference, Spectrum Ring (blob-proof by construction: dark bg, narrow-edge SDFs, ramp color).
6. **Hue-cycling** (3–8°/s, reduced-motion static) + director ≥60° hue-diversity rule between consecutive scenes.
7. New scenes batch 2 (9 more): Spirograph, Metaball Rims, Polar Tile Kaleido, Ribbon Waves, Halftone Pulse, Truchet Flow, Op-Art Twist, Ring Tunnel EQ, Circuit Hex.
8. Regression: strobe-guard amplitude caps, reduced-motion freeze, mobile ALU audit, Galaxy-Swan hex audit.

**Universal anti-blob contract for all scenes:** dark background (≤0.05 luma), shapes = narrow smoothstep edges (≤0.01 units), color via `palRamp(field)`, additive budget ≤1.6 HDR, hard `min()` ceiling. "Pipeline first, content second, always."

## "Next level": shapes + depth (Kimi hostile review #2, 2026-07-22, ~$0.13)
Full plan: `docs/ai-workflow/AI-HANDOFF/KIMI-PLAN-visualizer-depth-shapes-2026-07-22.md`. Sean's complaint after watching: still no distinct RANDOM SHAPES + wants it DEEPER/DENSER. Kimi's diagnosis: **the scenes are scalar noise-fields, which have NO topology to randomize** — a seed only shuffles the same fog. "Iso-contours of smooth noise are always the same gestalt." One layer = no depth cues.

**Strategy — seed the STRUCTURE not the phase.** Derive INTEGER structural knobs from the seed (sArms 3–9, sSides 3–7, sGlyph 0–5, sLattice sq/hex/tri/rnd, sTwist handedness, sDensity) and let them drive geometry — so a new showing draws a *different object* (5-arm spiral of hexagons → 8-fold lattice of triangles). This is the actual Milkdrop/iTunes trick: presets were parametric geometry systems whose integer knobs got randomized.

**Techniques (all fragment-only, cheap):**
- **Shared shape lib** (~90 lines, prepended to every scene): hash h21/h22, rot, SDFs (sdCirc/sdBox/sdSeg/sdNgon/sdStar), `pModPolar` (N copies for the cost of ONE SDF), `pMod2` (infinite lattice for one cell), stroke/glow inkers.
- **3-strata depth compositor:** FAR (small scale, slow, fogged toward pal[0]) + MID (hero geometry, bass-breathing) + NEAR (large, fast counter-rotation, treble pops). Parallax is free — each stratum samples at a different scale + rotates at a different rate (multiplane camera). This is the "DEEP" fix.
- **Incommensurate breathing:** irrational freq ratios (0.310/0.173/0.0717 Hz) so motion never phase-locks.
- **Density = repetition not loops:** pModPolar → N-arm mandala for 1 SDF; pMod2 → 200 traces for 1 cell; ONE 3×3 neighbor loop for voronoi/constellation. NEVER "for each of 200 particles."
- **Mobile budget:** 3 strata, ≤6 SDF/pixel, ≤1 neighbor loop (≤9 iter), ≤2 fbm octaves (far only), ~250–350 ALU → 60fps on A14/Mali-G78 at 1080p.

**10 new shape-forward scenes:** Hypotrochoid Loom (spirograph bundles — the flagship), Glyph Mandala Engine, Truchet Circuit, Voronoi Shatter, Constellation Net, Polygon Z-Tunnel, Ribbon Weave, Lissajous Harp, Gearworks, Starburst Echelon (cheapest = mobile fallback).

**Existing-10 verdicts:** RETIRE→replace: gl_aurora→Starburst, gl_nebula→Constellation, gl_frozen→Voronoi Shatter. UPGRADE: gl_mandala→glyph engine (structural anchor), gl_kaleido→folded glyph SDFs, gl_silk→countable ribbons, gl_nightcity→3 parallax strata, gl_glitch→beat shard scatter, gl_cygnus→connect points into graph, gl_pelagos→caustic voronoi floor. → 16 shape-capable scenes.

**Seed contract:** every scene consumes ≥4 of the 6 knobs mapped to INTEGER geometry (never phase). Quantified: 7×5×6×4×2 = **1,680 discrete macro-configs PER scene** × 16 scenes → structurally novel for >25,000 showings before an exact repeat (vs today: every gl_nebula showing is structurally identical).

**Build order:** (1) shared lib + seed unpack [foundation, land first] → (2) Glyph Mandala Engine + upgrade mandala/kaleido [biggest "whoa shapes" jump] → (3) 3-strata depth compositor + retrofit [the DEEP half] → (4) Hypotrochoid Loom → (5) Voronoi Shatter + Truchet Circuit → (6) Constellation + Starburst → (7) remaining upgrades → (8) QA. "After step 3 (~2.5 days) it already feels categorically different."

## Open Flags
- [ ] Spotify/Pandora developer accounts + API access (end-game; Sean to confirm if he has/wants dev credentials)
- [ ] Rendering library final pick (three.js vs pixi.js vs OGL/regl) — resolve in recursive planning
- [ ] Confirm audio formats to support beyond MP3 (AAC/M4A/WAV/OGG/FLAC) — browser-dependent; MP3+WAV+M4A are safe
- [ ] Component/product name — placeholder "Swan Visualizer" used in this doc
