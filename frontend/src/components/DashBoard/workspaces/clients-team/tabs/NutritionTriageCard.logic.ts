export interface MacroSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  totalSodium: number;
  mealCount: number;
  meals?: Record<string, unknown>;
}

export interface WeeklyMacroDay {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount?: number;
}

export type NutritionTriageTone = 'default' | 'warning';

export interface NutritionTriageFlag {
  id: string;
  label: string;
  detail: string;
  tone: NutritionTriageTone;
}

export interface NutritionTriageViewModel {
  statusLabel: string;
  proteinLabel: string;
  fiberLabel: string;
  weeklyLabel: string;
  averageLabel: string;
  flags: NutritionTriageFlag[];
}

const decimalNumberPattern = /^\d+(?:\.\d+)?$/;

const asNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!decimalNumberPattern.test(trimmed)) return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const round = (value: unknown): number => Math.round(asNumber(value));

const formatInt = (value: number): string => value.toLocaleString('en-US', { maximumFractionDigits: 0 });

const asWholeCount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return 0;
  return value;
};

const hasLoggedDay = (day: WeeklyMacroDay): boolean =>
  asWholeCount(day.mealCount) > 0
  || asNumber(day.calories) > 0
  || asNumber(day.protein) > 0
  || asNumber(day.carbs) > 0
  || asNumber(day.fat) > 0;

const mealStatusLabel = (mealCount: number): string => {
  if (mealCount <= 0) return 'No meals logged today';
  if (mealCount === 1) return '1 meal today';
  return `${mealCount} meals today`;
};

const buildFlags = (
  summary: MacroSummary,
  todayMealCount: number,
  loggedDays: number,
  weeklyDays: WeeklyMacroDay[],
): NutritionTriageFlag[] => {
  const flags: NutritionTriageFlag[] = [];

  if (todayMealCount <= 0) {
    flags.push({
      id: 'no-meals',
      label: 'No meals logged today',
      detail: 'Check in before coaching decisions rely on nutrition data.',
      tone: 'warning',
    });
  }

  if (asNumber(summary.totalSodium) > 2300) {
    flags.push({
      id: 'sodium',
      label: 'Sodium attention',
      detail: `${formatInt(round(summary.totalSodium))}mg today`,
      tone: 'warning',
    });
  }

  if (asNumber(summary.totalSugar) > 50) {
    flags.push({
      id: 'sugar',
      label: 'Sugar attention',
      detail: `${formatInt(round(summary.totalSugar))}g today`,
      tone: 'warning',
    });
  }

  if (weeklyDays.length >= 7 && loggedDays <= 2) {
    flags.push({
      id: 'low-rhythm',
      label: 'Sparse weekly logging',
      detail: `${loggedDays} of 7 days have entries`,
      tone: 'warning',
    });
  }

  return flags;
};

export const buildNutritionTriage = ({
  summary,
  weeklyDays,
}: {
  summary: MacroSummary;
  weeklyDays: WeeklyMacroDay[];
}): NutritionTriageViewModel => {
  const loggedDays = weeklyDays.filter(hasLoggedDay).length;
  const todayMealCount = asWholeCount(summary.mealCount);
  const averageCalories = loggedDays > 0
    ? Math.round(weeklyDays.filter(hasLoggedDay).reduce((sum, day) => sum + asNumber(day.calories), 0) / loggedDays)
    : 0;

  return {
    statusLabel: mealStatusLabel(todayMealCount),
    proteinLabel: `${formatInt(round(summary.totalProtein))}g protein`,
    fiberLabel: `${formatInt(round(summary.totalFiber))}g fiber`,
    weeklyLabel: `${loggedDays} of 7 days logged`,
    averageLabel: averageCalories > 0 ? `${formatInt(averageCalories)} avg cal` : 'No weekly average yet',
    flags: buildFlags(summary, todayMealCount, loggedDays, weeklyDays),
  };
};
