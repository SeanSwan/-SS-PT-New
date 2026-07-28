# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-BRIEF-visualizer-depth-shapes-2026-07-22.md
**Seed:** (none)
**Tokens:** 1709 in / 8058 out · **Cost:** ~$0.1260 · **Wall:** 267.5s

---

# K3 Review — From Haze to Structured Geometry: The "Shapes + Depth" Rebuild

Straight diagnosis first: Sean is right, and the fix is not more tuning — it's a category change in what the shaders *draw*. Full plan below.

---

## A. Root cause: why fbm-fields never read as "random shapes"

**1. A scalar field has no topology to randomize.** `fbm(uv)` returns one float per pixel. Colormapping it gives clouds; thresholding it gives blobs. There is no *object* — no arm count, no side count, no connectivity — so there is nothing structural for a seed to change. The seed perturbs `uv` offset and phase, which is the equivalent of shuffling the same fog around.

**2. Iso-contours of smooth noise are always the same gestalt.** Perlin/fbm has a fixed spectral signature: blobby, self-similar, scale-locked. Whether you seed it 4 or 4000, the human visual system classifies it as "the haze thing again." Variety lives in *discrete parameters* (3 arms vs 7 arms vs a square lattice), not continuous ones.

**3. One layer = no depth cues.** A single field has no occlusion, no parallax, no scale hierarchy — the three cues the brain uses for "deep." That's the thinness Sean feels.

**The strategy — seed the STRUCTURE, not the phase:**

Derive **integer structural parameters** from the seed via floored hashes, and let those drive geometry:

```glsl
// Structural seed unpack — derive N independent integer knobs from the
// 3 existing structural uniforms. Host keeps them constant per showing.
vec3 S = vec3(u_featureScale, u_warp, u_symmetry);
float sArms    = 3.0 + floor(h21(S.xy) * 7.0);        // 3..9 fold symmetry
float sSides   = 3.0 + floor(h21(S.yz) * 5.0);        // polygon 3..7 sides
float sGlyph   = floor(h21(S.zx) * 6.0);              // which glyph family
float sLattice = floor(h21(S.xx + S.z) * 4.0);        // tile: sq/hex/tri/rnd
float sTwist   = h21(S.yy) * 2.0 - 1.0;               // spiral handedness
float sDensity = 0.6 + h21(S.zz + 7.0) * 0.8;         // element count scale
```

Now a new showing literally draws a *different object*: a 5-arm spiral of hexagons becomes an 8-fold lattice of triangles. That's the iTunes/Milkdrop trick — their "presets" were parametric *geometry systems* whose integer knobs got randomized.

---

## B. The dense/deep single-pass template

### Shared shape library (`shapelib.glsli`, ~90 lines, prepended to every scene)

```glsl
float h21(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33);
                   return fract((q.x+q.y)*q.z); }
vec2  h22(vec2 p){ vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));
                   q+=dot(q,q.yzx+33.33); return fract((q.xx+q.yz)*q.zy); }
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }

float sdCirc(vec2 p,float r){ return length(p)-r; }
float sdBox (vec2 p,vec2 b){ vec2 d=abs(p)-b;
    return length(max(d,0.))+min(max(d.x,d.y),0.); }
float sdSeg (vec2 p,vec2 a,vec2 b){ vec2 pa=p-a,ba=b-a;
    float t=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*t); }
float sdNgon(vec2 p,float r,float n){
    float seg=6.2831853/n;
    float a=mod(atan(p.y,p.x),seg)-seg*.5;
    return cos(a)*length(p)-r*cos(seg*.5);
}
// soft star: radius modulated by n lobes — 1 length() + 1 cos, no atan fold
float sdStar(vec2 p,float r,float n,float sharp){
    float a=atan(p.y,p.x);
    return length(p)-r*(1.-sharp+sharp*abs(cos(a*n*.5)));
}
// polar array: N copies of whatever you draw after the fold — N shapes,
// cost of ONE SDF. Returns cell id for per-arm variation.
float pModPolar(inout vec2 p,float n){
    float seg=6.2831853/n;
    float ang=atan(p.y,p.x);
    float id=floor(ang/seg+.5);
    p=rot(-id*seg)*p; return mod(id+n*.5,n)-n*.5;
}
// domain repetition: infinite grid of cells, cost of ONE cell
vec2 pMod2(inout vec2 p,vec2 sz){
    vec2 id=floor(p/sz+.5);
    p=(fract(p/sz+.5)-.5)*sz; return id;
}
// stroke + glow — the two ways we "ink" an SDF
float stroke(float d,float w){ return smoothstep(w,w*.3,abs(d)); }
float glow  (float d,float k){ return exp(-abs(d)*k); }
```

### The 3-strata depth compositor

Depth = **scale hierarchy + counter-rotation + fog fade**, all in one pass:

```glsl
vec3 scene(vec2 uv,float t){
    vec3 col = u_pal[0]*0.10;                                  // deep bg tint

    // FAR stratum: small scale => visually distant, slow drift, fogged
    vec2 fuv = rot(t*0.021)*uv*0.45 + vec2(t*0.008,-t*0.005);
    vec3 far = layerFar(fuv,t);                                // tiled micro-glyphs
    col = mix(col, far, 0.45);

    // MID stratum: hero geometry, breathes with bass
    vec2 muv = rot(-t*0.043 + u_bass*0.15)*uv*(1.0 - u_bass*0.06);
    col += layerMid(muv,t) * 0.85;

    // NEAR stratum: large scale, fast counter-rotation, additive pops
    vec2 nuv = rot(t*0.067)*uv*2.3;
    col += layerNear(nuv,t) * (0.35 + 0.5*u_treble);
    return col;
}
```

Parallax comes free because each stratum samples at a different scale and rotates at a different rate — the layers slide against each other exactly like a multiplane camera. Fog = each deeper stratum is mixed toward `u_pal[0]` (which is dark, per the no-near-white palette rule).

### Incommensurate breathing (never phase-locks)

Use mutually irrational frequency ratios so the composite motion has an astronomically long period:

```glsl
float b1 = sin(t*0.310);        // ~20 s
float b2 = sin(t*0.173 + 1.7);  // ~36 s
float b3 = sin(t*0.0717 + 4.2); // ~88 s
float breathe = 0.5 + 0.25*b1 + 0.15*b2 + 0.10*b3;  // quasi-periodic
```

Drive scale, twist, and stroke width from *different* components of this so nothing ever visibly loops.

### Density rule: repetition beats loops

- `pModPolar` → N-arm mandala for the cost of one arm.
- `pMod2` → infinite lattice for the cost of one cell.
- One 3×3 neighbor loop (9 iterations) → Voronoi/constellation connectivity.
- **Never** loop "for each of 200 particles."

### Mobile ALU/iteration budget (hard caps)

| Item | Budget |
|---|---|
| Strata | 3 fixed, unrolled |
| SDF evals/pixel | ≤ 6 (folds make each SDF draw many shapes) |
| Neighbor loops | ≤ 1 per frame, ≤ 9 iterations |
| fbm | ≤ 2 octaves, far stratum only (bg texture) |
| Transcendentals | ≤ ~18/pixel (atan/sin/cos/exp) |
| Total | ~250–350 ALU + texture-free; holds 60 fps on A14/Mali-G78 class at 1080p |

### Strobe guard + reduced motion (enforced in every scene)

```glsl
float pulse = u_beat * u_strobeGuard;            // host pre-envelopes beat
if (u_strobeGuard < 0.5) { t *= 0.35; }          // reduced motion: damp time
col  = min(col, vec3(0.92));                     // luminance ceiling
// luma-preserving tonemap (keep from the white-blob fix):
col /= (1.0 + dot(col, vec3(0.299,0.587,0.114))*0.5);
```

---

## C. The next-level catalog — 10 new shape-forward scenes

### 1. Hypotrochoid Loom (spirograph bundles) — *the Milkdrop flagship*
**System:** K=28 segment polyline approximating a hypotrochoid, drawn 3× at different strata/scales.
```glsl
float d = 1e5; vec2 prev;
for(int i=0;i<=28;i++){
    float a = float(i)/28.0*6.2832*k;  // k = seed revolutions
    vec2 q = vec2((R-r)*cos(a)+d2*cos((R-r)/r*a),
                  (R-r)*sin(a)-d2*sin((R-r)/r*a));
    if(i>0) d = min(d, sdSeg(uv, prev, q));
    prev = q;
}
float line = glow(d, 90.)*stroke(d, 0.006);
```
**Seed:** `R/r` ratio → 3..9-lobed curve; `d2` → loop tightness; `k` revolutions. **Audio:** `d2 += u_mid*0.3` (petals swell), hue from treble, bass zooms. **Density:** 3 strata × 2 mirror copies via `pModPolar(uv, sArms)` = up to 54 visible curves from 84 sdSeg evals (near stratum only gets K=14).

### 2. Glyph Mandala Engine
**System:** `pModPolar(uv, sArms)` once, then draw ONE glyph in the wedge — SDF picked by `sGlyph`: triangle, ring, bar, star, teardrop, hex. Two concentric rings at r=0.35/0.7 with different glyphs and counter-rotation.
**Seed:** arms, glyph family, ring count, per-arm mirror flip from `h21(vec2(armId, seed))`. **Audio:** ring radius = bass, glyph scale = mid, ring 2 spins at `t*0.1*sTwist`. **Density:** arms × rings × 3 strata = 18–81 shapes from 6 SDF evals.

### 3. Truchet Circuit
**System:** `pMod2` grid; per-cell hash picks arc/arc-rotated/bar/node; two nested scales (cells of 0.5 and 0.125, far stratum).
```glsl
vec2 id = pMod2(g, vec2(0.5));
float r = h21(id + S.z);
if(r > 0.5) g.x = -g.x;
float d = r < 0.35 ? abs(length(g - 0.25) - 0.25)
        : r < 0.7  ? abs(length(g + 0.25) - 0.25)
        : r < 0.9  ? abs(g.x)
        :            sdCirc(g, 0.15);
```
**Seed:** choice thresholds, mirror probability, cell size. **Audio:** beat steps `id`-offset (circuit "re-routes" on drop), treble = node glow. **Density:** at scale 0.125 the far stratum shows ~200 traces for one SDF.

### 4. Voronoi Shatter
**System:** one 3×3 voronoi pass; render F2−F1 edges as glowing crystal seams, fill cells with palette[hash(id)].
**Seed:** jitter amount, point count (cell scale), edge width, metric (L2 vs manhattan). **Audio:** cell brightness = mid, seams flash on beat (guarded), sites drift with `b1/b2`. **Density:** full-frame shattered crystal; depth from a second coarser voronoi behind it.

### 5. Constellation Net
**System:** hash-grid points; for each of 9 neighbor cells, draw `sdSeg` to the point **if** `h21(pairId) < sDensity` — edges appear as a random graph, i.e., random *figures* (triangles, chains, stars) every seed.
**Seed:** edge probability, point jitter, connection radius. **Audio:** edge glow = treble, points pulse on beat, whole net breathes. **Density:** 9 sdSeg + 9 sdCirc evals → a sky of ~120 stars and ~80 edges.

### 6. Polygon Z-Tunnel
**System:** 6 concentric `sdNgon` rings at radii `r_i = fract(i/6 + t*0.12)`, stroke width shrinks with radius, hue cycles with ring index → infinite inward z-travel.
**Seed:** sides (3–9), twist per ring `rot(i*sTwist*0.3)`, radius exponent. **Audio:** travel speed = level, bass kicks ring spacing. **Density:** 6 SDF evals; depth is literal (tunnel). Cheap, huge "deep" payoff.

### 7. Ribbon Weave
**System:** 5–9 horizontal sine-ribbons `abs(uv.y - A_i*sin(f_i*uv.x + φ_i))`, each stroked; over/under interlace by painting vertical ribbons only where `fract(phase) < 0.5` stripes alternate.
**Seed:** count, frequencies, amplitudes, phase. **Audio:** amplitude = bass, frequency shimmer = mid. **Density:** count × weave crossings reads as a woven tapestry.

### 8. Lissajous Harp
**System:** 4 parametric curves `x=sin(a t+δ), y=sin(b t)` sampled as K=16-segment polylines, each in its own palette slot, counter-phase.
**Seed:** (a,b) ratio pairs from {1:2, 2:3, 3:4, 3:5, 4:5, 5:7…} — musically consonant figures. **Audio:** δ drifts with level; beat re-voices the ratio set. **Density:** 4 curves × 3 strata.

### 9. Gearworks
**System:** gear SDF = `sdNgon(p, r, teeth)` minus `sdCirc(p, r*0.3)`; tiled pivots from `pMod2`, alternating rotation sign per cell parity `mod(id.x+id.y,2.)`.
**Seed:** teeth count, gear radii, which cells are populated. **Audio:** rotation speed = level; beat nudges all gears one tooth. **Density:** tiled 3×3 visible gears, meshed counter-rotation.

### 10. Starburst Echelon
**System:** `sdStar` bursts at three radii on a polar array: `pModPolar` then stars at x = 0.3/0.6/0.9, alternating lobe counts, additive near-white-free palette glows.
**Seed:** lobes per ring, sharpness, ring radii. **Audio:** treble = lobe glow, beat = radial pop (guarded), bass = slow breathing scale. **Density:** arms × 3 rings × 3 strata ≈ 27–81 bursts from 3 sdStar evals — the single cheapest high-density scene in the catalog; ideal mobile fallback.

*(All ten fit in ≤220 lines each including the shared lib; hardest is Hypotrochoid Loom at ~190 lines.)*

---

## D. Existing-10 verdicts

| Scene | Verdict | Concrete change |
|---|---|---|
| gl_aurora | **Retire→replace with Starburst Echelon** | Fundamentally a radial glow field; no salvageable structure. |
| gl_silk | **Keep, upgrade** | Replace noise-displaced sheen with 5–9 countable stroke-ribbons + weave interlace (borrow §C7). It's the same soul, now with discrete objects. |
| gl_nebula | **Retire→replace with Constellation Net** | Pure fbm haze; constellation keeps the "space" theme with actual figures. |
| gl_mandala | **Keep, deep upgrade** | Swap noise source for §C2 glyph engine: per-arm SDF glyphs, 2–3 seeded rings, counter-rotation. This becomes the catalog's structural anchor. |
| gl_kaleido | **Keep, upgrade** | Keep the mirror fold (it's free structure); replace the folded fbm with folded *glyph SDFs* — kaleidoscoped triangles/rings instead of kaleidoscoped fog. |
| gl_nightcity | **Keep, add depth** | Already discrete (buildings). Add 3 parallax skyline strata (far: dark thin towers; near: wide with lit windows via `pMod2` window grid), antenna `sdSeg` strokes, beat-synced window flicker. |
| gl_glitch | **Keep as event layer** | Add shape fragments: on beat, scatter 8–16 `sdNgon` shards at hashed positions for one beat envelope (guarded). |
| gl_cygnus | **Upgrade** | Connect existing points into the §C5 random graph — particles become figures. |
| gl_frozen | **Retire→replace with Voronoi Shatter** | fbm frost is haze; voronoi crystal *is* ice structure with discrete cells and seams. |
| gl_pelagos | **Keep, add geometry** | Add a caustic voronoi floor (F2−F1, animated sites) + sparse `sdSeg` kelp strokes on a polar array; keep one fbm octave for murk only. |

Net: 4 retired/replaced, 6 upgraded — catalog lands at 16 shape-capable scenes.

---

## E. Structural seeds in every scene

**Plan:**
1. Host keeps `u_featureScale/u_warp/u_symmetry` constant per showing (already done); shaders derive the six-knob unpack from §A — same 8 lines pasted after the shared lib.
2. **Contract:** every scene must consume ≥ 4 of {`sArms, sSides, sGlyph, sLattice, sTwist, sDensity`} and map them to *integer* geometry decisions (counts, glyph choice, lattice type) — never merely to phase offsets. Code review gate: grep for `floor(h21` usage per file.
3. Palette slot selection also seeds: `int ci = int(sGlyph) % 5`.

**Quantified variety:** sArms(7) × sSides(5) × sGlyph(6) × sLattice(4) × handedness(2) = **1,680 discrete macro-configurations per scene**, before continuous knobs (twist magnitude, density, palette rotation) and per-cell hashes. Across 16 scenes with the shuffle-bag, a viewer sees a structurally novel configuration for **>25,000 showings** before any exact repeat — vs. today, where every showing of gl_nebula is structurally identical (same octaves, same field) and perceptibly repeats within minutes.

---

## F. Impact-ranked build order

1. **Shared lib + seed unpack (½ day).** Foundation; zero visual change but unblocks everything. Land first.
2. **Glyph Mandala Engine + upgrade gl_mandala/gl_kaleido (1 day).** Biggest single "whoa — *shapes*" jump: two existing scenes become structured geometry immediately, exercising the whole seed contract.
3. **3-strata depth compositor template + retrofit (1 day).** The "DEEP" half of the complaint. Apply to mandala/kaleido first, then nightcity, silk.
4. **Hypotrochoid Loom (1 day).** The Milkdrop-DNA showpiece; highest per-scene wow.
5. **Voronoi Shatter + Truchet Circuit (1 day).** Density showpieces; replace frozen + nebula.
6. **Constellation Net + Starburst Echelon (1 day).** Replace aurora; starburst doubles as the low-power/mobile fallback scene.
7. **Remaining scene upgrades (silk weave, glitch shards, pelagos, cygnus, nightcity strata) (1–1.5 days).**
8. **QA pass (½ day):** strobe-guard audit (every `u_beat` multiplied by `u_strobeGuard`), reduced-motion path, palette luma ceiling check, on-device frame-time profile at 1080p on a mid-tier GPU; enforce the §B budget table per scene.

**Order rationale:** items 2–3 attack both halves of Sean's complaint on scenes he already knows, so the improvement is directly comparable; 4–6 add the new-catalog spectacle; 7–8 are breadth and polish. After step 3 (~2.5 days), the visualizer already feels categorically different; everything after is compounding.

**Bottom line:** stop randomizing fields, start randomizing *parameters of geometry systems*. One polar fold, one grid mod, and one neighbor loop give you hundreds of discrete shapes for ~6 SDF evals a pixel — and a seed that changes arm counts, side counts, and lattice types is a seed Sean can actually *see*.
