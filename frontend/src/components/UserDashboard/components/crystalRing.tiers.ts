/**
 * FILE: crystalRing.tiers.ts
 * PURPOSE: Pure-data escalation spec for the level-indexed Crystal Ring engine.
 *          Kimi K3 mandate (2026-07-22): index to LEVEL (1–1000), NOT tier —
 *          the ring evolves a little every level; tier boundaries (every 20)
 *          are celebration THRESHOLD events where a new layer switches on.
 *          One master clock; escalation adds DEPTH while motion SLOWS and
 *          deepens (sacred things pulse slowly). No hex here — era palettes
 *          reference tokens; the fallbacks are the contract (Rule 6).
 * NOTE:    No React, no styled-components — data only, unit-testable.
 */

export const MAX_LEVEL = 1000;
export const LEVELS_PER_TIER = 20;
export const MAX_TIER = MAX_LEVEL / LEVELS_PER_TIER; // 50

/** Named eras across the 1–1000 climb. Each era owns a palette + a signature.
 *  Bands are inclusive level ranges; `layer` is the celebration layer that
 *  unlocks at the era's first level. Palettes escalate base-Crystalline →
 *  exotic ascension spectrums (Kimi: expanded spectrums are the reward). */
export interface RingEra {
  key: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  /** Ordered stops for the flowing ring gradient (token, fallback). */
  spectrum: string[];
  /** Accent for the electricity filament + facet tip. */
  arc: string;
  /** How many concurrent depth layers this era has unlocked (never > 5 — the
   *  one-clock law: depth, not more independent animators). */
  layers: number;
}

export const RING_ERAS: RingEra[] = [
  {
    key: 'frost', name: 'Frost',
    minLevel: 1, maxLevel: 100,
    spectrum: ['var(--ice-wing, #60c0f0)', 'var(--swan-lavender, #4070c0)'],
    arc: 'var(--ice-wing, #60c0f0)',
    layers: 1,
  },
  {
    key: 'aurora', name: 'Aurora',
    minLevel: 101, maxLevel: 300,
    spectrum: ['var(--wing-purple, #8b5cf6)', 'var(--ice-wing, #60c0f0)', 'var(--swan-lavender, #4070c0)'],
    arc: 'var(--wing-purple, #8b5cf6)',
    layers: 2,
  },
  {
    key: 'prism', name: 'Prism',
    minLevel: 301, maxLevel: 500,
    spectrum: ['var(--wing-purple, #8b5cf6)', 'var(--swan-lavender, #4070c0)', 'var(--ice-wing, #60c0f0)', 'var(--gilded-fern, #c6a84b)'],
    arc: 'var(--gilded-fern, #c6a84b)',
    layers: 3,
  },
  {
    key: 'plasma', name: 'Plasma',
    minLevel: 501, maxLevel: 750,
    spectrum: ['var(--wing-purple, #8b5cf6)', 'var(--ice-wing, #60c0f0)', 'var(--gilded-fern, #c6a84b)'],
    arc: 'var(--ice-wing, #60c0f0)',
    layers: 4,
  },
  {
    key: 'ascendant', name: 'Ascendant',
    minLevel: 751, maxLevel: 1000,
    spectrum: ['var(--gilded-fern, #c6a84b)', 'var(--wing-purple, #8b5cf6)', 'var(--ice-wing, #60c0f0)', 'var(--gilded-fern, #c6a84b)'],
    arc: 'var(--gilded-fern, #c6a84b)',
    layers: 5,
  },
];

const clampLevel = (level: number): number =>
  Math.max(1, Math.min(MAX_LEVEL, Number.isFinite(level) ? Math.round(level) : 1));

export const tierOf = (level: number): number => Math.ceil(clampLevel(level) / LEVELS_PER_TIER);

export const eraOf = (level: number): RingEra => {
  const L = clampLevel(level);
  return RING_ERAS.find((e) => L >= e.minLevel && L <= e.maxLevel) ?? RING_ERAS[RING_ERAS.length - 1];
};

/** True on the exact first level of a tier — the celebration threshold. */
export const isTierThreshold = (level: number): boolean => clampLevel(level) % LEVELS_PER_TIER === 1;

/** Smooth 0→1 ascent across the whole 1–1000 climb (Kimi: continuous, not
 *  stepwise). Eased so early levels feel rewarding and the top compresses. */
export const ascent = (level: number): number => {
  const t = (clampLevel(level) - 1) / (MAX_LEVEL - 1);
  return Math.pow(t, 0.85); // mild ease so tier-1 already reads alive
};

/** The engine's per-level dial values. All monotonic in `ascent`. Kimi's law:
 *  as the ring deepens, ambient motion SLOWS (loopMs grows) — sacred = slow. */
export interface RingDials {
  ascent: number;        // 0..1 overall progression
  era: RingEra;
  tier: number;          // 1..50
  isUltimate: boolean;   // level 1000
  glow: number;          // 0.30..0.95 drop-shadow strength
  arcOpacity: number;    // electricity filament visibility 0.35..0.9
  arcCount: number;      // number of filament segments (depth, not speed) 1..4
  loopMs: number;        // master-clock period — GROWS with ascent (slows) 9000..22000
  fringeAlpha: number;   // dispersion facet 0.5..0.7 (capped — §4 budget)
  scrimAlpha: number;    // numeral sanctuary — grows WITH glow to protect legibility
}

export const dialsFor = (level: number): RingDials => {
  const a = ascent(level);
  const era = eraOf(level);
  const L = clampLevel(level);
  return {
    ascent: a,
    era,
    tier: tierOf(level),
    isUltimate: L === MAX_LEVEL,
    glow: 0.30 + a * 0.65,
    arcOpacity: 0.35 + a * 0.55,
    arcCount: Math.min(era.layers, 1 + Math.round(a * 3)),
    loopMs: Math.round(9000 + a * 13000),          // 9s → 22s (deepens = slows)
    fringeAlpha: 0.5 + a * 0.2,                     // ≤0.7, honors §4 opacity budget
    scrimAlpha: 0.55 + a * 0.4,                     // numeral sanctuary scales UP with light
  };
};
