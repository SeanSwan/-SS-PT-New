/**
 * FILE: crystalRing.tiers.ts
 * PURPOSE: The EVOLUTION spec for the Crystal Ring — 20 bands (every 50 levels) grouped into
 *   4 ERAS of 5. Each band is a distinct ARTIFACT (Kimi K3 + Claude fusion, 2026-07-27),
 *   not "the last band + more dots": it varies on 5 axes — silhouette (polygon sides),
 *   material (2 tokens + Frost White, substitution not accumulation), dominant motion,
 *   particle grammar, and center/swan treatment. Density ramps continuously off `evo`;
 *   silhouette + material TRANSFORM at each 250-level era boundary (the "new game+" beat).
 * SPEC: docs/ai-workflow/AI-HANDOFF/CRYSTAL-RING-EVOLUTION-SPEC-2026-07-27.md
 * NOTE: pure data — no React, no styled-components. Colors via var(--token,#fallback) (Rule 6).
 */

export const MAX_LEVEL = 1000;
export const LEVELS_PER_BAND = 50;
export const BAND_COUNT = MAX_LEVEL / LEVELS_PER_BAND; // 20
export const LEVELS_PER_ERA = 250;
// Back-compat alias (older callers referenced 20-level tiers).
export const LEVELS_PER_TIER = 20;

export type DominantMotion = 'rotate' | 'counter' | 'pulse' | 'shimmer';
export type ParticleGrammar = 'dot' | 'dash' | 'shard' | 'rune' | 'comet';
export type SwanStage = 'none' | 'watermark' | 'occluder' | 'emblem' | 'coronation';

const T = {
  ice: 'var(--ice-wing, #60c0f0)',
  lav: 'var(--swan-lavender, #4070c0)',
  purple: 'var(--wing-purple, #8b5cf6)',
  gold: 'var(--gilded-fern, #c6a84b)',
  frost: 'var(--frost-white, #e0ecf4)',
  obsidian: 'var(--obsidian-black, #0a0a0f)',
};

export interface RingEra {
  id: 1 | 2 | 3 | 4;
  key: string;
  name: string;
  motion: DominantMotion; // ONE dominant motion per era (stillness elsewhere = luxury)
  spectrum: [string, string]; // 2-token material (Frost White is added at render, never a 3rd token)
  arc: string; // accent (filament/particle/facet tint)
}

/** 4 eras. Material SUBSTITUTES across boundaries; gold is withheld until Era IV. */
export const RING_ERAS: RingEra[] = [
  { id: 1, key: 'frostbound',  name: 'Frostbound',    motion: 'rotate',  spectrum: [T.ice, T.frost],    arc: T.ice },
  { id: 2, key: 'argent',      name: 'Argent Tide',   motion: 'counter', spectrum: [T.lav, T.frost],    arc: T.lav },
  { id: 3, key: 'amethyst',    name: 'Amethyst Reign', motion: 'pulse',  spectrum: [T.purple, T.ice],   arc: T.purple },
  { id: 4, key: 'gilded',      name: 'Gilded Apex',   motion: 'shimmer', spectrum: [T.gold, T.obsidian], arc: T.gold },
];

interface BandSpec {
  name: string;
  sides: number; // 0 = smooth circle; >=3 = regular polygon silhouette
  particle: ParticleGrammar;
}

/** 20 bands. Silhouette morphs within each era (start shape → end shape) and jumps families
 *  at era boundaries. Prime-ish side counts (5,7,9,11) read as faceted crystal, not clip-art. */
export const RING_BANDS: BandSpec[] = [
  // Era I — Frostbound (smooth → hexagon)
  { name: 'First Frost',       sides: 0,  particle: 'dot' },
  { name: 'Hoarfrost',         sides: 0,  particle: 'dot' },
  { name: 'Rime',              sides: 0,  particle: 'dot' },
  { name: 'Frostgate',         sides: 5,  particle: 'dot' },
  { name: 'Glacier Gate',      sides: 6,  particle: 'dot' },
  // Era II — Argent Tide (hexagon → octagon)
  { name: 'Silverwake',        sides: 6,  particle: 'dash' },
  { name: 'Argent',            sides: 7,  particle: 'dash' },
  { name: 'Tidecut',           sides: 7,  particle: 'dash' },
  { name: 'Meridian',          sides: 8,  particle: 'dash' },
  { name: 'Silver Meridian',   sides: 8,  particle: 'dash' },
  // Era III — Amethyst Reign (octagon → 12-gon, runes + first gold trace)
  { name: 'Amethyst',          sides: 8,  particle: 'shard' },
  { name: 'Violet Deep',       sides: 9,  particle: 'shard' },
  { name: 'Violet Reliquary',  sides: 10, particle: 'rune' },
  { name: 'Reliquary',         sides: 10, particle: 'rune' },
  { name: 'Prism Crown',       sides: 12, particle: 'rune' },
  // Era IV — Gilded Apex (faceted halo → spiked crown; swan crest)
  { name: 'Gilded Threshold',  sides: 12, particle: 'comet' },
  { name: 'Auric',             sides: 12, particle: 'comet' },
  { name: 'Radiant',           sides: 12, particle: 'comet' },
  { name: 'Swan Ascendant',    sides: 12, particle: 'comet' },
  { name: 'The Apex',          sides: 12, particle: 'comet' }, // + crown spikes, coronation at L1000
];

export const clampLevel = (level: number): number =>
  Math.max(1, Math.min(MAX_LEVEL, Number.isFinite(level) ? Math.round(level) : 1));

/** 0-based band index (0..19) for a level. */
export const bandIndexOf = (level: number): number =>
  Math.min(BAND_COUNT - 1, Math.floor((clampLevel(level) - 1) / LEVELS_PER_BAND));

export const eraOf = (level: number): RingEra => RING_ERAS[Math.floor(bandIndexOf(level) / 5)];
export const bandOf = (level: number): number => bandIndexOf(level) + 1;
export const tierOf = (level: number): number => Math.ceil(clampLevel(level) / LEVELS_PER_TIER);

/** True on the first level of a 50-level band — the "new artifact" celebration. */
export const isBandThreshold = (level: number): boolean =>
  (clampLevel(level) - 1) % LEVELS_PER_BAND === 0;
/** True crossing a 250-level ERA boundary — the metamorphosis / molt beat (Phase 2). */
export const isEraThreshold = (level: number): boolean =>
  (clampLevel(level) - 1) % LEVELS_PER_ERA === 0;

/** Smooth 0→1 ascent across the whole climb (continuous intensity ramp). */
export const ascent = (level: number): number =>
  Math.pow((clampLevel(level) - 1) / (MAX_LEVEL - 1), 0.85);

/** Swan crest stage, gated by LEVEL (earned): watermark 650 → occluder 700 → emblem 800 →
 *  coronation 1000. The crest never spins; the ring revolves around it. */
export const swanStageOf = (level: number): SwanStage => {
  const L = clampLevel(level);
  if (L >= MAX_LEVEL) return 'coronation';
  if (L >= 800) return 'emblem';
  if (L >= 700) return 'occluder';
  if (L >= 650) return 'watermark';
  return 'none';
};

export interface RingDials {
  level: number;
  evo: number;          // 0..1 continuous intensity
  band: BandSpec;
  bandIndex: number;    // 0..19
  era: RingEra;
  sides: number;
  spectrum: [string, string];
  arc: string;
  particle: ParticleGrammar;
  motion: DominantMotion;
  swan: SwanStage;
  goldTrace: boolean;   // a single inner gold line before Era IV (the "promise")
  isUltimate: boolean;
  glow: number;
  loopMs: number;
  fringeAlpha: number;
  scrimAlpha: number;
  orbitalCount: number;
  gemCount: number;
  filaments: number;
  auraPulse: boolean;
  sparkTip: boolean;
}

/** Prime-ish particle counts per era (Kimi: prime counts, detuned — never 8 identical dots). */
const ORBITALS_BY_ERA = [2, 3, 5, 7];
const GEMS_BY_ERA = [0, 5, 7, 11];

export const dialsFor = (level: number): RingDials => {
  const L = clampLevel(level);
  const evo = ascent(L);
  const idx = bandIndexOf(L);
  const band = RING_BANDS[idx];
  const era = RING_ERAS[Math.floor(idx / 5)];
  return {
    level: L,
    evo,
    band,
    bandIndex: idx,
    era,
    sides: band.sides,
    spectrum: era.spectrum,
    arc: era.arc,
    particle: band.particle,
    motion: era.motion,
    swan: swanStageOf(L),
    goldTrace: idx >= 12 && era.id === 3, // gold trace in late Amethyst only; full gold = Era IV
    isUltimate: L === MAX_LEVEL,
    glow: 0.15 + evo * 0.42,
    loopMs: Math.round(9000 + evo * 13000), // 9s → 22s (deepens = slows)
    fringeAlpha: 0.45 + evo * 0.22,
    scrimAlpha: 0.55 + evo * 0.4,
    orbitalCount: ORBITALS_BY_ERA[era.id - 1],
    gemCount: GEMS_BY_ERA[era.id - 1],
    filaments: 1 + Math.floor(evo * 5), // 1..6 — escalates with the climb
    auraPulse: era.id >= 2,
    sparkTip: L > 1,
  };
};