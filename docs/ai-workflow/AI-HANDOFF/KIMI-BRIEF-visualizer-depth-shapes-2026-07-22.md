# Kimi Brief — "Next Level": Real Random Shapes + Deep/Dense Animation

**Date:** 2026-07-22 · **Remit:** generative-art scene design — make it DENSE, DEEP, and full of DISTINCT RANDOM SHAPES · **Privacy:** IDs/roles only.

## The situation
Sean has watched the WebGL visualizer through several tuning passes. The white-blob defect is fixed (luma-preserving tonemap, high bloom threshold, saturated palettes) and anti-repetition (shuffle-bag + varied hold + macro-variant seeds) is in. **But Sean's core complaint remains:** "it still does NOT create shapes etc at random." And he wants it "more DEEP and DENSE as far as the animations go — take it to the next level."

## Diagnose the real problem honestly
The current 10 scenes are almost all **continuous fields** — fbm noise clouds (nebula, silk, frozen), radial glows (aurora), mirrored noise (kaleido). They *morph* but they don't produce **discrete, recognizable, varied SHAPES**. A field of noise, however pretty, reads as "a haze that changes," not "spirals, then polygons, then rings, then a lattice." iTunes/Milkdrop felt alive because it drew *structured geometry* — spirograph curves, tunnels, particle constellations, symmetric line-art — that visibly reconfigured. Also the scenes are **sparse/thin** — one glow layer, low element counts — so they don't feel deep or dense.

Sean wants: **distinct shapes that are randomly generated and vary a lot**, and **many more layers / much higher density** so each frame is rich and deep.

## What we need from you (Kimi) — the "next level" plan

### A. Why it doesn't read as "random shapes" — root cause + the fix strategy
Be specific about why fbm-field scenes don't satisfy "shapes at random," and lay out the strategy to fix it: shift the catalog from noise-fields to **procedural geometry** — parametric curves, SDF-composed forms, particle constellations, symmetric line-art, tilings — where a random seed changes the *structure* (number of arms, polygon sides, spiral tightness, lattice type), not just the phase. Explain how to make the SHAPE itself random per showing.

### B. A dense, deep, layered rendering approach (fragment-only, still cheap)
Give the concrete technique for DEPTH + DENSITY within a single fullscreen fragment shader against our uniforms (u_time, u_bass/mid/treble/level/beat, u_pal[5], u_featureScale/u_warp/u_symmetry, u_intensity, u_strobeGuard):
- **Layering:** multiple depth strata (parallax, scale, opacity) composited in one pass — foreground shapes, mid shapes, background field — so it feels 3D-deep.
- **Density:** how to draw MANY elements cheaply (domain repetition / `mod` tiling / instanced-in-shader loops / polar arrays) so hundreds of shapes appear without hundreds of iterations.
- **Motion depth:** counter-rotating layers, z-travel/tunnel feel, LFO-driven parameter breathing at incommensurate rates so it never phase-locks.
- Keep it mobile-safe: give the loop/iteration budget and the cheap tricks (domain repetition beats brute-force loops).

### C. 8-12 NEW dense, shape-forward scene concepts (the next-level catalog)
Each must (a) draw DISTINCT RECOGNIZABLE SHAPES (not a haze), (b) be DENSE and layered, (c) randomize its structure per seed, (d) be fragment-only + cheap. For each give: the shape system, how the seed varies the structure, audio mapping, and the density/depth mechanism. Lean into iTunes/Milkdrop DNA. Examples to go beyond: recursive polygon fields, spirograph/hypotrochoid bundles, SDF kaleido-lattices, particle constellations that connect into shapes, domain-repeated geometric tunnels, symmetric ribbon weaves, Truchet/circuit lattices, voronoi shatter, mandala arrays with per-cell geometry, star/burst fields, Lissajous bundles.

### D. Upgrade the existing 10 scenes toward shapes + density
For each current scene (gl_aurora, gl_silk, gl_nebula, gl_mandala, gl_kaleido, gl_nightcity, gl_glitch, gl_cygnus, gl_frozen, gl_pelagos): one concrete change to add a discrete-shape layer and more density, or a verdict to retire/replace it if it's fundamentally a haze.

### E. Wire the randomness so SHAPES actually change per showing
We already pass u_featureScale/u_warp/u_symmetry per showing but only 2 scenes use them. Give the plan to make EVERY scene consume structural seeds that change the shape count / type / recursion / lattice, so each showing is visibly a different configuration — and quantify the perceived variety.

### F. Impact-ranked build order
What lands first for the biggest "whoa, shapes, and it's DEEP now" jump.

Constraints: fragment-only against existing uniforms, cheap/mobile-safe (state the ALU/iteration budget), strobe-guard + reduced-motion enforced, no near-white palette entries, ≤300-line files. Be concrete with actual GLSL techniques and shape math (SDFs, polar mod, domain repetition, parametric curves). Sean wants to see STRUCTURED GEOMETRY that's random and DENSE.
