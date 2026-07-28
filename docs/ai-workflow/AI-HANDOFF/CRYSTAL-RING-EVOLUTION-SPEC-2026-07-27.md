# Crystal Ring — Evolution Spec (fused: Kimi K3 + Claude + Mobbin + Design Brain)

**Status:** Phase 1 building. **Decision:** Sean 2026-07-27 — "this can't be it, get more creative; evolve every 50 levels, more intense higher, swan logo at higher tiers, nothing cut off." **Supersedes:** the monotonic FX-stacking band system in `crystalRing.tiers.ts`.

Authored by Claude (fusion, 100% authorship) combining Kimi K3's generative direction (`KIMI-RING-EVOLUTION-DIRECTION.md`, $0.039 consult), Mobbin material-tier references (Brainly hex tiers, Mimo "Wooden League" material emblems — structure only; aesthetic stays Swan-cinematic), and the design-brain signature-moment doctrine (one `data-signature`, transform/opacity, reduced-motion fallback).

## Core thesis (Kimi's, adopted)
Stop thinking "more FX per band." Each band is **a different artifact forged from the same crystal.** Luxury = substitution (new material replaces old), not accumulation (more stuff). A user scrolling the tier ladder should feel *geology happening*, not a slider moving.

## The 5 identity axes (band data)
1. **Silhouette** — ring geometry: circle → hexagon → octagon → 12-gon → spiked crown. `sides` per band.
2. **Material** — 2 tokens + Frost White per band (never all 4 at once; gold is a trace before L800, inlay after).
3. **Dominant motion** — ONE per era: rotate / counter / pulse / drift / shimmer. Stillness elsewhere = the luxury signal.
4. **Particle grammar** — orbital SHAPE, not count: dot → dash → shard → comet → rune.
5. **Center treatment** — plain → scrim → glyph → swan watermark → occluder → emblem → crown.

## 4 eras × 5 bands (the punctuation — "new game+" every 250 levels)
| Era | Levels | Name | Silhouette | Material | Motion |
|---|---|---|---|---|---|
| I | 1–250 | Frostbound | circle → hexagon | Ice Wing → Frost White | slow rotate |
| II | 251–500 | Argent Tide | hexagon → octagon (first notches) | Swan Lavender → Frost White | counter-rotate twin |
| III | 501–750 | Amethyst Reign | octagon → 12-gon (deep notches) | Wing Purple → Ice Wing | pulse-scale breath |
| IV | 751–1000 | Gilded Apex | faceted halo → spiked crown | Gilded Fern inlay over obsidian | shimmer-sweep + drift |

Named standouts: **First Frost** (L1, bare 2px arc, single mote — restraint), **Glacier Gate** (L250, first hexagon), **Silver Meridian** (L500, twin arcs lock — the eclipse), **Violet Reliquary** (L650, runes + first gold trace), **Gilded Threshold** (L800, light comes from *inside* the obsidian), **Swan Ascendant** (L950, crest formed), **The Apex** (L1000, coronation).

## Extent budget (the permanent clip fix — Kimi B)
- **viewBox `0 0 400 400`**, ring center `200,200`. Renders at any CSS size (vector scales; nothing clips).
- Core ring radius `R = 132`. **FX budget = 68px** → hard max extent `200` = viewBox edge.
- Sub-budgets (sum ≤ 68): crown spikes ≤26 · orbital path offset ≤34 (+mote ≤6) · aura scale ≤1.12 about center · comet tails drawn INWARD.
- **No `overflow: visible`** — the budget IS the guarantee. Aura scales about `transform-origin: 200 200` (mis-anchored scale = #1 silent budget breach).
- Testable: a debug `r=200` boundary; nothing may cross it at any `t`.

## Swan crest (Kimi C) — enters L650, earns its way up
1. **L650–699 watermark** — swan silhouette 4% Frost White behind the scrim, static (notice on 2nd look).
2. **L700–799 dark-glass occluder** — About-SwanMark treatment: obsidian-fill swan, 1px Ice-Wing rim @30% (carved out of the light).
3. **L800–999 emblem** — positive gold swan at 12 o'clock that **interrupts the arc** (the arc breaks for it → mounted, not pasted); opacity breathes on the clock.
4. **L1000 coronation** — mirrored wings fade in flanking the crest; crest group `scale(1→1.04→1)` on the loop (the only ultimate breath); gold shimmer-sweep via a rotating gradient-filled overlay clipped to the swan path. The swan never spins; the ring revolves around it.

## Traps (Kimi E — binding)
Substitution not accumulation (every era REMOVES something) · max 2 tokens + Frost White · one dominant motion per band · flat-first (silhouette carries identity, glow is garnish) · prime-count (3/5/7) detuned particles with varied sizes (1.5/2.5/4) · Apex = editing not maximalism · crest must interrupt the arc.

## Build phasing
- **Phase 1 (this session):** viewBox 400 + FX budget (no clip) · era silhouettes (polygon progress path) · era materials · swan crest (4 stages) · intensity ramp `--evo`. Preserves one-clock / transform-opacity / reduced-motion / tokens / ≤300-line / tests.
- **Phase 2 (deferred, documented):** per-band particle-grammar variety (dot/dash/shard/comet/rune) · per-band dominant-motion switching · **Era Metamorphosis "molt"** (Kimi's brand-defining move — silhouette shatters + recrystallizes on era-boundary level-up; needs level-change state).
