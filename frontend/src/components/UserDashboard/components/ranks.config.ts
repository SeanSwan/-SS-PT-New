/**
 * FILE: ranks.config.ts
 * PURPOSE: Data-driven rank/badge config for the Swan level badge (Kimi K3
 *          mandate: config + one generic renderer, NOT 100 hand-authored
 *          components — protects the 300-line rule + avoids asset bankruptcy).
 *          10 RANKS across 1000 levels (a major frame transform every 100),
 *          each with 10 SUB-TIERS (a detail pip every 10 levels). The badge
 *          FRAME wraps the CrystalProgressRing; the ring stays the centerpiece.
 *
 * KIMI BINDING LAW applied here:
 *  - NEVER grey. The lowest rank is GUNMETAL / brushed pewter + a single living
 *    cyan filament — premium restraint, not "disabled". Every rank is gorgeous.
 *  - Min frame-luminance floor vs the obsidian vault so a low badge is visible.
 *  - Molt: material refines gunmetal → silver → crystalline-white → radiant gold
 *    as you ascend (swans mature grey→white; here it's premium metal→crystal).
 *  - Tokens only (var(--token, #fallback)); no bare hex in consumers.
 * NOTE: pure data — no React. Unit-testable.
 */

export const LEVELS_PER_RANK = 100;
export const SUB_TIERS_PER_RANK = 10;
export const LEVELS_PER_SUBTIER = LEVELS_PER_RANK / SUB_TIERS_PER_RANK; // 10
export const RANK_COUNT = 1000 / LEVELS_PER_RANK; // 10

export interface RankFrame {
  /** 1..10 */
  rank: number;
  name: string;
  minLevel: number;
  maxLevel: number;
  /** Frame edge material (token, fallback). Escalates gunmetal → gold. */
  frameEdge: string;
  /** Softer inner bevel tint. */
  frameBevel: string;
  /** Chevron / pip accent for the sub-tier ticks. */
  pip: string;
  /** Does this rank earn a crown motif at the top of the frame? */
  crown: boolean;
  /** Facet-count on the frame silhouette (Crystal Growth — accretes by rank). */
  facets: number;
}

const T = {
  gunmetal: 'var(--rank-gunmetal, #6b7480)',
  pewter: 'var(--rank-pewter, #8b95a3)',
  silver: 'var(--rank-silver, #b8c4d4)',
  ice: 'var(--ice-wing, #60c0f0)',
  lav: 'var(--swan-lavender, #4070c0)',
  purple: 'var(--wing-purple, #8b5cf6)',
  frost: 'var(--frost-white, #e0ecf4)',
  gold: 'var(--gilded-fern, #c6a84b)',
};

/** 10 ranks. Gunmetal (never grey-as-disabled) → pewter/silver → crystalline
 *  white → lavender/purple → radiant gold, crowned at the top ranks. */
export const RANK_FRAMES: RankFrame[] = [
  { rank: 1,  name: 'Cygnet',    minLevel: 1,   maxLevel: 100,  frameEdge: T.gunmetal, frameBevel: T.pewter,  pip: T.ice,    crown: false, facets: 6 },
  { rank: 2,  name: 'Fledgling', minLevel: 101, maxLevel: 200,  frameEdge: T.pewter,   frameBevel: T.silver,  pip: T.ice,    crown: false, facets: 6 },
  { rank: 3,  name: 'Glidewing', minLevel: 201, maxLevel: 300,  frameEdge: T.silver,   frameBevel: T.ice,     pip: T.ice,    crown: false, facets: 7 },
  { rank: 4,  name: 'Frostwing', minLevel: 301, maxLevel: 400,  frameEdge: T.ice,      frameBevel: T.silver,  pip: T.lav,    crown: false, facets: 7 },
  { rank: 5,  name: 'Skyward',   minLevel: 401, maxLevel: 500,  frameEdge: T.lav,      frameBevel: T.ice,     pip: T.ice,    crown: false, facets: 8 },
  { rank: 6,  name: 'Aurora',    minLevel: 501, maxLevel: 600,  frameEdge: T.purple,   frameBevel: T.lav,     pip: T.ice,    crown: false, facets: 8 },
  { rank: 7,  name: 'Zenith',    minLevel: 601, maxLevel: 700,  frameEdge: T.purple,   frameBevel: T.ice,     pip: T.gold,   crown: true,  facets: 9 },
  { rank: 8,  name: 'Celestine', minLevel: 701, maxLevel: 800,  frameEdge: T.gold,     frameBevel: T.purple,  pip: T.gold,   crown: true,  facets: 10 },
  { rank: 9,  name: 'Seraphic',  minLevel: 801, maxLevel: 900,  frameEdge: T.gold,     frameBevel: T.ice,     pip: T.gold,   crown: true,  facets: 11 },
  { rank: 10, name: 'Sovereign', minLevel: 901, maxLevel: 1000, frameEdge: T.gold,     frameBevel: T.frost,   pip: T.gold,   crown: true,  facets: 12 },
];

const clampLevel = (level: number): number =>
  Math.max(1, Math.min(1000, Number.isFinite(level) ? Math.round(level) : 1));

export const rankOf = (level: number): number => Math.ceil(clampLevel(level) / LEVELS_PER_RANK);

/** 1..10 within the current rank — the number of filled sub-tier pips. */
export const subTierOf = (level: number): number => {
  const within = ((clampLevel(level) - 1) % LEVELS_PER_RANK); // 0..99
  return Math.min(SUB_TIERS_PER_RANK, Math.floor(within / LEVELS_PER_SUBTIER) + 1);
};

export const rankFrameOf = (level: number): RankFrame => {
  const L = clampLevel(level);
  return RANK_FRAMES.find((f) => L >= f.minLevel && L <= f.maxLevel) ?? RANK_FRAMES[RANK_FRAMES.length - 1];
};

export interface BadgeState {
  rank: number;
  subTier: number;      // 1..10 filled pips
  frame: RankFrame;
  isSovereign: boolean; // rank 10
}

export const badgeStateFor = (level: number): BadgeState => {
  const frame = rankFrameOf(level);
  return {
    rank: frame.rank,
    subTier: subTierOf(level),
    frame,
    isSovereign: frame.rank === RANK_COUNT,
  };
};