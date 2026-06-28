import { getTier, getTierDisplay } from '../../../../types/gamification';

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
  const level = normalizeLevel(profile?.level);
  const tierDisplay = getTierDisplay(profile?.tier || getTier(level));

  return {
    level,
    totalXp: normalizeWholeNumber(profile?.points),
    nextLevelProgress: normalizePercent(profile?.nextLevelProgress),
    weekWorkouts: normalizeWholeNumber(weeklyRecap?.thisWeek?.workouts),
    weekBonuses: normalizeWholeNumber(weeklyRecap?.thisWeek?.surpriseMultipliers),
    weekXp: normalizeWholeNumber(weeklyRecap?.thisWeek?.totalXP),
    streakDays: normalizeWholeNumber(weeklyRecap?.current?.streak ?? profile?.streakDays),
    tierColor: tierDisplay.color,
    tierLabel: tierDisplay.name,
  };
}
