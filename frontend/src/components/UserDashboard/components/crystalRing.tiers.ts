/**
 * FILE: crystalRing.tiers.ts
 * PURPOSE: Pure-data escalation spec for the level-indexed Crystal Ring engine.
 *          Kimi K3 mandate: index to LEVEL (1–1000), NOT tier — the ring
 *          evolves every level; the 50-level BANDS below give a distinct,
 *          visible "new ring" identity roughly every 50 levels (Sean's ask:
 *          ~20 rings to L1000, not 5). FX layers unlock across the climb; all
 *          FX are phase-locked to the ONE master clock (depth, never a second
 *          independent animator). No hex here beyond var() fallbacks (Rule 6).
 * NOTE:    No React, no styled-components — data only, unit-testable.
 */

export const MAX_LEVEL = 1000;
export const LEVELS_PER_TIER = 20;
export const MAX_TIER = MAX_LEVEL / LEVELS_PER_TIER; // 50
export const LEVELS_PER_BAND = 50;
export const BAND_COUNT = MAX_LEVEL / LEVELS_PER_BAND; // 20

/** FX capabilities a band can carry. Each is a depth layer, not an animator —
 *  they ride the single master clock. Progressive unlock = visible escalation. */
export interface RingFx {
  filaments: number;   // electricity segments chasing the band (1..6)
  twinBand: boolean;   // a counter-rotating inner filament band
  orbitals: number;    // luminous dots orbiting the ring (0..8)
  facetGems: number;   // faceted gem nodes set into the ring (0..12)
  auraPulse: boolean;  // a breathing aura halo behind the ring
  sparkTip: boolean;   // a bright spark burst at the progress tip
  innerGlyph: boolean; // an inner rotating facet glyph ring
  crown: boolean;      // ultimate-only radiant crown spikes
}

/** A 50-level band: its identity (name/palette/arc) + the FX unlocked by then. */
export interface RingEra {
  key: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  spectrum: string[]; // ordered flowing-gradient stops (token, fallback)
  arc: string;        // filament + facet-tip accent
  fx: RingFx;
}

const T = {
  ice: 'var(--ice-wing, #60c0f0)',
  lav: 'var(--swan-lavender, #4070c0)',
  purple: 'var(--wing-purple, #8b5cf6)',
  gold: 'var(--gilded-fern, #c6a84b)',
};

/** 20 bands, every 50 levels. Names build a mythos from frost → cosmic. FX
 *  unlock monotonically so each band visibly out-classes the one below. */
export const RING_ERAS: RingEra[] = [
  { key: 'frost',     name: 'Frost',      minLevel: 1,   maxLevel: 50,   spectrum: [T.ice, T.lav],                 arc: T.ice,    fx: { filaments: 1, twinBand: false, orbitals: 0, facetGems: 0, auraPulse: false, sparkTip: false, innerGlyph: false, crown: false } },
  { key: 'glacier',   name: 'Glacier',    minLevel: 51,  maxLevel: 100,  spectrum: [T.ice, T.lav],                 arc: T.ice,    fx: { filaments: 2, twinBand: false, orbitals: 0, facetGems: 0, auraPulse: false, sparkTip: true,  innerGlyph: false, crown: false } },
  { key: 'dawn',      name: 'Dawn',       minLevel: 101, maxLevel: 150,  spectrum: [T.lav, T.ice, T.purple],       arc: T.lav,    fx: { filaments: 2, twinBand: false, orbitals: 0, facetGems: 2, auraPulse: false, sparkTip: true,  innerGlyph: false, crown: false } },
  { key: 'aurora',    name: 'Aurora',     minLevel: 151, maxLevel: 200,  spectrum: [T.purple, T.ice, T.lav],       arc: T.purple, fx: { filaments: 2, twinBand: false, orbitals: 2, facetGems: 2, auraPulse: true,  sparkTip: true,  innerGlyph: false, crown: false } },
  { key: 'tempest',   name: 'Tempest',    minLevel: 201, maxLevel: 250,  spectrum: [T.purple, T.ice, T.lav],       arc: T.purple, fx: { filaments: 3, twinBand: false, orbitals: 3, facetGems: 3, auraPulse: true,  sparkTip: true,  innerGlyph: false, crown: false } },
  { key: 'zenith',    name: 'Zenith',     minLevel: 251, maxLevel: 300,  spectrum: [T.purple, T.lav, T.ice],       arc: T.ice,    fx: { filaments: 3, twinBand: true,  orbitals: 3, facetGems: 3, auraPulse: true,  sparkTip: true,  innerGlyph: false, crown: false } },
  { key: 'prism',     name: 'Prism',      minLevel: 301, maxLevel: 350,  spectrum: [T.purple, T.lav, T.ice, T.gold], arc: T.gold, fx: { filaments: 3, twinBand: true,  orbitals: 4, facetGems: 4, auraPulse: true,  sparkTip: true,  innerGlyph: true,  crown: false } },
  { key: 'spectra',   name: 'Spectra',    minLevel: 351, maxLevel: 400,  spectrum: [T.purple, T.lav, T.ice, T.gold], arc: T.gold, fx: { filaments: 4, twinBand: true,  orbitals: 4, facetGems: 5, auraPulse: true,  sparkTip: true,  innerGlyph: true,  crown: false } },
  { key: 'radiance',  name: 'Radiance',   minLevel: 401, maxLevel: 450,  spectrum: [T.ice, T.purple, T.gold],      arc: T.gold,   fx: { filaments: 4, twinBand: true,  orbitals: 5, facetGems: 6, auraPulse: true,  sparkTip: true,  innerGlyph: true,  crown: false } },
  { key: 'solstice',  name: 'Solstice',   minLevel: 451, maxLevel: 500,  spectrum: [T.gold, T.ice, T.purple],      arc: T.gold,   fx: { filaments: 4, twinBand: true,  orbitals: 5, facetGems: 6, auraPulse: true,  sparkTip: true,  innerGlyph: true,  crown: false } },
  { key: 'plasma',    name: 'Plasma',     minLevel: 501, maxLevel: 550,  spectrum: [T.purple, T.ice, T.gold],      arc: T.ice,    fx: { filaments: 5, twinBand: true,  orbitals: 6, facetGems: 7, auraPulse: true,  sparkTip: true,  innerGlyph: true,  crown: false } },
  { key: 'ion',       name: 'Ion',        minLevel: 551, maxLevel: 600,  spectrum: [T.ice, T.purple, T.gold],      arc: T.ice,    fx: { filaments: 5, twinBand: true,  orbitals: 6, facetGems: 8, auraPulse: true,  sparkTip: true,  innerGlyph: true,  crown: false } },
  { key: 'nova',      name: 'Nova',       minLevel: 601, maxLevel: 650,  spectrum: [T.gold, T.purple, T.ice],      arc: T.gold,   fx: { filaments: 5, twinBand: true,  orbitals: 7, facetGems: 8, auraPulse: true,  sparkTip: true,  innerGlyph: true,  crown: false } },
  { key: 'pulsar',    name: 'Pulsar',     minLevel: 651, maxLevel: 700,  spectrum: [T.ice, T.gold, T.purple],      arc: T.ice,    fx: { filaments: 5, twinBand: true,  orbitals: 7, facetGems: 9, auraPulse: true,  sparkTip: true,  innerGlyph: true,  crown: false } },
  { key: 'quasar',    name: 'Quasar',     minLevel: 701, maxLevel: 750,  spectrum: [T.purple, T.gold, T.ice],      arc: T.gold,   fx: { filaments: 6, twinBand: true,  orbitals: 8, facetGems: 10, auraPulse: true, sparkTip: true,  innerGlyph: true,  crown: false } },
  { key: 'celestine', name: 'Celestine',  minLevel: 751, maxLevel: 800,  spectrum: [T.gold, T.ice, T.purple, T.gold], arc: T.gold, fx: { filaments: 6, twinBand: true,  orbitals: 8, facetGems: 10, auraPulse: true, sparkTip: true,  innerGlyph: true,  crown: false } },
  { key: 'empyrean',  name: 'Empyrean',   minLevel: 801, maxLevel: 850,  spectrum: [T.gold, T.purple, T.ice, T.gold], arc: T.gold, fx: { filaments: 6, twinBand: true,  orbitals: 8, facetGems: 11, auraPulse: true, sparkTip: true,  innerGlyph: true,  crown: false } },
  { key: 'seraphic',  name: 'Seraphic',   minLevel: 851, maxLevel: 900,  spectrum: [T.gold, T.ice, T.purple, T.gold], arc: T.gold, fx: { filaments: 6, twinBand: true,  orbitals: 8, facetGems: 12, auraPulse: true, sparkTip: true,  innerGlyph: true,  crown: false } },
  { key: 'ascendant', name: 'Ascendant',  minLevel: 901, maxLevel: 999,  spectrum: [T.gold, T.purple, T.ice, T.gold], arc: T.gold, fx: { filaments: 6, twinBand: true,  orbitals: 8, facetGems: 12, auraPulse: true, sparkTip: true,  innerGlyph: true,  crown: false } },
  { key: 'apex',      name: 'Apex',       minLevel: 1000, maxLevel: 1000, spectrum: [T.gold, T.ice, T.purple, T.gold], arc: T.gold, fx: { filaments: 6, twinBand: true,  orbitals: 8, facetGems: 12, auraPulse: true, sparkTip: true,  innerGlyph: true,  crown: true } },
];

const clampLevel = (level: number): number =>
  Math.max(1, Math.min(MAX_LEVEL, Number.isFinite(level) ? Math.round(level) : 1));

export const tierOf = (level: number): number => Math.ceil(clampLevel(level) / LEVELS_PER_TIER);
export const bandOf = (level: number): number => Math.ceil(clampLevel(level) / LEVELS_PER_BAND);

export const eraOf = (level: number): RingEra => {
  const L = clampLevel(level);
  return RING_ERAS.find((e) => L >= e.minLevel && L <= e.maxLevel) ?? RING_ERAS[RING_ERAS.length - 1];
};

/** True on the first level of a 50-level band — the "new ring" celebration. */
export const isBandThreshold = (level: number): boolean =>
  (clampLevel(level) - 1) % LEVELS_PER_BAND === 0;

/** Legacy 20-level tier threshold (kept for the smaller momentum beat). */
export const isTierThreshold = (level: number): boolean => clampLevel(level) % LEVELS_PER_TIER === 1;

/** Smooth 0→1 ascent across the whole 1–1000 climb (continuous, not stepwise). */
export const ascent = (level: number): number => {
  const t = (clampLevel(level) - 1) / (MAX_LEVEL - 1);
  return Math.pow(t, 0.85);
};

/** Per-level dial values. Monotonic in ascent; motion SLOWS as depth grows. */
export interface RingDials {
  ascent: number;
  era: RingEra;
  fx: RingFx;
  tier: number;
  band: number;
  isUltimate: boolean;
  glow: number;
  arcOpacity: number;
  loopMs: number;
  fringeAlpha: number;
  scrimAlpha: number;
}

export const dialsFor = (level: number): RingDials => {
  const a = ascent(level);
  const era = eraOf(level);
  const L = clampLevel(level);
  return {
    ascent: a,
    era,
    fx: era.fx,
    tier: tierOf(level),
    band: bandOf(level),
    isUltimate: L === MAX_LEVEL,
    glow: 0.30 + a * 0.65,
    arcOpacity: 0.4 + a * 0.5,
    loopMs: Math.round(9000 + a * 13000), // 9s → 22s (deepens = slows)
    fringeAlpha: 0.5 + a * 0.2,           // ≤0.7 (§4 budget)
    scrimAlpha: 0.55 + a * 0.4,
  };
};