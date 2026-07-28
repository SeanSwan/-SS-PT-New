# Kimi Brief — Swan Visualizer: WebGL Upgrade + "Best Visualizer Ever" Artistic & Control Vision

**Date:** 2026-07-22 · **Remit:** creative + technical architecture plan (WebGL/canvas, generative art, UX depth) · **Privacy:** IDs/roles only, zero PII · **Ambition level:** MAXIMUM — Sean's words: *"make it the best player ever made… comprehensive and deep. It's a must. I'm expecting some really marvelous creative artistic ideas and flow patterns."*

## Context (what exists today — Canvas-2D prototype, live)
A standalone music visualizer / light-show (iTunes-style, but aiming far beyond it). Already built and working in **Canvas-2D**:
- **AudioEngine** — Web Audio `AnalyserNode` → `{bass, mid, treble, level, beat, wave()}`; sources = local MP3 file OR microphone (mic mode reacts to any room sound — also the honest workaround for Spotify's no-raw-audio wall).
- **8 scenes** across 4 moods (dreamy/cosmic/geometric/psychedelic): bloom, golden-spiral, nebula/starfield, mandala, flow-field, kaleidoscope, bubble-orbs, waveform-ribbons.
- **Director** — weighted shuffle + per-scene param mutation + cross-blend; makes few scenes feel endless.
- **Theme/World system** (Kimi's prior plan, steps 1-2 built): a theme = `palette × algorithm-set × params × audio-map × post × motion`. 8 switchable worlds shipped (Swan/James Webb/Glacier/Forest/Nebula/Aurora/Ember/Sacred Geometry). A theme is data; adding one = one object.
- **Premium player** — auto-hiding floating music box, transport, ID3 art, drag-drop, snapshot, fullscreen, idle-ambient, strobe limiter, one-action flows.
- **Portability target** — framework-agnostic plain-TS core + thin React `<SwanVisualizer />` wrapper.

## What Sean wants now (the mandate)
1. **WebGL upgrade first** (then a Theme Studio in a later slice). Move the rendering to the GPU so we get true bloom/glow, tens of thousands of particles, depth, feedback trails, fluid/plasma, 60fps — the beauty ceiling the classic iTunes visualizer never reached.
2. **The best visualizer player ever made** — the deepest, most comprehensive set of options, controllability, and visual variety anyone has shipped.
3. **A genuine AUTO mode** — "where the algorithm just does its own thing and goes through all the different shapes that can possibly be shown to the human eye." Endless, comprehensive, never-boring, self-directing. This is the soul of the product.
4. **Marvelous, artistic, creative flow patterns** — Sean is explicitly asking for *your* creative vision here, not just plumbing.

## What we need from you (Kimi) — deliver ALL of it, be ambitious and concrete

### A. WebGL architecture (buildable, worker-bot-ready)
- Recommend the rendering approach: raw WebGL2 vs a thin lib (pixi.js / OGL / regl / three.js) — weigh **portability + bundle size** (this ports into SwanStudios) against power. Pick one and justify.
- The GPU pipeline: how scenes render into a float/HDR framebuffer, then a **post-processing stack** (bloom/threshold, feedback/trails, chromatic aberration, grain, vignette, tone-map). Give the pass order.
- How the existing **scene contract** (`draw(ctx, audio, params, t)`) and the **theme manifest** evolve to support WebGL — including the standard uniform contract so a scene can be authored as *just a fragment shader* (`u_time, u_res, u_bands, u_beat, u_wave, u_palette[8], u_feedback`).
- **Dual-renderer / graceful degradation**: WebGL2 → WebGL1 → Canvas-2D fallback; `prefers-reduced-motion` + low-power + adaptive quality (drop DPR → drop post passes → drop particle count when FPS sags). Keep the strobe limiter enforced in BOTH pipelines.
- **GPU particle systems** (transform-feedback or ping-pong FBO) so we can push 50k–500k audio-reactive particles.

### B. The comprehensive scene / algorithm library (THE ARTISTIC CORE — go deep)
Sean wants "all the different shapes that can possibly be shown to the human eye." Propose a **broad, categorized catalog of generative algorithms** — far beyond the current 8 — each with a one-line description of its visual character and what audio drives it. Cover at least these families and invent within them:
- **Particle & flow** (flow fields, curl-noise, boids/flocking, strange attractors — Lorenz/Clifford/de Jong, GPU fluid/Navier-Stokes, reaction-diffusion/Gray-Scott).
- **Geometric & symmetry** (mandalas, kaleidoscopes, sacred geometry, truchet tiles, moiré, Islamic/penrose tiling, L-systems, recursive fractals — Mandelbrot/Julia/flame fractals/IFS).
- **Organic & natural** (bloom/petals, coral/dendrite growth, slime-mold/Physarum, bioluminescence, aurora, smoke/volumetric noise, water ripples/caustics).
- **Cosmic** (starfields with parallax, nebulae, galaxies/spiral arms, gravity/n-body, wormholes, diffraction spikes).
- **Waveform & spectral** (oscilloscope, radial spectrum, spectrogram ribbons, Lissajous, cymatics/Chladni patterns, frequency terrains).
- **Signature "Swan" moments** — 2-3 original patterns unique to this product that no other visualizer has, tied to the Crystalline Swan brand (swan silhouettes forming from particles, frozen-forest light, deep-ocean bioluminescent vault).
Aim for a catalog of ~30–50 named algorithms grouped by family, flagged by GPU-cost and mood. This is the "comprehensive and deep" Sean is asking for.

### C. The AUTO-mode director (the soul — "goes through everything the eye can see")
Design a **director/choreographer** far smarter than random shuffle:
- How it sequences through the *entire* catalog so, over a session, it truly showcases the full range without repeating or feeling random.
- **Musical intelligence**: match scene energy to the music (drop → explosive scene, ambient → calm scene; beat-locked transitions; build-ups and breakdowns). Use `bass/mid/treble/level/beat` + optionally tempo/energy estimation.
- **Parameter mutation & morphing** so even one algorithm is endlessly fresh; cross-fading/morphing *between* algorithms (not just cut).
- **Coverage guarantee** — an algorithm that ensures variety across families/moods/palettes over time (weighted, anti-repeat, "haven't shown this family in a while" boosting).
- **Curated "journeys"** — optional narrative arcs (e.g. "cosmic voyage," "into the forest," "geometric descent") the auto-director can follow.

### D. Depth of control & options (the "most controllable ever")
Enumerate the full control surface a power user gets (while keeping the default effortless + auto): global (intensity, speed, sensitivity, palette, bloom, trails, symmetry, mirror, zoom/rotate, background), per-scene params, audio-reactivity routing (which band drives which parameter), transition style/length, coverage/journey selection, beat-sensitivity, color-cycling, and macro "vibe" knobs (chaos↔order, warm↔cool, sparse↔dense, slow↔fast) that retune many params at once. Keep it schema-driven so controls auto-generate.

### E. Build order (worker-bot friendly, non-destructive)
A numbered slice plan to get from the current Canvas-2D prototype to the WebGL "best-ever" state without a rewrite — what lands first, what's a regression checkpoint, where the Theme Studio slots in afterward. Delete nothing until the new path is stable.

**Constraints:** framework-agnostic plain-TS core; React wrapper thin; styled-components + Crystalline Swan tokens with fallbacks for any UI; 44px touch targets; reduced-motion + strobe safety non-negotiable; ≤300-line files; lazy-load the WebGL lib to protect SwanStudios bundle size. Be concrete, be creative, and give Sean the marvelous artistic ideas he asked for.
