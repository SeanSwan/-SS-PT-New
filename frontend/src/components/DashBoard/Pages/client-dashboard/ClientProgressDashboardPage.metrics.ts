export interface WeeklyRecap {
  thisWeek?: {
    workouts?: number;
    surpriseMultipliers?: number;
    totalXP?: number;
  };
  current?: {
    streak?: number;
  };
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'var(--tier-bronze, #CD7F32)',
  silver: 'var(--tier-silver, #C0C0C0)',
  gold: 'var(--tier-gold, #C6A84B)',
  platinum: 'var(--accent-secondary, #8B5CF6)',
  bronze_forge: 'var(--tier-bronze, #CD7F32)',
  silver_edge: 'var(--tier-silver, #C0C0C0)',
  titanium_core: 'var(--tier-gold, #C6A84B)',
  obsidian_warrior: 'var(--bg-base, #0A0A0F)',
  crystalline_swan: 'var(--accent-primary, #60C0F0)',
};

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze Forge',
  silver: 'Silver Edge',
  gold: 'Titanium Core',
  platinum: 'Obsidian+',
  bronze_forge: 'Bronze Forge',
  silver_edge: 'Silver Edge',
  titanium_core: 'Titanium Core',
  obsidian_warrior: 'Obsidian Warrior',
  crystalline_swan: 'Crystalline Swan',
};

const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

const parsePrimitiveNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeWholeNumber = (value: unknown, fallback = 0, min = 0) => {
  const numeric = parsePrimitiveNumber(value);
  if (numeric === null) return fallback;
  return Math.max(min, Math.floor(numeric));
};

const normalizeLevel = (value: unknown) => normalizeWholeNumber(value, 1, 1);
const normalizePercent = (value: unknown) => Math.min(100, normalizeWholeNumber(value, 0, 0));

export function getClientProgressDashboardMetrics(
  profile?: {
    level?: unknown;
    points?: unknown;
    nextLevelProgress?: unknown;
    streakDays?: unknown;
    tier?: string;
  } | null,
  weeklyRecap?: WeeklyRecap | null,
) {
  const tierKey = profile?.tier || 'bronze';
  return {
    level: normalizeLevel(profile?.level),
    totalXp: normalizeWholeNumber(profile?.points),
    nextLevelProgress: normalizePercent(profile?.nextLevelProgress),
    weekWorkouts: normalizeWholeNumber(weeklyRecap?.thisWeek?.workouts),
    weekBonuses: normalizeWholeNumber(weeklyRecap?.thisWeek?.surpriseMultipliers),
    weekXp: normalizeWholeNumber(weeklyRecap?.thisWeek?.totalXP),
    streakDays: normalizeWholeNumber(weeklyRecap?.current?.streak ?? profile?.streakDays),
    tierColor: TIER_COLORS[tierKey] || TIER_COLORS.bronze,
    tierLabel: TIER_LABELS[tierKey] || TIER_LABELS.bronze,
  };
}
