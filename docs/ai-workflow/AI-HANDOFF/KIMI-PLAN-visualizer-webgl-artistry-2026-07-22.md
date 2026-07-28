# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-BRIEF-visualizer-webgl-artistry-2026-07-22.md
**Seed:** (none)
**Tokens:** 2273 in / 6906 out · **Cost:** ~$0.1104 · **Wall:** 260.8s

---

# Kimi K3 — Swan Visualizer: "Best Ever Made" Architecture & Artistic Vision

**From:** Kimi K3, SwanStudios front-end/generative-art · **For:** Sean · **Date:** 2026-07-22
**Verdict up front:** This is absolutely buildable, and the Canvas-2D prototype is a *gift*, not a liability — its scene contract, theme manifest, and AudioEngine port cleanly. Below is the full plan: engine, art catalog, director brain, control surface, and a non-destructive build order. I have tried to make Section B worth Sean's phrase *"really marvelous creative artistic ideas."*

---

## A. WebGL Architecture

### A.1 — Renderer choice: **bespoke micro-engine on raw WebGL2** (no library)

I evaluated pixi.js (~400KB, 2D scene-graph we don't need), three.js (~600KB, 3D scene-graph/cameras/meshes we mostly don't need), regl (nice but adds an abstraction tax and is in maintenance-mode), and **OGL** (~15–20KB gz, the strongest lib candidate).

**Recommendation: raw WebGL2 with a hand-rolled ~1,200-line micro-engine ("SwanGL").** Justification:

1. **Our workload is not a scene graph.** ~90% of the catalog is *fullscreen-quad fragment shaders*; the rest is *point-sprite particle systems*. Both need: program compile/link, FBO ping-pong, uniform upload, one quad VBO, one instanced-points draw. That is genuinely ~8 files of plain TS.
2. **Zero dependency = zero supply-chain, zero version drift, perfect portability** into SwanStudios — and the "lazy-load the WebGL lib" requirement is satisfied even better: the *entire* engine code-splits behind `import('./gl/SwanGL.ts')`, so the 2D path ships alone until needed.
3. **The uniform contract is ours to define** without fighting a lib's opinion. Scenes become pure shader strings + manifests — trivially hot-swappable, and the future Theme Studio can author them as data.
4. OGL remains the documented fallback if GPU fluid (multi-pass Navier-Stokes) proves gnarly — but fluid is also just ping-pong FBOs, which we're building anyway.

### A.2 — The GPU pipeline (pass order)

```
[1] AUDIO TEXTURES   wave(512×1) + fft(512×1) uploaded as R32F 1D textures each frame
[2] SIM PASS(ES)     particle update (transform feedback) / fluid / reaction-diffusion ping-pong
[3] SCENE PASS       active scene(s) render → HDR FBO (RGBA16F, linear space)
                     during transitions: scene A + scene B → HDR FBO with u_morph blend
[4] FEEDBACK/TRAILS  HDR FBO × previous frame (decay/warp/diffuse in shader) → trails FBO
[5] BRIGHT PASS      soft-knee threshold (palette-tinted) → brightA
[6] BLOOM CHAIN      5-level downsample gaussian pyramid → additive upsample combine
[7] COMPOSITE        scene + bloom×u_bloom + trails, then:
                     chromatic aberration (radial, beat-scaled) → film grain (hash, u_time)
                     → vignette → ACES tonemap → sRGB + blue-noise dither → canvas
```

All post passes are **independently toggleable and quality-scalable** (the governor below drives this). HDR until the final pass is what gives us the "true glow" the 2D prototype fakes with `globalCompositeOperation='lighter'`.

### A.3 — Scene contract v2 (shader-authored scenes)

The theme manifest evolves additively — old Canvas-2D scenes keep working under the fallback renderer:

```ts
interface SceneManifest {
  id: string; family: SceneFamily; mood: Mood[];      // ← feeds the Director (§C)
  gpuCost: 1|2|3; strobeRisk: 1|2|3;                  // ← feeds safety + quality governor
  paletteSlots: 8;
  audioMap: AudioRouting;                              // band → param defaults
  params: ParamSchema[];                               // ← auto-generates §D controls
  renderer: 'gl' | '2d' | 'both';
  frag?: string;                                       // fullscreen-quad scenes: JUST this
  particles?: ParticleSpec;                            // sim-scenes: this instead/additionally
}
```

**Standard uniform contract** — every fragment scene gets these, so authoring a scene = writing one GLSL function:

```glsl
uniform float u_time, u_dt, u_beat, u_beatPhase, u_bpm, u_sceneAge, u_morph;
uniform vec2  u_res;
uniform vec4  u_bands;        // bass, mid, treble, level — smoothed + normalized
uniform sampler2D u_wave;     // 512px waveform, 1D
uniform sampler2D u_fft;      // 512px spectrum, 1D
uniform vec3  u_palette[8];
uniform sampler2D u_feedback; // previous frame (post-trails)
uniform float u_params[12];   // schema-driven, routed to UI + audio
uniform float u_strobeGuard;  // 0..1 clamp from safety system — scenes MUST respect
```

A scene like the kaleidoscope is ~40 lines of GLSL against this contract. ≤300-line file budget holds easily: one file per scene, one per engine module.

### A.4 — Dual-renderer + graceful degradation

- **Capability ladder:** WebGL2 (transform feedback, float FBOs) → WebGL1 (ping-pong FBO particle sim via texture-encode, no TF; reduced bloom chain) → Canvas-2D (the existing 8 scenes, untouched, as the guaranteed floor). Detection once at boot; `IRenderer` interface identical across all three so Director/themes don't know or care.
- **Adaptive quality governor:** FPS EMA over 2s windows. Sustained <50fps → step down a ladder: DPR 2→1.5→1 → bloom 5→3 levels → particle count ×0.5 → trails off → final resort: 2D renderer. Recovers one step per 10s of >58fps. Hysteresis prevents oscillation.
- **Reduced motion:** `prefers-reduced-motion` → static-or-slow mode enforced *in the uniform layer* (`u_time` advances at 10%, `u_dt`-driven sims clamp velocity, camera/rotation frozen, transitions become 2s dissolves). Works identically in both pipelines because it's applied to uniforms, not renderers.
- **Strobe safety, both pipelines:** a rolling **luminance-flash detector** — sample frame luminance (GL: 1×1 mip readback async / 2D: existing ImageData path), count >20%-of-full-range transitions per second, and clamp `u_strobeGuard` so no scene can exceed ~3 flashes/sec regardless of audio input. This sits *below* the Director and *below* per-scene params — it cannot be overridden by themes, presets, or user settings. Non-negotiable, as specified.

### A.5 — GPU particles

WebGL2 **transform feedback**: position/velocity/life/seed buffers, one vertex-shader sim pass (audio sampled directly in the sim shader from `u_fft`/`u_wave` textures — particles literally dance to the waveform), then an instanced point-sprite draw with per-particle size/alpha/soft-sprite. Budgets: 50k baseline, 250k high, 500k "show-off" tier gated by the governor. WebGL1 fallback: same sim as ping-pong RGBA32F texture passes, half budget.

---

## B. The Algorithm Catalog — *the artistic core*

42 named algorithms, six families. Cost = GPU tier (1 light / 2 medium / 3 heavy). Every one runs against the §A.3 contract.

### B.1 Particle & Flow (9)

| # | Name | Visual character | Audio drives | Cost / Mood |
|---|------|-----------------|--------------|-------------|
| 1 | **Silk Flow** | Curl-noise field traced by 50k particle threads; long exposure via feedback | Treble → field scale; beat → palette drift; level → thread count | 2 / dreamy |
| 2 | **Murmuration** | Boids/flocking, 2k agents, predator-pulse on beat | Beat → scatter pulse; mid → cohesion; bass → speed floor | 2 / alive |
| 3 | **Strange Weather** | Lorenz attractor, 1000 tracers along the butterfly | Level → ρ parameter (laminar↔chaotic!); treble → hue | 1 / cosmic |
| 4 | **Clifford Drift** | Clifford/de Jong attractor plots, millions of points accumulate | Bass slowly walks a,b,c,d constants → the shape *mutates with the song* | 1 / hypnotic |
| 5 | **Amber Fluid** | Real GPU Navier-Stokes; audio injects dye + vorticity | Beat → dye burst at beat-grid positions; bass → swirl force | 3 / psychedelic |
| 6 | **Gray-Scott Garden** | Reaction-diffusion coral/maze patterns blooming live | Mid → feed rate (pattern species changes!); beat → seed splashes | 2 / organic |
| 7 | **Magnet Sands** | Iron-filings flow along a dancing vector field | Waveform *is* the field source; treble → grain fineness | 2 / elegant |
| 8 | **Ember Rise** | Buoyant sparks, wind from spectrum, ash-trail feedback | Bass → emission; treble → turbulence; level → heat palette | 2 / warm |
| 9 | **Tidal Particles** | Particles orbit invisible moving gravity wells | Beat spawns/moves wells; mid → orbit radius | 2 / cosmic |

### B.2 Geometric & Symmetry (9)

| # | Name | Visual character | Audio drives | Cost / Mood |
|---|------|-----------------|--------------|-------------|
| 10 | **Mandala++** | N-fold symmetry bloom; beat folds/unfolds petals | Beat → fold count morph; bass → petal depth; treble → filigree | 1 / sacred |
| 11 | **Kaleidophonic** | Kaleidoscope where the *source wedge is the live waveform* | Waveform feeds geometry directly; level → mirror count | 1 / psychedelic |
| 12 | **Truchet Cathedral** | Animated truchet tiles — quarter-circles flip into mazes | Beat flips tiles on grid; mid → tile density | 1 / playful |
| 13 | **Moiré Veils** | Interfering line/grating fields; slow rotation → impossible shimmer | Treble → line frequency; level → interference amplitude | 1 / hypnotic |
| 14 | **Penrose Sun** | Quasi-periodic kite/dart tiling, inflating/deflating | Bass → inflation depth; beat → tile highlight wave | 2 / sacred |
| 15 | **Julia Voyage** | Julia set with the constant orbiting slowly; deep zoom | Level → escape threshold; treble → constant's orbit speed; drops = dive | 2 / cosmic |
| 16 | **Flame Fractal** | IFS flame-fractal, soft gaseous geometric fire | Bands select active transforms; beat → density injection | 2 / warm |
| 17 | **Lindenmayer Grove** | L-systems growing/fractal-branching in real time | Beat → growth tick; mid → branch angle; treble → leaf glint | 1 / organic |
| 18 | **Sacred Lattice** | Flower-of-Life / Metatron constructions drawing themselves | Beat → next circle inscribed; level → recursion depth | 1 / sacred |
| 19 | **Impossible Stair** | Escher-esque isometric geometry, endlessly ascending on phrase boundaries | Phrase → structure rebuild; bass → block pulse | 2 / surreal |

### B.3 Organic & Natural (8)

| # | Name | Visual character | Audio drives | Cost / Mood |
|---|------|-----------------|--------------|-------------|
| 20 | **Physarum Veins** | Slime-mold agents depositing trails — living luminous mycelium | Mid → sensor angle (network rewires with harmony); beat → nutrient pulse | 2 / alive |
| 21 | **Petal Engine** | Parametric flowers bloom, breathe, shed petals into the flow | Beat → bloom; level → petal count; treble → dew sparkle | 1 / dreamy |
| 22 | **Dendrite Frost** | Diffusion-limited-aggregation ice crystals growing across the frame | Treble → growth speed; bass → crystal thickness | 2 / glacial |
| 23 | **Biolume Deep** | Deep-sea particles that flare when disturbed, then drift dark | Beat → disturbance wave; silence → near-dark (gorgeous dynamics) | 2 / oceanic |
| 24 | **Aurora Ribbons** | Layered auroral curtains — domain-warped fbm sheets with depth parallax | Mid → ribbon height; level → color temperature shift | 2 / glacial |
| 25 | **Smoke Cathedral** | Volumetric-feeling fbm smoke columns lit from within | Bass → column rise; beat → internal light pulse | 2 / dreamy |
| 26 | **Caustic Pool** | Water caustic interference, refracted light-dance | Beat → raindrop ripples; treble → shimmer frequency | 1 / oceanic |
| 27 | **Coral Chorus** | Recursive coral polyps that sway; colony grows over a track | Phrase → new polyp generation; mid → sway phase | 2 / oceanic |

### B.4 Cosmic (7)

| # | Name | Visual character | Audio drives | Cost / Mood |
|---|------|-----------------|--------------|-------------|
| 28 | **Parallax Deepfield** | 5-layer starfield, Webb-style diffraction spikes, subtle drift | Level → warp speed; treble → star twinkle; beat → spike flare | 1 / cosmic |
| 29 | **Nebula Forge** | Domain-warped fbm gas clouds with embedded starbirth | Bass → gas density; treble → star ignition rate | 2 / cosmic |
| 30 | **Spiral Galaxy** | 200k GPU-particle galaxy; differential rotation, dust lanes | Level → rotation; beat → arm compression wave (density waves!) | 3 / cosmic |
| 31 | **N-Body Ballet** | 512 gravitating lights, real N-body, slingshot trails | Beat → impulse kicks; bass → G constant | 2 / cosmic |
| 32 | **Event Horizon** | Wormhole/tunnel raymarch; accretion-glow palette | Level → travel speed; drop → horizon plunge | 3 / psychedelic |
| 33 | **Comet Choir** | Comets with curved ion tails orbiting a bright core | Mid → orbit eccentricity; beat → tail burst | 2 / cosmic |
| 34 | **Pulsar Grid** | Spacetime grid deforming under pulsing masses | Beat = the pulse; bass → grid depression depth | 1 / geometric |

### B.5 Waveform & Spectral (7)

| # | Name | Visual character | Audio drives | Cost / Mood |
|---|------|-----------------|--------------|-------------|
| 35 | **Oscilloscope Prime** | The honest classic — but HDR-bloomed phosphor persistence | Waveform raw; beat → trace color flip | 1 / pure |
| 36 | **Radial Spectrum** | Circular FFT bars that melt into particles at their tips | FFT direct; treble → tip emission | 1 / pure |
| 37 | **Spectrogram River** | Scrolling spectrogram as a flowing carved canyon | History accumulates → the song leaves a landscape | 1 / narrative |
| 38 | **Lissajous Temple** | 3D-feel Lissajous figures from band ratios | Band phase differences draw the figure; beat → symmetry jump | 1 / sacred |
| 39 | **Chladni Plate** | Cymatic sand patterns — resonant modes shifting with frequency | Dominant frequency → nodal pattern (physics-true!); beat → sand settle | 1 / sacred |
| 40 | **Frequency Terrain** | FFT as a flyable 3D mountain range, retro-future grid | FFT → heightfield; level → flight speed | 2 / retro |
| 41 | **Ribbon Notation** | 8 waveform ribbons, one per palette color, weaving in 3D space | Octave bands → one ribbon each; beat → weave tension | 1 / elegant |

### B.6 Signature "Swan" scenes (3) — *the ones nobody else has*

| # | Name | Visual character | Audio drives | Cost / Mood |
|---|------|-----------------|--------------|-------------|
| 42 | **CYGNUS** — the signature | 100k particles wander as a murmuration… and on the drop they *converge into the Crystalline Swan silhouette*, hold shimmering for one phrase, then scatter back into chaos. The brand made of starlight. | Beat-energy build → coherence field rises; drop = formation; breakdown = dissolution. Silhouette from a signed-distance field of the swan mark. | 3 / transcendent |
| 43 | **FROZEN FOREST** | A vault of black ice; dendrite frost (#22) grows inward from the frame edges while aurora light (#24) glows *through* the crystal — light trapped in a frozen cathedral. | Treble → frost filigree; mid → aurora glow within the ice; bass → deep slow cracks of light. | 2 / glacial |
| 44 | **PELAGOS** | Deep-ocean bioluminescent vault: darkness by default, and every beat sends a ripple of living light through a field of plankton-particles that flare and fade (#23 × #26 hybrid). Silence is pitch black — the scene *breathes with the arrangement*. | Beat → biolume wavefront; silence → void; vocal/mid band → color (violet↔cyan). | 2 / oceanic |

That's **44 algorithms** — a real claim to "all the shapes the eye can see," and every one is expressible against the §A.3 contract.

---

## C. The AUTO Director — *the soul*

Four cooperating modules (each ≤300 lines, plain TS, renderer-agnostic):

### C.1 MusicBrain (perception)
Beyond raw bands: **onset detector** (spectral flux → beats, even without a beatgrid), **tempo estimator** (onset autocorrelation → BPM + beat phase, `u_bpm`/`u_beatPhase`), **energy model** (short-term level vs. 30s moving average → *relative* energy: calm/groove/build/drop), **section detector** (energy novelty + spectral-change peaks → verse/chorus/drop boundaries, phrase clock at 4/8/16 bars).

### C.2 Dramaturge (selection)
Scores every scene every phrase boundary:

```
score(scene) = w1·energyMatch(scene.cost, song.energy)
             + w2·moodMatch(scene.mood, journey.mood)
             + w3·coverageBoost(scene.family, timeSinceFamilyShown)   // rises with neglect
             + w4·noveltyBoost(scene.id, timeSinceShown)              // hard floor: never repeat within N scenes
             + w5·paletteDiversity(scene.palette, lastShown)          // CIE-distance in color space
             - w6·recentnessPenalty                                   // exponential decay
```

The **coverage guarantee** is structural, not emergent: `w3` grows the longer a *family* is unseen, so over a ~20-minute session the Director is mathematically driven to visit all six families, and `w4` guarantees no scene repeats until the catalog has cycled. Over a long session, everything gets shown — Sean's "goes through everything the eye can see," provably.

### C.3 Transition grammar (musical, not random)
- **Transitions fire on phrase boundaries** (8/16-bar), beat-locked; emergency early-cut only on detected drop (energy spike >2σ).
- **Morphs, not cuts**, via `u_morph` in the composite pass: both scenes render into HDR FBOs and blend with one of five musical transition styles: *Dissolve* (ambient), *Beat-Strobe Cut* (drops; strobe-guarded), *Feedback-Warp* (scene A's trails distort into scene B), *Particle Handoff* (A's particles fly to B's initial conditions — the showstopper), *Iris* (geometric reveals for geometric families).
- **Parameter mutation within a scene:** while a scene lives, the Director slowly random-walks its `u_params` inside schema bounds + shifts palette hue ±15°/phrase — the current prototype's trick, upgraded so a single scene rarely looks the same twice.

### C.4 Curated Journeys (optional arcs)
A journey = a weighted mood graph + family itinerary + palette arc, data-only:

- **"Cosmic Voyage":** deepfield → nebula → n-body → CYGNUS (finale) — always ends on the signature scene.
- **"Into the Forest":** flow → physarum → lindenmayer → petals → frozen forest.
- **"Geometric Descent":** truchet → mandala → penrose → julia (descent = increasing recursion).
- **"The Deep":** caustics → coral → pelagos, palette cooling over time.
- **"Everything" (default):** free-roam with coverage guarantee; journeys are just priors on the Dramaturge weights, so users can blend "70% Cosmic Voyage, 30% surprise."

---

## D. The Control Surface — *most controllable ever, effortless by default*

**Three tiers, one schema.** Every param declares itself (`ParamSchema: {id, min, max, default, curve, audioRoutable, vibeKnobs[]}`), so UI auto-generates and presets are pure data (shareable via URL hash).

**Tier 1 — always-on (the default stays magic):** Play, AUTO on/off, vibe quick-strip.

**Tier 2 — quick panel:**
- **Global:** intensity, speed, sensitivity, bloom, trails, symmetry/mirror, zoom, rotate, background darkness, color-cycle rate.
- **Macro vibe knobs** (each retunes dozens of params through the schema's `vibeKnobs` tags):
  - 🌀 **Chaos ↔ Order** — noise scale, attractor constants, symmetry count, mutation rate.
  - 🔥 **Warm ↔ Cool** — palette temperature rotation across all themes.
  - ✨ **Sparse ↔ Dense** — particle counts, recursion depths, bloom threshold.
  - 🐢 **Slow ↔ Fast** — global `u_dt` scale, transition frequency, flow speeds.
- Palette picker (8 worlds + custom), transition style/length, journey selector.

**Tier 3 — Studio panel (the power user):**
- **Audio-routing matrix:** any band/onset/energy/beat-phase → any `audioRoutable` param, with per-route amount + response curve. ("Bass → kaleidoscope mirror count; treble → bloom threshold.") Routings save with presets.
- Per-scene full param exposure; per-scene enable/disable (curate your own rotation — Director respects it).
- Beat sensitivity, strobe limiter readout (visible, not disableable), reduced-motion override status.
- Preset save/export/import (JSON), snapshot-to-PNG (already exists — now HDR-tonemapped).

44px touch targets throughout; styled-components + Crystalline Swan tokens with fallbacks, per house rules.

---

## E. Build Order — non-destructive, worker-bot slices

Rule for every slice: **the Canvas-2D path stays shippable until its replacement has passed a regression checkpoint.** Delete nothing until the slice after stability.

1. **Slice 1 — `IRenderer` abstraction.** Wrap the existing 2D engine behind the interface; zero visual change. *Checkpoint: visual parity screenshot diff.*
2. **Slice 2 — SwanGL core:** context/capability detect, quad pipeline, HDR FBO, ACES tonemap. Render one test gradient. Lazy-`import()` wired. *Checkpoint: fallback to 2D forced works.*
3. **Slice 3 — Uniform bridge:** AudioEngine → `u_bands/u_wave/u_fft` textures + strobe-guard + reduced-motion uniform clamps (shared by both renderers from here on). *Checkpoint: strobe limiter unit tests on synthetic flashing input.*
4. **Slice 4 — Post stack:** bright pass, bloom pyramid, feedback trails, grain/vignette. *Checkpoint: 60fps at DPR2 on target hardware; governor ladder steps verified.*
5. **Slice 5 — Scene contract v2 + 5 shader ports:** kaleidoscope, waveform, starfield, mandala, flow (as Silk Flow). Theme manifest extended; old 2D scenes marked `renderer:'2d'` and still run. *Checkpoint: A/B parity or deliberate-improvement sign-off.*
6. **Slice 6 — GPU particles (transform feedback) + 5 particle scenes** from B.1/B.4. *Checkpoint: 250k @ 60fps; WebGL1 ping-pong path verified.*
7. **Slice 7 — Catalog wave 1** (12 scenes across all six families). No Director changes yet — manual scene picking.
8. **Slice 8 — MusicBrain** (onset/tempo/energy/sections) with debug overlay. *Checkpoint: tempo accuracy against a click-track test suite.*
9. **Slice 9 — Dramaturge + morph transitions + coverage ledger.** AUTO v2 goes live. *Checkpoint: scripted 30-min session → family coverage report shows all 6 families, no repeats.*
10. **Slice 10 — Catalog wave 2 + the three Swan signatures** (CYGNUS last — it's the crown jewel).
11. **Slice 11 — Full control surface + vibe knobs + preset/URL system.**
12. **Slice 12 — Journeys + polish + performance hardening.**
13. **Post-launch — Theme Studio** (authors manifests + fragment shaders against the now-stable contract; everything it needs already exists as data).

Each slice is independently mergeable, ≤300-line files throughout, and Sean can demo progress after every checkpoint.

---

### Closing note
The current prototype's best idea — *a theme is data* — scales all the way up: a scene is a shader + manifest, a journey is a graph, a preset is JSON, and the Director is just weights over that data. That's what makes "comprehensive and deep" cheap to grow forever. And CYGNUS — the murmuration that becomes the swan on the drop — is the moment that makes it *ours*. Nobody else will have that. 🦢
