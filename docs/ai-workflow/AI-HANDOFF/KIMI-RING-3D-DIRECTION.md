# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (medium)
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/fc35ba13-48c4-4e2a-a55c-0b3010bed2f4/scratchpad/crystal-ring-3d-brief.md
**Seed:** (none)
**Tokens:** 1201 in / 3251 out | **Cost:** ~$0.0524 | **Wall:** 114.6s

---

# Crystal Ring — The Cinematic Pass

Sean's right — flat restraint was the wrong ceiling for the signature moment. Here's the build.

---

## (A) 3D Form + Material Model: **The Dispersive Prism Torus**

The ring is a **faceted crystal torus with a hollow lens core** — think a cut-gemstone donut where light enters, refracts, splits into spectrum, and exits. Not a tube: a *lens*.

**Geometry:**
- Base: `TorusGeometry(radius 1.0, tube 0.16, 128, 48)` — but displace vertices with a **low-frequency faceting**: quantize normals into ~24 planar facets per revolution (achieved by a flat-shaded custom geometry, NOT smooth shading). Facets catch hard speculars = "cut gem," not "blob."
- Era morph replaces the circle→hexagon→crown morph from SVG: the torus cross-section and revolution path interpolate between 4 silhouette super-shapes via vertex shader uniform (`uEra`, 0–3, eased). Same superformula math as the SVG morph, now on the revolution path — continuity with the old design, new dimension.
- **Inner crown disc**: at era 4, a flat faceted disc spans the torus interior (the swan crest mounts here — extruded beveled crystal, not an image).

**Material model (the money):**
- `MeshPhysicalMaterial` with: `transmission: 1.0`, `thickness: 0.45`, `roughness: 0.06`, `ior: 1.8` (diamond-ish, pushes refraction), `clearcoat: 1.0`, `clearcoatRoughness: 0.08`.
- **Dispersion**: three.js r165+ has `material.dispersion` (abbe-number chromatic split) — set `dispersion: 7`. This is the single most "wow per line of code" property in modern three.js. If pinned below r165, fake it: three overlapping transmission passes with ±0.8° hue-shifted fresnel tint, or a custom `onBeforeCompile` that offsets refraction UV per channel. Real dispersion if you can, RGB-split hack if you can't.
- **Iridescence**: `iridescence: 0.9`, `iridescenceIOR: 1.3`, thin-film — gives oil-slick hue drift that *moves with the camera*, which is what makes it feel alive without animation.
- **Fresnel rim glow** via a second additive `ShaderMaterial` shell (1.04× scale, `BackSide`, fresnel^3, additive blending) — this is the "luminous" halo. Cheap, enormous payoff.
- Environment: a **custom procedural env map**, not an HDRI download. A small (256px) `PMREM`-generated gradient scene: deep indigo floor, warm gold strip light at 2 o'clock, cool cyan strip at 8 o'clock. The refraction samples *your* colors, not a stock photo studio.

**Lighting:** 2 area-ish key lights only (`DirectionalLight` warm #ffd9a0 / cool #9fd8ff, intensity ~2.5), plus the env map doing 80% of the work. Bloom: `UnrealBloomPass` threshold 0.85, strength 0.35, radius 0.4 — restrained. Motion: torus rotates 4°/sec on Z, ±0.3° camera parallax on pointer. That's it. Slow = luxury.

---

## (B) Color Directions

**1. "Spectral Inheritance" (THE ONE.)**
Spectral dispersion keyed to level. The base crystal is near-colorless ice (`#eaf4ff` tint), and the *dispersion itself* is the color — the prism does the rainbow, keyed so the dominant spectral band shifts with progression: bands 1–5 favor cool cyan-violet split, 6–10 push toward magenta-teal, 11–15 warm gold-rose, 16–20 the FULL visible spectrum at once (white light entering, everything exiting). Color logic: `hue = lerp(190°, 0→360° sweep, level/1000)` mapped through OKLCH at fixed L=0.72, C=0.14 so every hue sits at equal perceived brightness — this is the trick that keeps rainbow from looking gamer. One hue at full saturation = toy. Full spectrum at equal perceptual weight through glass physics = jewelry.

**2. "Aurora Vault"**
Deep teal-black crystal base (`#062a2e`) with iridescence cranked to `1.0` and thin-film thickness animated slowly between 380–720nm — the aurora-borealis-in-glass look. Accent light: warm gold (#ffcf7d). Gorgeous, but monochrome-ish at rest; the color arrives only with camera motion. Strong fallback if dispersion proves too costly.

**3. "Molten Core"**
Cool glass exterior, emissive core: a second inner torus with `emissive` gradient from deep rose (#e0457b) through amber (#ffb347), visible only through the refraction — light from inside a vault. Warm/cool tension, very "enchanted forest." Risk: emissive + bloom is exactly the gamer-RGB trap; needs discipline.

**Decision: Spectral Inheritance**, with Aurora Vault's thin-film as the texture layer on top (they compose: dispersion gives the rainbow, iridescence gives the drift). The narrative is perfect: *the client starts as one color of light and earns the full spectrum.* That's the product story written in physics.

---

## (C) 20-Band Evolution in 3D

Map level → continuous `uProgress = level/1000`; era = discrete step at 5/10/15/20 bands. Per era:

| Era (bands) | Silhouette | Facet count | Dispersion | IOR | Spectral range | Extras |
|---|---|---|---|---|---|---|
| 1 (1–5) | Circle | 24 facets | 0 | 1.45 | Cyan→violet only (190–270°) | Bare crystal, no halo |
| 2 (6–10) | Hexagon | 18 facets | 3 | 1.55 | + magenta, teal (160–300°) | Fresnel rim fades in |
| 3 (11–15) | 12-gon | 12 facets | 5 | 1.65 | + rose, amber (90–330°) | Dust particle field (120 pts, slow orbital drift) |
| 4 (16–20) | Crown | 8 facets (chunky, regal) | 7 | 1.8 | **Full 360° spectrum** | Swan crest extrudes on inner disc; crown points flare with a pulse every 60s (not constant — scarcity reads as ceremony) |

Key decisions:
- **Fewer facets as you level up** — counterintuitive, but big flat facets read as *more* cut/luxury than busy micro-facets. Progression = refinement, not accumulation.
- Swan crest: extruded beveled geometry from the existing SVG path (`SVGLoader`), same transmission material, rendered on the era-4 inner disc, rotating 2°/sec. Earned, not shown early — hide it behind `uProgress > 0.75` with a 1s fade.
- Per-band (not per-era) continuous drivers: `dispersion = 7 * uProgress`, `ior = 1.45 + 0.35*uProgress`, rim-glow strength, particle count. Era changes are discrete morphs; band changes are continuous dials. No visible "steps."
- The one master clock stays: single `clock.getElapsedTime()` passed as uniform to everything. Non-negotiable for the fallback tiers too.

---

## (D) Fallback Tier Architecture

**Detection (run once, synchronous, before first paint):**

```
tier = FULL, if ALL of:
  - WebGL2 context creates && !context.isContextLost()
  - !prefers-reduced-motion
  - deviceMemory >= 4 (or undefined — don't penalize unknowns)
  - hardwareConcurrency >= 4
  - !(/Mobi|Android/.test(UA) && devicePixelRatio > 2.5 && deviceMemory <= 4)  // flagship phones still go MID

tier = MID if WebGL2 OK but any of: mobile UA, deviceMemory 2–4, or
  FULL tier fails the 5-second runtime audit (below)

tier = SVG if: no WebGL2, prefers-reduced-motion, saveData=true,
  coarse pointer AND hardwareConcurrency < 4, or any context-creation failure
```

**Runtime demotion (FULL→MID):** after mount, measure frame delta over 300 frames. If p95 delta > 22ms, demote once, permanently, with a 600ms crossfade to the mid tier. Never re-promote (flapping is worse than staying low).

**Tier contents:**

- **FULL:** everything above. 128-segment torus, real `dispersion`, bloom, 120-particle field, DPR clamped to 2.0, ACES tone mapping, 60fps target.
- **MID (hard budget: <6ms GPU/frame, 30fps cap via `setAnimationLoop` skip):** drop real dispersion (use the single-pass RGB-UV-offset hack on one material), `transmission` stays but `thickness` constant (skip the backface pass: `transmissionResolutionScale` / render transmission buffer at 0.5×), DPR clamp 1.5, bloom OFF (fake the halo with the additive fresnel shell — it's nearly free), particles OFF, 64-segment geometry, `powerPreference: 'low-power'`. Visually: still a 3D refracting iridescent crystal, just calmer. This is the phone experience and it must still feel premium — protect the material, sacrifice the effects.
- **SVG:** the existing 2D ring, untouched, PLUS one upgrade so it doesn't feel like punishment: apply the Spectral Inheritance hue math (OKLCH, same formula) to the SVG gradient stops so all three tiers share ONE color system. Static if reduced-motion. The DOM overlay (level number, aria label) is outside the canvas/SVG entirely and never changes across tiers.

Reduced-motion nuance: on FULL/MID with `prefers-reduced-motion`, don't drop to SVG — render the WebGL scene as a **static premium frame** (one render, no animation loop). A motionless refractive crystal still beats SVG; the fallback is for *capability*, motion preference is for *animation*. Only drop to SVG for reduced-motion if it's also a weak device.

---

## (E) Three.js/R3F vs Raw WebGL: **three.js (vanilla, NOT R3F). Decisively.**

Raw WebGL cannot do this design without building a renderer: physical transmission with thickness requires a **two-pass framebuffer** (render scene behind → sample it in the glass shader), PMREM env maps, tone mapping, bloom. That's 2–3 weeks of reinventing three.js badly, and the "repo has raw-WebGL precedent" argument is for the kind of single fullscreen shader planes the precedent presumably covers — not a PBR gem.

Why not R3F: (1) no three.js installed at all — adding R3F adds react-reconciler overhead on top for zero benefit on a **decorative, self-contained, aria-hidden** component with no interactive scene graph; (2) the perf-sensitive bits (demotion audit, animation-loop control, context-loss handling) are *cleaner* with direct access to the renderer; (3) R3F's reactive re-render model fights a `setAnimationLoop` + frame-skip 30fps cap.

So: `three` (pin ≥ r165 for native `dispersion`), one vanilla module, ~600 lines: `createCrystalRing(canvas, { tier, palette }) → { update(level), dispose() }`. Tree-shaken three.js core is ~150KB gzipped — lazy-load it with `import()` ONLY on FULL/MID tiers so the SVG tier never pays the bytes. Handle `webglcontextlost` → swap to SVG, `webglcontextrestored` → re-init MID (not FULL).

---

## (F) Traps — What Makes This Gamer Instead of Luxury

1. **RGB-cycling hues.** Any hue that *animates through* the rainbow over time reads as Razer. Our rainbow comes from physics (dispersion of a fixed white-ish light), not from animating a hue uniform. The light is still; the glass does the color. Never animate `hue` directly.
2. **Per-hue saturation mismatch.** HSL rainbow = some bands scream, some whisper. This is why the OKLCH fixed-L/C spec in (B) matters — it's the difference between "prism" and "party mode."
3. **Bloom over 0.5 strength.** Bloom should only ever kiss the hottest speculars. If the whole ring glows, it's a screensaver. Threshold ≥ 0.85 keeps bloom honest.
4. **Fast rotation.** Anything spinning faster than ~6°/sec reads as loading spinner / arcade. Luxury moves at the speed of a museum turntable. Same for particles: drift, never swarm. Max 2 moving systems at once (rotation + parallax; particles only in era 3–4).
5. **Busy facet noise.** Facet displacement from random noise = "AI-generated crystal" look instantly. Facets must come from *quantized, symmetric* planar cuts (jewelers cut symmetrically). The silhouette morph math gives this for free — do not add noise displacement on top.
6. **Saturating the whole frame.** The torus is the only saturated object. Env map, background, and particles stay desaturated (background: deep near-black indigo-teal gradient, e.g. #0d1b24 → #05080d — note: NOT the banned #0a0a1a). A colorful jewel needs a dark quiet room. If the background is colorful too, nothing is.
7. **Emissive everything.** If both the glass *and* a core *and* particles emit light, it's a slot machine. One emissive system maximum; in the chosen direction it's zero — all color is refracted/reflected, which is exactly why it reads as crystal instead of LED.
8. **Tier-jank.** A visible pop when demoting FULL→MID is worse than starting at MID. Crossfade, and log demotions — if >20% of sessions demote, the FULL defaults are too hot.

**The one-sentence brief for the builder:** a faceted transmissive torus where the dispersion — not the paint — carries the color, earning its way from one spectral band to the full rainbow, with the swan cut into the crystal at the summit, degrading by dropping effects but never the material, and sharing one OKLCH color system across all three tiers.
