# Kimi Brief — HOSTILE Design Review + Fine-Tune Plan for the Swan Visualizer

**Date:** 2026-07-22 · **Remit:** HOSTILE design review + concrete fix plan (generative art, color, variety) · **Privacy:** IDs/roles only.

## What this is
Sean has now WATCHED the live WebGL music visualizer (iTunes-style light show) and given direct visual feedback. He likes the direction but wants it richer and better-tuned. Your job: a hostile design review that turns his notes into a concrete, buildable fine-tune plan. Be specific — name scenes, name the shader techniques, give parameter directions.

## Sean's exact feedback (the authority — solve THESE)
1. **"I want more of the iTunes option look."** He likes the classic iTunes/WMP visualizer feel and wants MORE of it — flowing, colorful, generative, mesmerizing.
2. **"We need more colors and more shapes."** The current variety is too thin. More distinct visual forms, more color range.
3. **"Fine-tune the ones we have — some are just big white blobs, like Aura[ora] and Forest."** Specific defect: certain scenes wash out to large white/undifferentiated blobs instead of crisp, colorful, structured imagery. Aurora Bloom and Forest world are the named offenders. Likely causes to diagnose: additive HDR bloom blowing highlights to white, low color separation, palette not reading through, shapes too soft/large.
4. **"More randomness for longer — the themes feel short."** Worlds/scenes repeat too soon; the "rarely see the same thing twice" goal isn't hitting. He wants much longer before anything visually repeats.

## Current implementation (what exists — single-file WebGL prototype)
- **SwanGL** raw-WebGL2 engine: scene → HDR RGBA16F FBO → bright pass → 4-tap bloom pyramid → composite (bloom + chromatic aberration + grain + vignette + ACES tonemap).
- **10 fullscreen-quad GLSL scenes:** gl_aurora (Aurora Bloom — 6 petal loops + radial-gradient glow), gl_silk (curl-ish fbm flow), gl_nebula (domain-warped fbm gas + hash stars), gl_mandala (ring smoothsteps + spokes), gl_kaleido (mirrored fbm), gl_nightcity (parallax neon skyline), gl_glitch (RGB-split tunnel), gl_cygnus (40 motes → swan SDF), gl_frozen (edge frost + aurora fbm), gl_pelagos (36 biolume motes + beat wavefront).
- **Standard uniforms:** u_time, u_bass/u_mid/u_treble/u_level/u_beat, u_pal[5], u_intensity, u_strobeGuard.
- **9 worlds (themes)** = scene-set × palettes × background × motion × trail × holdSec (16–40s per scene). Palette = 5 hex per world, 2 palettes per world rotating.
- **Director/Dramaturge:** weighted shuffle + energy-matched selection + anti-repeat(last 3) + per-scene param re-seed. holdSec ~16–40s. Signature CYGNUS scheduled every ~5 switches.
- **Bloom:** bright-pass threshold 0.4, composite bloom_amt 1.4. Scenes use additive-style accumulation then get tonemapped.

## What we need from you (Kimi) — a concrete fix plan, section by section

### A. Diagnose & fix the "big white blob" defect (Aurora, Forest, any others)
Root-cause it against the pipeline above. Likely: additive accumulation + bloom_amt 1.4 + ACES pushing mids to white; radial gradients too broad; palette colors near-white (Aurora palette index 4 is near-white; Forest uses light greens). Give concrete fixes: threshold/bloom tuning, per-scene brightness clamps, higher color saturation/contrast, smaller/sharper feature scales, using more of the palette (not just the hottest color), a saturation-preserving tonemap tweak. Name exact shader-level changes.

### B. More colors — palette & color-variety plan
The palettes are 5 flat hex each. Propose: richer palettes, more of them per world, hue-cycling over time, per-scene palette mapping that uses the full ramp (not collapsing to white), a "color diversity" boost in the director so consecutive scenes contrast. Give specific palette design guidance (and note we must keep the Crystalline Swan brand skin as one option, honor rule 9 no-yoga, no retired Galaxy-Swan colors).

### C. More shapes — new scene ideas (the iTunes feel)
Sean wants more distinct forms and more of the classic iTunes vibe. Propose ~10–15 NEW fullscreen-quad GLSL scene concepts that (a) are cheap (fragment-only against the existing uniforms), (b) read as crisp colorful SHAPES not blobs, and (c) capture the iTunes/WMP feel — e.g. plasma fields, oscilloscope Lissajous, tunnels, voronoi cells, interference/moiré, spectrum bars, spirograph, metaballs with edges, kaleidoscopic tilings, starburst rays, ribbon waves. For each: one-line visual + which audio band drives it + how to keep it colorful & structured (anti-blob).

### D. More randomness, for longer — the anti-repetition plan
Sean feels the themes are short / repeat too soon. Propose concrete changes: longer & more varied holdSec, much wider per-scene parameter mutation ranges (so one scene looks very different each showing), scene-parameter randomization seeds that visibly change structure (symmetry count, feature scale, warp amount, color offset), continuous slow drift within a scene, a bigger anti-repeat memory, and a "coverage" system so it cycles the whole catalog before repeating. Quantify: with N scenes × wide param ranges × palette rotation, how long until visual repetition? Aim for "many minutes, ideally never obviously repeats."

### E. Prioritized build order
Rank the fixes by impact-per-effort so a worker-bot can execute: what to fix FIRST (the blob defect is probably #1), then color, then new shapes, then the randomness/duration system.

Be concrete and buildable — exact shader techniques, exact parameter directions, exact scene concepts. Constraints: fragment-only scenes against existing uniforms, cheap (mobile-safe), strobe-guard + reduced-motion still enforced, ≤300-line files.
