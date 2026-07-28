# Crystal Ring 3D "Spectral Inheritance" DIRECTION locked (prototype gate, pre-build)

- **When:** terminal VS Claude, worktree C:/tmp/ss-charts-g3. Sean: current SVG ring "kind of
  boring — more colorful, more three.js/3D, out of the box, NO color-theme limits, fallbacks
  for potato PCs + phones." He also noted the last preview showed 5 sample levels, not the 20.

## Direction (Kimi K3 3D consult $0.052 + Claude fusion; NO code shipped yet — ideation gate)
- **Form:** a "Dispersive Prism Torus" — faceted crystal torus (lens, not tube). three.js
  MeshPhysicalMaterial: transmission 1.0, dispersion (r165+ native), iridescence, fresnel rim
  shell, PROCEDURAL env map (not HDRI), restrained bloom, slow rotation.
- **Color (THE one): "Spectral Inheritance"** — the DISPERSION carries color, not paint. Base
  near-colorless ice; the prism does the rainbow, keyed so the earned spectral band WIDENS with
  level (cool cyan-violet sliver at L1 -> full spectrum at L1000). OKLCH fixed L=0.72 C~0.15 =
  equal perceptual brightness = the trick that makes rainbow read as JEWELRY not gamer-RGB.
  Narrative = the product story in physics: "start as one color of light, earn the full spectrum."
- **Evolution:** fewer/bigger facets as you climb (24->8 = refinement not clutter); dispersion/
  IOR/spectral-range as continuous per-band dials; discrete era morphs; swan CUT INTO the crystal
  at the summit.
- **Tech decision: three.js VANILLA (not R3F), lazy-loaded via import().** Raw WebGL can't do PBR
  transmission (needs 2-pass framebuffer + PMREM + tonemap) without reinventing three.js badly.
  R3F adds reconciler overhead for a decorative aria-hidden component. ~150KB gz, lazy so the SVG
  tier never pays it. (Repo currently has ZERO three.js; raw-WebGL precedent is only fullscreen
  shader planes, not a PBR gem.)
- **3 fallback tiers (reuse cosmicPerformanceOptimizer):** FULL (WebGL2 desktop, real dispersion+
  bloom+particles) -> MID (phones: drop dispersion/bloom/particles, KEEP the material, 0.5x
  transmission buffer, DPR 1.5, 30fps) -> SVG (existing evolution ring) for no-WebGL/reduced-
  motion/potato. Runtime demotion FULL->MID via 300-frame p95>22ms audit (never re-promote).
  Reduced-motion on capable HW = static WebGL frame, NOT SVG.
- **My addition:** ONE OKLCH color system shared across all 3 tiers (a crystalRingPalette module
  feeds BOTH the WebGL material AND the SVG gradient) -> even the phone/SVG fallback gets the new
  color. Unifies "more colorful" across every device.

## Traps to hold (Kimi): dispersion-not-hue-animation; OKLCH equal brightness; bloom <=0.5;
rotation <=6 deg/s; symmetric quantized facets (NO noise displacement); only the torus saturated
(dark quiet room bg, e.g. #0d1b24->#05080d, NOT the banned #0a0a1a); ONE emissive system max (here
zero). Full spec: KIMI-RING-3D-DIRECTION.md.

## State / next (Sean-gated before the heavy build)
Published a self-contained raymarched-GLSL PROTOTYPE artifact (can't load three.js off a CDN) so
Sean can SEE the Spectral direction + scrub all 20 bands + compare 3 color modes. AWAITING Sean:
(1) pick the color direction, (2) approve installing three.js + the ~600-line production build.
Then: install three + build createCrystalRing.ts + the 3-tier gate + SVG palette upgrade.
