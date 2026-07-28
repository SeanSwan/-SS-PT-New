# Kimi Brief — Extensible Theme System for the Swan Visualizer

**Date:** 2026-07-22 · **Remit:** architecture/design plan (front-end + canvas/WebGL) · **Privacy:** IDs/roles only, zero PII

## Context (what exists)
We are building a standalone **music visualizer / light-show** component (iTunes-style but more beautiful and far more extensive), designed to port into SwanStudios later. A working Canvas-2D prototype already exists with this architecture:

- **AudioEngine** — Web Audio `AnalyserNode` → `{bass, mid, treble, level, beat, wave()}`, sources = local MP3 file OR microphone.
- **VisualEngine** — currently Canvas-2D (WebGL is the planned primary for the production build).
- **SceneLibrary** — 8 scenes, each an object `{ id, name, mood, draw(ctx, audio, params, t) }`. Moods: dreamy / cosmic / geometric / psychedelic.
- **Director** — weighted shuffle + per-scene parameter mutation + cross-blend between two scenes; makes it feel endless with few base scenes.
- **Palettes** — color-only presets (swan / aurora / ember / mono / auto-pool).
- **Player** — premium auto-hiding floating music box; drag-drop MP3; ID3 art; transport.
- **Portability target** — framework-agnostic core (plain TS) + a thin React `<SwanVisualizer />` wrapper.

## The problem to solve (Sean's requirement)
Sean wants a **THEME system that is easy to extend** and goes beyond recoloring. Direct quotes:
- "a way to be able to add more themes... like Forest theme, Glacier theme, James Webb telescope, Nebula theme, etc."
- "or allow us to create new **algorithmic** themes as well — so it changes the entire way the algorithm works, so it gives different views. That needs to be part of the theme section too."

So a **Theme** must be able to override not just color but the **generative algorithm(s)** and their parameters, producing a genuinely different *world* (Forest ≠ Glacier ≠ James Webb as distinct visual universes, not tints). Themes must be:
1. **Easy to add** for a developer (ideally a declarative manifest + optional custom-algorithm module).
2. **Creatable by the user** from the UI (compose existing algorithms + palette + parameter ranges → save as a named theme).
3. **Able to introduce brand-new algorithms** (a theme can ship a novel generative scene, not only recombine built-ins).

## What we need from you (Kimi)
Design the **best easy-to-extend theme architecture** for this visualizer. Please deliver:

1. **Theme object model / manifest schema.** What fields a Theme declares — palette(s), which algorithms it uses (built-in refs + custom module refs), parameter ranges/defaults, mood weighting, motion character, background treatment, post-processing (bloom etc.). Show a concrete example manifest for e.g. "James Webb" and "Glacier" so the difference is obvious.
2. **The algorithm/theme relationship.** How a theme overrides or supplies algorithms cleanly against the existing `scene(id, draw(ctx|gl, audio, params, t))` contract. How a custom algorithmic theme registers a new algorithm. Keep the core engine framework-agnostic (plain TS).
3. **Two authoring paths:**
   - **Developer add-a-theme path** — drop a manifest (+ optional algorithm module) into a folder/registry; zero core edits. Show the file/registry shape.
   - **User create-a-theme path (in-UI)** — pick algorithms + palette + tune parameter ranges → save named theme (persist via IndexedDB); + an advanced hook for registering a custom algorithm. Show the minimal UI/data flow.
4. **Import/export.** A theme as a portable file (share/re-import), future-proofing a community/marketplace angle.
5. **WebGL consideration.** Since production is WebGL-primary with a Canvas-2D fallback, how the theme/algorithm contract supports BOTH renderer types without forcing every theme author to write shaders.
6. **Migration note.** How the current split (scene + palette + director) folds into the Theme model without a rewrite — what to rename, what to keep.

Constraints: styled-components-first for any UI, Crystalline Swan tokens with fallbacks, 44px touch targets, reduced-motion + strobe-safety honored, ≤300-line files, framework-agnostic core. Keep it practical and buildable by a worker-bot from your plan.
