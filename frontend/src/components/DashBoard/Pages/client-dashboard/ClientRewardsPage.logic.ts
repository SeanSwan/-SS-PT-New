import { getRankTitles } from '../../../../types/gamification';

export interface AchievementRecord {
  id?: string | number;
  achievementId?: string | number;
  earnedAt?: string;
  achievement?: {
    id?: string | number;
    tier?: string;
    rarity?: string;
    name?: string;
    title?: string;
    description?: string;
  };
  name?: string;
  title?: string;
  description?: string;
  pointsAwarded?: number;
}

export interface PointTransaction {
  id?: string | number;
  balance?: number;
  createdAt?: string;
  description?: string;
  source?: string;
  transactionType?: string;
  points?: number;
}

export interface TierDefinition {
  name: string;
  min: number;
  max: number;
  color: string;
  shortName: string;
}

export const SAFE_REWARDS_ERROR_COPY =
  'Rewards data could not be loaded. Try again in a moment.';

export const TIERS: TierDefinition[] = getRankTitles().map((rank) => ({
  name: rank.name,
  shortName: `Lv ${rank.levelRange}`,
  min: rank.minLevel,
  max: rank.maxLevel,
  color: rank.color,
}));

const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

export const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && DECIMAL_NUMBER_PATTERN.test(value.trim()) ? Number(value.trim()) : fallback;
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const clampPercent = (value: unknown): number =>
  Math.max(0, Math.min(100, Math.round(toFiniteNumber(value, 0))));

export const formatNumber = (value: unknown): string =>
  Math.max(0, Math.round(toFiniteNumber(value, 0))).toLocaleString();

const CONTROL_CHARACTERS = /\p{Cc}/gu;
const RUNNING_WHITESPACE = /\s+/g;
const DEFAULT_COPY_LIMIT = 96;
const ALLOWED_REWARD_RARITIES = new Set([
  'common',
  'rare',
  'epic',
  'legendary',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'crystalline',
]);

const normalizeRewardsText = (value: unknown): string =>
  String(value ?? '')
    .replace(CONTROL_CHARACTERS, ' ')
    .replace(RUNNING_WHITESPACE, ' ')
    .trim();

const limitRewardsText = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

export const cleanRewardsText = (
  value: unknown,
  fallback: string,
  maxLength = DEFAULT_COPY_LIMIT
): string => limitRewardsText(normalizeRewardsText(value) || fallback, maxLength);

const firstCleanRewardsText = (
  values: unknown[],
  fallback: string,
  maxLength = DEFAULT_COPY_LIMIT
): string => {
  for (const value of values) {
    const normalized = normalizeRewardsText(value);
    if (normalized) return limitRewardsText(normalized, maxLength);
  }

  return limitRewardsText(fallback, maxLength);
};

export const getTierForLevel = (level: number): TierDefinition =>
  TIERS.find((tier) => level >= tier.min && level <= tier.max) || TIERS[0];

export const getAchievementName = (achievement: AchievementRecord): string =>
  firstCleanRewardsText([
    achievement.achievement?.name,
    achievement.achievement?.title,
    achievement.name,
    achievement.title,
  ], 'Achievement');

export const getAchievementDescription = (achievement: AchievementRecord): string =>
  firstCleanRewardsText([
    achievement.achievement?.description,
    achievement.description,
  ], `${formatNumber(achievement.pointsAwarded)} XP awarded`, 140);

export const getAchievementRarity = (achievement: AchievementRecord): string => {
  const rarity = firstCleanRewardsText([
    achievement.achievement?.rarity,
    achievement.achievement?.tier,
  ], 'common', 32).toLowerCase();

  return ALLOWED_REWARD_RARITIES.has(rarity) ? rarity : 'common';
};

export const describeTransaction = (tx: PointTransaction): string =>
  firstCleanRewardsText([tx.description, tx.source], 'XP activity');

export const formatTransactionPoints = (tx: PointTransaction): string => {
  const points = Math.round(toFiniteNumber(tx.points, 0));
  if (points === 0) return '0 XP';

  const isDebit = points < 0 || tx.transactionType === 'spend';
  const sign = isDebit ? '-' : '+';
  return `${sign}${Math.abs(points).toLocaleString()} XP`;
};

export const getSourceLabel = (source?: string): string => {
  if (!source) return 'gamification';
  return cleanRewardsText(source.replace(/[_-]+/g, ' '), 'gamification', 64);
};

const cleanKeyPart = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const stableHash = (parts: unknown[]): string => {
  const source = parts.map((part) => cleanKeyPart(part)).filter(Boolean).join('|') || 'reward-row';
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
};

export const getAchievementRowKey = (achievement: AchievementRecord): string => {
  const explicitId = achievement.id ?? achievement.achievementId ?? achievement.achievement?.id;
  if (explicitId !== undefined && explicitId !== null && String(explicitId).trim()) {
    return `achievement-${cleanKeyPart(explicitId)}`;
  }

  return `achievement-${stableHash([
    getAchievementName(achievement),
    getAchievementDescription(achievement),
    getAchievementRarity(achievement),
    achievement.pointsAwarded,
    achievement.earnedAt,
  ])}`;
};

export const getTransactionRowKey = (tx: PointTransaction): string => {
  if (tx.id !== undefined && tx.id !== null && String(tx.id).trim()) {
    return `transaction-${cleanKeyPart(tx.id)}`;
  }

  return `transaction-${stableHash([
    tx.description,
    tx.source,
    tx.transactionType,
    tx.points,
    tx.balance,
    tx.createdAt,
  ])}`;
};

export const calculateNextLevelTarget = (level: number, points: number, rawTarget?: unknown): number => {
  const target = toFiniteNumber(rawTarget, 0);
  if (target > points) return Math.ceil(target);
  return Math.ceil(((level + 1) / 0.1) ** 2);
};

export const calculateLevelStartTarget = (level: number): number => {
  if (level <= 1) return 0;
  return Math.ceil((level / 0.1) ** 2);
};

export const calculateProgressPercent = (
  level: number,
  points: number,
  rawProgress?: unknown,
  rawTarget?: unknown
): number => {
  const rawTargetValue = toFiniteNumber(rawTarget, 0);
  if (rawTargetValue > points) return clampPercent(rawProgress);

  const currentLevelTarget = calculateLevelStartTarget(level);
  const nextLevelTarget = calculateNextLevelTarget(level, points, rawTarget);
  const levelSpan = nextLevelTarget - currentLevelTarget;
  if (levelSpan <= 0) return 0;

  return clampPercent(((points - currentLevelTarget) / levelSpan) * 100);
};

const asObjectRows = <T extends object>(value: unknown): T[] =>
  Array.isArray(value)
    ? value.filter((item): item is T => item !== null && typeof item === 'object')
    : [];

export const buildRewardsViewModel = (profile: any = {}) => {
  const level = Math.max(1, Math.round(toFiniteNumber(profile?.level, 1)));
  const points = Math.max(0, Math.round(toFiniteNumber(profile?.points, 0)));
  const nextLevelTarget = calculateNextLevelTarget(level, points, profile?.nextLevelPoints);
  const tier = getTierForLevel(level);
  const progress = calculateProgressPercent(
    level,
    points,
    profile?.nextLevelProgress,
    profile?.nextLevelPoints
  );
  const achievements = asObjectRows<AchievementRecord>(profile?.achievements);
  const transactions = asObjectRows<PointTransaction>(profile?.recentTransactions);
  const streakDays = Math.max(0, Math.round(toFiniteNumber(profile?.streakDays, 0)));
  const totalWorkouts = Math.max(0, Math.round(toFiniteNumber(profile?.totalWorkouts, 0)));
  const leaderboardPosition = Math.max(0, Math.round(toFiniteNumber(profile?.leaderboardPosition, 0)));

  return {
    level,
    points,
    pointsLabel: `${formatNumber(points)} XP`,
    nextLevelTarget,
    nextLevelLabel: `${formatNumber(nextLevelTarget)} XP`,
    tier,
    progress,
    achievements,
    transactions,
    streakDays,
    streakLabel: streakDays > 0 ? `${formatNumber(streakDays)}-day streak` : 'No active streak',
    totalWorkouts,
    workoutLabel: `${formatNumber(totalWorkouts)} workouts`,
    leaderboardLabel: leaderboardPosition > 0 ? `#${formatNumber(leaderboardPosition)}` : 'Unranked',
    nextObjective:
      achievements.length > 0
        ? 'Bank another logged session to climb the next rank checkpoint.'
        : 'Log a first workout to unlock your opening badge.',
  };
};
