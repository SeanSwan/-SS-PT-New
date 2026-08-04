/**
 * Authoritative SwanStudios leveling and rank helpers.
 *
 * The XP curve is a power curve: pointsForLevel(L) = floor(80 * (L-1)^1.6),
 * with calculateLevel(xp) as its exact inverse. This replaces the retired sqrt
 * curve (level = floor(0.1 * sqrt(points))) that made Level 25 require 62,500
 * lifetime points. Public rank language follows the Swan 1-1000 ladder.
 *
 * NOTE: level must be driven by LIFETIME earned XP, never the spendable point
 * balance — spending points must not lower a user's level or rank.
 */

export const MAX_LEVEL = 1000;
// Power-curve constants. pointsForLevel is the source of truth; calculateLevel inverts it.
export const LEVEL_CURVE_SCALE = 80;
export const LEVEL_CURVE_EXPONENT = 1.6;

const RANK_TITLE_NAMES = [
  'First Flight',
  'Swan Initiate',
  'Dawn Wing',
  'River Spark',
  'Meadow Current',
  'Tide Runner',
  'Wingrise',
  'Frostbud',
  'Grove Seed',
  'First Crest',
  'Riverwing',
  'Verdant Wing',
  'Grovewalker',
  'Tideborne',
  'Coral Wing',
  'Moonstream',
  'Frostline Swan',
  'Rainforest Crest',
  'Swan Sentinel',
  'Verdant Swan',
  'Iron Grove',
  'Ironwood Wing',
  'Stonewing',
  'Emerald Current',
  'Jade Wing',
  'Grovebound',
  'Rainforest Wing',
  'Canopy Runner',
  'Grove Aegis',
  'Grove Ascendant',
  'Ruby Bloom',
  'Ruby Current',
  'Ruby Tide',
  'Ruby Grove',
  'Ruby Wing',
  'Ruby Canopy',
  'Ruby Aegis',
  'Ruby Crest',
  'Ruby Swan',
  'Ruby Ascendant',
  'Amethyst Tide',
  'Amethyst Current',
  'Amethyst Grove',
  'Amethyst Bloom',
  'Amethyst Wing',
  'Amethyst Aegis',
  'Amethyst Crest',
  'Amethyst Swan',
  'Amethyst Ascendant',
  'Amethyst Sovereign',
  'Aurelian Canopy',
  'Aurelian Grove',
  'Aurelian Bloom',
  'Aurelian Wing',
  'Aurelian Tide',
  'Aurelian Aegis',
  'Aurelian Crest',
  'Aurelian Swan',
  'Aurelian Ascendant',
  'Aurelian Sovereign',
  'Frostwing Aegis',
  'Frostwood Current',
  'Frostwood Wing',
  'Frostwood Tide',
  'Frostwood Crest',
  'Frostwood Swan',
  'Frostwing Vanguard',
  'Frostwing Sovereign',
  'Frostwing Paragon',
  'Frostwing Luminary',
  'Starfall Wing',
  'Starfall Current',
  'Starfall Aegis',
  'Starfall Ascendant',
  'Starfall Sovereign',
  'Aurora Current',
  'Aurora Wing',
  'Aurora Aegis',
  'Aurora Swan',
  'Aurora Paragon',
  'Sapphire Tide',
  'Sapphire Current',
  'Sapphire Grove',
  'Sapphire Wing',
  'Sapphire Crest',
  'Sapphire Aegis',
  'Sapphire Swan',
  'Sapphire Ascendant',
  'Sapphire Sovereign',
  'Sapphire Paragon',
  'Celestial Swan',
  'Crystalline Wing',
  'Crystalline Aegis',
  'Crystalline Ascendant',
  'Crystalline Sovereign',
  'Swan Luminary',
  'Swan Paragon',
  'Grand Crystalline Swan',
  'Apex Crystalline Swan',
  'Eternal Crystalline Swan',
];

const LEGACY_TIER_ALIASES = {
  bronze: 'first_flight',
  bronze_forge: 'first_flight',
  silver: 'riverwing',
  silver_edge: 'riverwing',
  gold: 'iron_grove',
  titanium_core: 'iron_grove',
  platinum: 'frostwing_aegis',
  obsidian_warrior: 'frostwing_aegis',
  frostwing_ascendant: 'frostwing_vanguard',
  crystalline_swan: 'grand_crystalline_swan',
};

/**
 * Every tier key the system will ever store or accept, modern + legacy alias.
 * Exported so callers ALLOWLIST against the real domain instead of hand-copying
 * a list: a hand-written `['bronze','silver','gold','platinum']` silently
 * matched nothing, because the column stores `bronze_forge`-style keys.
 */
/** Legacy alias keys still stored on existing rows (User.tier defaults to one). */
export const LEGACY_TIER_ALIAS_KEYS = Object.freeze(Object.keys(LEGACY_TIER_ALIASES));

export const KNOWN_TIER_KEYS = Object.freeze(
  new Set([...Object.keys(LEGACY_TIER_ALIASES), ...Object.values(LEGACY_TIER_ALIASES)]),
);

function slugifyRankName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function rankColorForLevel(minLevel) {
  if (minLevel >= 991) return 'var(--accent-primary, #60C0F0)';
  if (minLevel >= 900) return 'var(--text-primary, #E0ECF4)';
  if (minLevel >= 800) return 'var(--data-primary, #50A0F0)';
  if (minLevel >= 700) return 'var(--accent-secondary, #8B5CF6)';
  if (minLevel >= 500) return 'var(--accent-luxury, #C6A84B)';
  if (minLevel >= 300) return 'var(--accent-danger, #C92A54)';
  if (minLevel >= 200) return 'var(--accent-success, #22C55E)';
  return 'var(--accent-primary, #60C0F0)';
}

function buildRankTitle(name, index) {
  const minLevel = index * 10 + 1;
  const maxLevel = Math.min(MAX_LEVEL, minLevel + 9);
  const levelRange = minLevel === maxLevel ? String(minLevel) : `${minLevel}-${maxLevel}`;

  return {
    key: slugifyRankName(name),
    name,
    emoji: '',
    color: rankColorForLevel(minLevel),
    minLevel,
    maxLevel,
    levelRange,
  };
}

export const RANK_TITLES = RANK_TITLE_NAMES.map(buildRankTitle);

const RANK_BY_KEY = Object.fromEntries(RANK_TITLES.map((rank) => [rank.key, rank]));

function normalizeLevel(level) {
  const numericLevel = Number(level);
  if (!Number.isFinite(numericLevel) || numericLevel <= 1) return 1;
  return Math.min(MAX_LEVEL, Math.floor(numericLevel));
}

function resolveRankKey(tier) {
  const key = slugifyRankName(String(tier || '').trim());
  return LEGACY_TIER_ALIASES[key] || key;
}

export function getRankTitles() {
  return RANK_TITLES.map((rank) => ({ ...rank }));
}

export function pointsForLevel(level) {
  const targetLevel = normalizeLevel(level);
  if (targetLevel <= 1) return 0;
  return Math.floor(LEVEL_CURVE_SCALE * Math.pow(targetLevel - 1, LEVEL_CURVE_EXPONENT));
}

export function calculateLevel(totalPoints) {
  const numericPoints = Number(totalPoints);
  if (!Number.isFinite(numericPoints) || numericPoints <= 0) return 1;
  // Analytic inverse of pointsForLevel, corrected for floor() rounding drift so
  // that calculateLevel(pointsForLevel(L)) === L for every L in [1, MAX_LEVEL].
  const approxLevel = Math.floor(Math.pow(numericPoints / LEVEL_CURVE_SCALE, 1 / LEVEL_CURVE_EXPONENT)) + 1;
  let level = Math.min(MAX_LEVEL, Math.max(1, approxLevel));
  while (level < MAX_LEVEL && pointsForLevel(level + 1) <= numericPoints) level += 1;
  while (level > 1 && pointsForLevel(level) > numericPoints) level -= 1;
  return level;
}

export function getTier(level) {
  const normalizedLevel = normalizeLevel(level);
  const rank = RANK_TITLES.find((entry) => normalizedLevel >= entry.minLevel && normalizedLevel <= entry.maxLevel);
  return (rank || RANK_TITLES[RANK_TITLES.length - 1]).key;
}

export function getTierDisplay(tier) {
  const rank = RANK_BY_KEY[resolveRankKey(tier)] || RANK_TITLES[0];
  return {
    name: rank.name,
    emoji: rank.emoji,
    color: rank.color,
    levelRange: rank.levelRange,
  };
}

export function getLevelProgress(totalPoints) {
  const numericPoints = Number(totalPoints);
  const currentPoints = Number.isFinite(numericPoints) && numericPoints > 0 ? numericPoints : 0;
  const level = calculateLevel(currentPoints);
  const tier = getTier(level);
  const currentLevelPoints = pointsForLevel(level);

  if (level >= MAX_LEVEL) {
    return {
      level,
      tier,
      tierDisplay: getTierDisplay(tier),
      currentPoints,
      pointsIntoLevel: Math.max(0, currentPoints - currentLevelPoints),
      pointsNeededForNext: 0,
      progressPercent: 100,
      nextLevelAt: currentLevelPoints,
    };
  }

  const nextLevelPoints = pointsForLevel(level + 1);
  const pointsIntoLevel = Math.max(0, currentPoints - currentLevelPoints);
  const pointsNeededForNext = nextLevelPoints - currentLevelPoints;

  return {
    level,
    tier,
    tierDisplay: getTierDisplay(tier),
    currentPoints,
    pointsIntoLevel,
    pointsNeededForNext,
    progressPercent: pointsNeededForNext > 0
      ? Math.min(100, (pointsIntoLevel / pointsNeededForNext) * 100)
      : 100,
    nextLevelAt: nextLevelPoints,
  };
}

export const POINTS_CONFIG = {
  completeWorkout: 50,
  personalRecord: 100,
  completeAssessment: 75,
  createPost: 10,
  receiveLike: 5,
  addComment: 5,
  followUser: 5,
  dailyLogin: 10,
  streakBonus3Day: 25,
  streakBonus7Day: 75,
  streakBonus30Day: 300,
  streakBonus90Day: 1000,
  streakBonus365Day: 5000,
  completeModule: 50,
  watchTutorial: 15,
  logNutrition: 15,
  logRecovery: 15,
  logRecoveryBreath: 20,
  logSleep: 10,
};

export default {
  MAX_LEVEL,
  RANK_TITLES,
  calculateLevel,
  pointsForLevel,
  getTier,
  getTierDisplay,
  getLevelProgress,
  getRankTitles,
  POINTS_CONFIG,
};
