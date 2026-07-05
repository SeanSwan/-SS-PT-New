/**
 * Shared SwanStudios gamification types and client-side leveling helpers.
 * Mirrors backend/utils/levelingAlgorithm.mjs for instant UI previews.
 */

export const MAX_LEVEL = 1000;
// Power-curve constants (mirror backend/utils/levelingAlgorithm.mjs). pointsForLevel
// is the source of truth; calculateLevel inverts it. Replaces the retired sqrt curve.
export const LEVEL_CURVE_SCALE = 80;
export const LEVEL_CURVE_EXPONENT = 1.6;

const RANK_TITLE_NAMES = [
  'First Flight', 'Swan Initiate', 'Dawn Wing', 'River Spark', 'Meadow Current',
  'Tide Runner', 'Wingrise', 'Frostbud', 'Grove Seed', 'First Crest',
  'Riverwing', 'Verdant Wing', 'Grovewalker', 'Tideborne', 'Coral Wing',
  'Moonstream', 'Frostline Swan', 'Rainforest Crest', 'Swan Sentinel', 'Verdant Swan',
  'Iron Grove', 'Ironwood Wing', 'Stonewing', 'Emerald Current', 'Jade Wing',
  'Grovebound', 'Rainforest Wing', 'Canopy Runner', 'Grove Aegis', 'Grove Ascendant',
  'Ruby Bloom', 'Ruby Current', 'Ruby Tide', 'Ruby Grove', 'Ruby Wing',
  'Ruby Canopy', 'Ruby Aegis', 'Ruby Crest', 'Ruby Swan', 'Ruby Ascendant',
  'Amethyst Tide', 'Amethyst Current', 'Amethyst Grove', 'Amethyst Bloom', 'Amethyst Wing',
  'Amethyst Aegis', 'Amethyst Crest', 'Amethyst Swan', 'Amethyst Ascendant', 'Amethyst Sovereign',
  'Aurelian Canopy', 'Aurelian Grove', 'Aurelian Bloom', 'Aurelian Wing', 'Aurelian Tide',
  'Aurelian Aegis', 'Aurelian Crest', 'Aurelian Swan', 'Aurelian Ascendant', 'Aurelian Sovereign',
  'Frostwing Aegis', 'Frostwood Current', 'Frostwood Wing', 'Frostwood Tide', 'Frostwood Crest',
  'Frostwood Swan', 'Frostwing Vanguard', 'Frostwing Sovereign', 'Frostwing Paragon', 'Frostwing Luminary',
  'Starfall Wing', 'Starfall Current', 'Starfall Aegis', 'Starfall Ascendant', 'Starfall Sovereign',
  'Aurora Current', 'Aurora Wing', 'Aurora Aegis', 'Aurora Swan', 'Aurora Paragon',
  'Sapphire Tide', 'Sapphire Current', 'Sapphire Grove', 'Sapphire Wing', 'Sapphire Crest',
  'Sapphire Aegis', 'Sapphire Swan', 'Sapphire Ascendant', 'Sapphire Sovereign', 'Sapphire Paragon',
  'Celestial Swan', 'Crystalline Wing', 'Crystalline Aegis', 'Crystalline Ascendant',
  'Crystalline Sovereign', 'Swan Luminary', 'Swan Paragon', 'Grand Crystalline Swan', 'Apex Crystalline Swan',
  'Eternal Crystalline Swan',
] as const;

const LEGACY_TIER_ALIASES: Record<string, string> = {
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

export type TierName = string;

export interface TierDisplay {
  name: string;
  emoji: string;
  color: string;
  levelRange: string;
}

export interface RankTitle extends TierDisplay {
  key: string;
  minLevel: number;
  maxLevel: number;
}

function slugifyRankName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function rankColorForLevel(minLevel: number): string {
  if (minLevel >= 991) return 'var(--accent-primary, #60C0F0)';
  if (minLevel >= 900) return 'var(--text-primary, #E0ECF4)';
  if (minLevel >= 800) return 'var(--data-primary, #50A0F0)';
  if (minLevel >= 700) return 'var(--accent-secondary, #8B5CF6)';
  if (minLevel >= 500) return 'var(--accent-luxury, #C6A84B)';
  if (minLevel >= 300) return 'var(--accent-danger, #C92A54)';
  if (minLevel >= 200) return 'var(--accent-success, #22C55E)';
  return 'var(--accent-primary, #60C0F0)';
}

function buildRankTitle(name: string, index: number): RankTitle {
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

function toTierDisplay(rank: RankTitle): TierDisplay {
  return {
    name: rank.name,
    emoji: rank.emoji,
    color: rank.color,
    levelRange: rank.levelRange,
  };
}

export const RANK_TITLES: RankTitle[] = RANK_TITLE_NAMES.map(buildRankTitle);

const RANK_BY_KEY: Record<string, RankTitle> = Object.fromEntries(
  RANK_TITLES.map((rank) => [rank.key, rank])
);

export const TIER_DISPLAY: Record<string, TierDisplay> = {
  ...Object.fromEntries(RANK_TITLES.map((rank) => [rank.key, toTierDisplay(rank)])),
  ...Object.fromEntries(
    Object.entries(LEGACY_TIER_ALIASES).map(([legacyKey, rankKey]) => [
      legacyKey,
      toTierDisplay(RANK_BY_KEY[rankKey] ?? RANK_TITLES[0]),
    ])
  ),
};

function normalizeLevel(level: number): number {
  if (!Number.isFinite(level) || level <= 1) return 1;
  return Math.min(MAX_LEVEL, Math.floor(level));
}

function resolveRankKey(tier: string): string {
  const key = slugifyRankName(String(tier || '').trim());
  return LEGACY_TIER_ALIASES[key] || key;
}

export function getRankTitles(): RankTitle[] {
  return RANK_TITLES.map((rank) => ({ ...rank }));
}

export function getTierDisplay(tier: string): TierDisplay {
  const rank = RANK_BY_KEY[resolveRankKey(tier)] ?? RANK_TITLES[0];
  return toTierDisplay(rank);
}

// ===== Skill Trees =====

export type SkillTree =
  | 'awakening'
  | 'forge_nasm'
  | 'iron_gravity'
  | 'tribe_social'
  | 'free_spirit'
  | 'unbroken_streaks';

export interface SkillTreeDisplay {
  name: string;
  emoji: string;
  description: string;
  color: string;
}

export const SKILL_TREE_DISPLAY: Record<SkillTree, SkillTreeDisplay> = {
  awakening: { name: 'Dawnflight Path', emoji: '', description: 'First wins, profile setup, and launch milestones', color: 'var(--text-primary, #E0ECF4)' },
  forge_nasm: { name: 'Coachcraft Grove', emoji: '', description: 'Technique study, coaching knowledge, and certification progress', color: 'var(--accent-luxury, #C6A84B)' },
  iron_gravity: { name: 'Ironwood Flight', emoji: '', description: 'Workout logs, PRs, strength, and conditioning', color: 'var(--data-primary, #50A0F0)' },
  tribe_social: { name: 'Flock Council', emoji: '', description: 'Team support, posts, groups, and community boosts', color: 'var(--tertiary, #4070C0)' },
  free_spirit: { name: 'Vitality Grove', emoji: '', description: 'Nutrition, recovery, flexibility, sleep, and daily health habits', color: 'var(--accent-success, #22C55E)' },
  unbroken_streaks: { name: 'Evergreen Current', emoji: '', description: 'Consistency chains, comeback arcs, and long-term discipline', color: 'var(--accent-primary, #60C0F0)' },
};

// ===== Rarity =====

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_COLORS: Record<Rarity, string> = {
  common: 'var(--tertiary, #4070C0)',
  rare: 'var(--accent-luxury, #C6A84B)',
  epic: 'var(--accent-secondary, #8B5CF6)',
  legendary: 'linear-gradient(135deg, var(--primary, #002060), var(--accent-primary, #60C0F0), var(--accent-luxury, #C6A84B))',
};

// ===== Achievement =====

export interface Achievement {
  id: string;
  name: string;
  title: string;
  description: string;
  iconEmoji: string;
  iconUrl?: string;
  category: 'fitness' | 'social' | 'streak' | 'milestone' | 'special';
  rarity: Rarity;
  xpReward: number;
  requiredPoints: number;
  maxProgress: number;
  skillTree: SkillTree;
  skillTreeOrder: number;
  templateId: string;
  tierLevel: number;
  isHidden: boolean;
  isSecret: boolean;
  difficulty: number;
}

export interface UserAchievement {
  id: string;
  achievementId: string;
  userId: number;
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
  earnedAt: string | null;
  xpAwarded: number;
  pointsAwarded: number;
  achievement: Achievement;
}

export interface LevelProgress {
  level: number;
  tier: TierName;
  tierDisplay: TierDisplay;
  currentPoints: number;
  pointsIntoLevel: number;
  pointsNeededForNext: number;
  progressPercent: number;
  nextLevelAt: number;
}

export interface GamificationProfile {
  userId: number;
  level: number;
  tier: TierName;
  points: number;
  levelProgress: LevelProgress;
  stats: {
    totalWorkouts: number;
    streakDays: number;
    totalExercises: number;
    achievementsEarned: number;
    achievementsTotal: number;
  };
  recentAchievements: UserAchievement[];
}

export function pointsForLevel(level: number): number {
  const targetLevel = normalizeLevel(level);
  if (targetLevel <= 1) return 0;
  return Math.floor(LEVEL_CURVE_SCALE * Math.pow(targetLevel - 1, LEVEL_CURVE_EXPONENT));
}

export function calculateLevel(totalPoints: number): number {
  if (!Number.isFinite(totalPoints) || totalPoints <= 0) return 1;
  // Analytic inverse of pointsForLevel, corrected for floor() rounding drift so
  // that calculateLevel(pointsForLevel(L)) === L for every L in [1, MAX_LEVEL].
  const approxLevel = Math.floor(Math.pow(totalPoints / LEVEL_CURVE_SCALE, 1 / LEVEL_CURVE_EXPONENT)) + 1;
  let level = Math.min(MAX_LEVEL, Math.max(1, approxLevel));
  while (level < MAX_LEVEL && pointsForLevel(level + 1) <= totalPoints) level += 1;
  while (level > 1 && pointsForLevel(level) > totalPoints) level -= 1;
  return level;
}

export function getTier(level: number): TierName {
  const normalizedLevel = normalizeLevel(level);
  const rank = RANK_TITLES.find((entry) => normalizedLevel >= entry.minLevel && normalizedLevel <= entry.maxLevel);
  return (rank ?? RANK_TITLES[RANK_TITLES.length - 1]).key;
}

export function getLevelProgress(totalPoints: number): LevelProgress {
  const currentPoints = Number.isFinite(totalPoints) && totalPoints > 0 ? totalPoints : 0;
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
    progressPercent:
      pointsNeededForNext > 0
        ? Math.min(100, (pointsIntoLevel / pointsNeededForNext) * 100)
        : 100,
    nextLevelAt: nextLevelPoints,
  };
}
