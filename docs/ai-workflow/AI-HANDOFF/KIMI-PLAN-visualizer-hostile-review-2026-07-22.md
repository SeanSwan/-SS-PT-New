# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-BRIEF-visualizer-hostile-review-2026-07-22.md
**Seed:** (none)
**Tokens:** 1813 in / 5171 out · **Cost:** ~$0.0830 · **Wall:** 189.5s

---

# KIMI K3 — HOSTILE REVIEW: Swan Visualizer Fine-Tune Plan

Verdict up front: the engine is sound, the *tuning* is lazy. The white-blob defect is a pipeline-wide systems failure, not a scene bug — every stage from scene accumulation to ACES conspires to erase color. The variety problem is equally systemic: 10 scenes × 2 palettes × narrow param re-seeds means Sean has effectively seen everything by minute six. Fix the pipeline first, then flood it with content. Details below.

---

## A. The White-Blob Defect — Root Cause + Exact Fix

### Root cause: it's a five-stage cascade, not one bug

1. **Unbounded additive accumulation.** gl_aurora sums 6 petal loops into one pixel with no energy budget. Center pixels hit HDR values of 3–6×. Any value >1.0 has already *left the gamut* — the palette no longer exists there.
2. **Bright-pass threshold 0.4 is a joke.** With HDR peaks of 4.0+, the threshold catches **most of the visible frame**, so bloom isn't accenting highlights — it's blurring the entire image. A blurred radial gradient is, definitionally, a blob.
3. **bloom_amt 1.4** then adds that whole-frame blur back on top, lifting mid-tones toward 1.0 everywhere.
4. **Narkowicz ACES desaturates toward white at the top.** `x*(2.51x+.03)/(x*(2.43x+.59)+.14)` per-channel: as R, G, B all approach 1, ratios collapse and hue dies. ACES is *famous* for this. Your pipeline is a hue-erasure machine.
5. **Content-level sins.** Aurora palette[4] is near-white and sits at the glow center. Forest stacks light-green additive layers (light green + light green + ACES = white). Both use `exp(-k*r)` with tiny `k` — falloff covering 60%+ of the screen. A gradient that broad has no structure to save.

### Exact fixes (ranked inside the section)

**Fix 1 — Tonemap luminance, not channels (the single highest-leverage change).** Replace per-channel ACES with luminance-tonemap + color rescale. Hue survives at every brightness:

```glsl
float luma(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
vec3 tonemapPreserve(vec3 hdr, float exposure){
    vec3 c = hdr * exposure;
    float l = max(luma(c), 1e-4);
    float tl = l / (1.0 + l);            // Reinhard on luma — cheap, mobile-safe
    return c * (tl / l);                 // rescale RGB by ratio — hue locked
}
```
(Reinhard-on-luma is one division; AgX is nicer but costs ~15 more ALU. Start here.)

**Fix 2 — Bright pass with a knee and a real threshold.** Threshold 0.4 → **0.85**, add soft knee so it doesn't pop:

```glsl
vec3 brightPass(vec3 c){
    float br = max(c.r, max(c.g, c.b));
    float knee = 0.25;
    float soft = clamp(br - 0.85 + knee, 0.0, 2.0*knee);
    soft = soft*soft / (4.0*knee);
    float w = max(soft, br - 0.85) / max(br, 1e-4);
    return c * max(w, 0.0);
}
```

**Fix 3 — bloom_amt 1.4 → 0.7.** Bloom should be jewelry, not wallpaper. Add a per-scene uniform hook `u_bloomScale` (default 1.0; Aurora/Forest ship at 0.5) so hot scenes can be de-bloomed without touching the composite.

**Fix 4 — Per-scene energy budgets.** Every additive loop gets normalized:

```glsl
// gl_aurora: after the 6-petal loop
col /= 3.5;                    // budget, not afterthought
col = min(col, vec3(1.6));     // hard HDR ceiling — nothing enters bloom runaway
```

**Fix 5 — Aurora-specific surgery.** (a) Delete near-white palette[4]; the hottest entry is now a *saturated* ice-cyan (≤0.85 lightness). (b) The petal core stops being `col += glow` (white-seeking) and becomes `col += glow * pal[i % 3] * 0.3` — glow is *tinted energy*, never raw white. (c) Radial falloff `exp(-k*r)`: raise `k` ~2.5× and add `pow(g, 1.6)` to snap the shoulder. Features should occupy ≤25% of screen each. (d) Add negative space: multiply the field by `0.15 + 0.85*petalMask` so the background stays genuinely dark. Blobs require a lit background; starve it.

**Fix 6 — Forest-specific surgery.** Its wash-out is low-contrast same-hue stacking. Convert the canopy from additive to **indexed color**: compute the foliage field `f ∈ [0,1]`, then `color = palRamp(f)` where the ramp runs deep-teal → green → acid-yellow (not light-green → lighter-green). Dark gaps between leaves: `color *= smoothstep(0.05, 0.25, f)`.

**Acceptance test:** freeze-frame any scene at peak beat. If >15% of pixels are above 0.9 luma or within ΔE < 8 of white, it fails. Ship only scenes that pass.

---

## B. Color Plan — Palettes, Ramps, Hue-Cycling

**Palette design rules (apply to every world):**
- All 5 entries form a **ramp**: shadow hue → mid → primary → secondary → highlight.
- Highlight entry: OKLCH L ≤ 0.85, chroma ≥ 0.12. **No entry within ΔE 10 of white, ever.** Near-white is a bloom trigger and a hue-killer — this rule alone kills half the blob problem.
- Minimum hue span across the ramp ≥ 90°. Forest's failure is a ~35° span of light greens; that's not a palette, it's a single color with self-esteem issues.
- **3–4 palettes per world** (up from 2), rotated on scene switch. Crystalline Swan brand skin stays as one full world, untouched. Retired Galaxy-Swan colors stay retired — audit new palettes against that hex list before merge. Rule 9 respected: nothing named, themed, or commented yoga.

**Use the full ramp in-shader.** The current sin is mapping one palette color to "the glow" and ignoring the rest. Every field-based scene should index color by field value:

```glsl
vec3 palRamp(float t){            // t in [0,1], u_pal[5] as control points
    t = clamp(t, 0.0, 0.999) * 4.0;
    int i = int(t);
    return mix(u_pal[i], u_pal[i+1], fract(t));
}
```
Now brightness and hue are *coupled* — hot regions are a different *color*, not a whiter color. This is the single most iTunes-looking trick available.

**Hue-cycling over time.** CPU-side, once per frame, rotate all 5 entries in HSV by `hueOffset`, where `hueOffset` advances 3–8°/sec (reduced-motion: static). This makes a "repeat" scene visibly different 30 seconds into its own hold. Cost: 5 rgb↔hsv conversions on CPU per frame — free.

**Director hue-diversity rule.** Track the dominant hue of the outgoing scene; the incoming scene's palette must be ≥60° away on the hue wheel. Reject and re-draw from the bag otherwise. Consecutive green→green is how "everything looks the same" happens even with 25 scenes.

---

## C. 14 New Fragment-Only Scenes (iTunes DNA, Anti-Blob by Construction)

Universal anti-blob contract for every scene below: dark background (≤0.05 luma), shapes defined by **narrow smoothstep edges** (width ≤0.01 screen units), color via `palRamp(field)` or per-shape palette index, total additive budget ≤1.6 HDR, hard `min()` ceiling.

| # | Scene | Visual (one line) | Audio mapping | Anti-blob mechanism |
|---|-------|-------------------|---------------|---------------------|
| 1 | **Lissajous Scope** | Glowing oscilloscope curve, 2–3 harmonic traces | bass→freq ratio X, mid→ratio Y, treble→trace brightness | Line SDF, edge width 2px; old frames fade via feedback-free analytic trail (3 phase-offset copies) |
| 2 | **Spectrum Ring** | Radial EQ bars around a dark core | u_bass/mid/treble drive 3 bar tiers at 3 radii; beat→radius kick | Bars are quantized rects; background pure dark |
| 3 | **Voronoi Neon** | Cracked-glass cells with glowing edges | mid→cell count (8–24), beat→seed jitter, bass→edge glow | Color = `pal[hash(cellId)]`; only *edges* glow, cell fill dark-tinted |
| 4 | **Moiré Interference** | Two concentric ring gratings sliding | bass→radial offset, treble→ring density | High-frequency rings quantize into bands; interference zones get ramp color, not white |
| 5 | **Spirograph** | Hypotrochoid ribbon drawing itself | treble→R/r ratio (seeded per visit), level→draw speed, beat→new arm | Ribbon is an SDF stroke; 3 arms max, each a distinct palette index |
| 6 | **Starburst Rays** | Angular spokes from center, rotating | beat→rotation impulse (decaying), bass→ray length, mid→ray count | `abs(sin(a*N))` rays; gaps are true black; rays colored by angle |
| 7 | **Metaball Rims** | 5–7 merged blobs but rendered as *outlines + inner glow ring* | bass→radius, mid→merge threshold, motes orbit on beat | Invert the classic: rim-only via narrow band of the SDF — structurally impossible to blob |
| 8 | **Polar Tile Kaleido** | Triangular/hex mirror tiling with per-tile color | treble→fold count (seeded 3–12), level→tile shimmer | Flat tile fills from palette by hash; only grout lines glow |
| 9 | **Ribbon Waves** | 4–6 horizontal sine ribbons, layered | mid→wavelength, bass→amplitude, beat→phase kick | Each ribbon a crisp SDF band, own palette color, dark gaps between |
| 10 | **Halftone Pulse** | Dot grid whose radii form a waveform portrait | level→global dot scale, bands→row offsets | Dots are circles with hard SDF edges; background black |
| 11 | **Truchet Flow** | Animated quarter-arc truchet maze, neon on dark | beat→flip a wave of tiles (hash gate), mid→line glow | Fixed line width; arcs colored by tile hash mod 3 |
| 12 | **Op-Art Twist** | Checkered spiral/twist distortion field | bass→twist angle (slow, clamped ±0.6 rad for strobe-guard), beat→snap reset | Checker cells flat-colored alternating ramp entries; crisp by definition |
| 13 | **Ring Tunnel EQ** | Concentric rings flying outward, each ring an EQ readout | bands→ring brightness per ring age, beat→spawn | Rings are thin annuli (width ≤0.008), quantized palette by ring index |
| 14 | **Circuit Hex** | Hex-grid traces lighting up in paths | treble→trace propagation speed, beat→path re-seed | Emissive thin lines on near-black; paths use full ramp along length |

All are ≤120 lines of GLSL, zero loops over 24 iterations, no noise heavier than one hash — mobile-safe.

---

## D. Anti-Repetition — Make "Never the Same Twice" True

**Current math (the problem, quantified):** 10 scenes, anti-repeat window of 3 → a scene is eligible again after ~4 switches ≈ **under 2 minutes**. Two palettes per world and a narrow re-seed mean the repeat *looks* identical. Sean is right.

**The fix stack:**

1. **Coverage shuffle-bag (replaces weighted shuffle).** All scenes go in a bag; draw without replacement; reshuffle only when empty. With the 14 new scenes: 24 scenes × avg 32s = **12.8 minutes minimum before any scene can recur.** Anti-repeat(last-3) becomes redundant — keep it as a bag-reshuffle guard (last 2 of old bag ≠ first 2 of new bag).
2. **holdSec: widen and vary.** 16–40 → **24–70s**, drawn from a distribution correlated with energy: high-level → shorter holds (24–35s), chill → long (45–70s). Varied hold alone destroys the "metronome of sameness."
3. **Macro-variant seeds per showing.** Each scene draw receives a seed driving *structural* params, not just phase:
   - symmetry/fold count: 3–12 (integer)
   - feature scale: ×0.5–2.5
   - warp/domain amount: 0–1.5
   - palette ramp offset: full [0,1) rotation
   - handedness (mirror), rotation direction, drift speed ×0.3–2.0
   That's conservatively **8 perceptually distinct macro-variants per scene.** 24 scenes × 8 variants × 3 palettes = **576 distinguishable looks ≈ 5.1 hours** before an exact configuration repeats — and perceptual repetition is far longer because humans don't catalog param combos.
4. **Continuous intra-scene drift.** 2–3 LFOs on feature scale and hue offset at incommensurate frequencies (e.g., 0.113 Hz, 0.071 Hz, 0.047 Hz — never integer ratios) so a scene never phase-locks with itself during a 70s hold. Reduced-motion: freeze LFO phase at seed value, scene stays static-but-correct.
5. **CYGNUS signature:** keep the ~5-switch cadence but let it *also* draw from the variant seed system so the signature itself stops being a repeat tell.

---

## E. Impact-Ranked Build Order

| Rank | Work item | Effort | Impact | Why here |
|------|-----------|--------|--------|----------|
| 1 | **Luma-preserving tonemap + threshold 0.85/knee + bloom_amt 0.7** | ~2 hrs, one file | ★★★★★ | Fixes *every* scene at once; kills the named defect at the root |
| 2 | **Aurora + Forest surgery** (Fix 5/6: tinted glow, tight falloff, ramp-indexed Forest, dark negative space, HDR ceilings) | half day | ★★★★★ | These are the scenes Sean named. Nothing else matters until they pass the freeze-frame test |
| 3 | **Palette ramp redesign + `palRamp()` full-range mapping + no-near-white rule** | half day | ★★★★☆ | Solves "more colors" for all existing scenes simultaneously |
| 4 | **Coverage bag + holdSec 24–70 + macro-variant seeds + drift LFOs** | 1 day, director-only | ★★★★☆ | 10 scenes suddenly feel like 80; buys time before new content lands |
| 5 | **New scenes batch 1 (iTunes-core five): Lissajous, Starburst, Voronoi Neon, Moiré, Spectrum Ring** | 2 days | ★★★★☆ | Highest vibe-per-line; all structurally blob-proof |
| 6 | **Hue-cycling + director ≥60° hue-diversity rule** | few hours | ★★★☆☆ | Force multiplier on everything above |
| 7 | **New scenes batch 2 (remaining 9)** | 3 days | ★★★☆☆ | Catalog depth → 5-hour no-repeat math becomes real |
| 8 | **Regression pass: strobe-guard amplitude caps, reduced-motion freeze verification, mobile ALU audit, Galaxy-Swan hex audit** | half day | mandatory | Constraints are non-negotiable; verify, don't assume |

**Do not** let a worker-bot start on new scenes before items 1–2 land — every new scene authored against the broken tonemap will inherit the blob and need rework. Pipeline first, content second, always.

— Kimi K3
