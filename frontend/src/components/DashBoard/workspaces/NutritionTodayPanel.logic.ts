import { formatLocalCalendarDate, getLocalCalendarDateDaysAgo } from './clients-team/nutritionDate';
export {
  buildRepeatMacroPayload,
  repeatMacroEntryToNutritionDraft,
} from './NutritionTodayPanel.repeatMeal';
export type { RepeatMacroEntry } from './NutritionTodayPanel.repeatMeal';
export type NutritionTodayTarget = 'log' | 'voice' | 'search' | 'hydration' | 'macros';

export interface NutritionTodaySummary {
  date?: string;
  totalCalories?: number | null;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFat?: number | null;
  totalFiber?: number | null;
  mealCount?: number | null;
  meals?: Record<string, { count?: number | null } | undefined> | null;
}

export interface NutritionWeekDay {
  date: string;
  calories?: number | null;
  mealCount?: number | null;
}

export interface HydrationState {
  filled: number;
  dailyGoal: number;
  glassOz?: number | null;
}

export interface NutritionInsight {
  id: 'gentle-mode-support' | 'training-day-support' | 'protein-gap' | 'fiber-gap' | 'hydration-gap' | 'meal-timing' | 'weekly-rhythm';
  title: string;
  copy: string;
  target: NutritionTodayTarget;
  tone: 'cyan' | 'purple' | 'gold' | 'fern';
}

interface NutritionInsightInput {
  summary: NutritionTodaySummary | null | undefined;
  hydration: HydrationState;
  weekDays: NutritionWeekDay[];
  trainingDay?: boolean;
  gentleMode?: boolean;
}

const PROTEIN_SUPPORT_THRESHOLD_GRAMS = 130, FIBER_SUPPORT_THRESHOLD_GRAMS = 22;
const MAX_HYDRATION_GLASSES = 30;
const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;

export const todayIso = (date: Date = new Date()) => formatLocalCalendarDate(date);
export const daysAgoIso = (days: number, from = new Date()) => getLocalCalendarDateDaysAgo(days, from);

const toFiniteDecimalNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const cleanNonNegativeNumber = (value: unknown) => {
  const numberValue = toFiniteDecimalNumber(value);
  return numberValue !== null && numberValue >= 0 ? numberValue : null;
};

export const cleanWholeNumber = (value: unknown) => {
  const n = cleanNonNegativeNumber(value); return n !== null && n > 0 ? Math.round(n) : 0;
};
export const cleanWholeCount = (value: unknown) => {
  const n = cleanNonNegativeNumber(value); return n !== null && Number.isSafeInteger(n) ? n : 0;
};

const previousDateIso = (isoDate: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) - 1);
  return formatLocalCalendarDate(date);
};

export const calculateNutritionStreak = (days: NutritionWeekDay[], today = todayIso()) => {
  const loggedDates = new Set(
    days
      .filter((day) => cleanWholeCount(day.mealCount) > 0 || cleanWholeNumber(day.calories) > 0)
      .map((day) => day.date),
  );
  let cursor = today;
  let count = 0;
  while (loggedDates.has(cursor)) {
    count += 1;
    cursor = previousDateIso(cursor);
  }
  return count;
};

export const getMacroMetrics = (summary: NutritionTodaySummary | null | undefined) => [
  { label: 'Protein', value: `${cleanWholeNumber(summary?.totalProtein)}g`, tone: 'cyan' as const },
  { label: 'Carbs', value: `${cleanWholeNumber(summary?.totalCarbs)}g`, tone: 'purple' as const },
  { label: 'Fat', value: `${cleanWholeNumber(summary?.totalFat)}g`, tone: 'gold' as const },
  { label: 'Fiber', value: `${cleanWholeNumber(summary?.totalFiber)}g`, tone: 'fern' as const },
];

export const getHydrationProgress = ({ filled, dailyGoal, glassOz }: HydrationState) => {
  const goal = Math.max(1, cleanWholeCount(dailyGoal) || 8);
  const glasses = Math.min(MAX_HYDRATION_GLASSES, Math.max(0, cleanWholeCount(filled)));
  const glassSize = cleanNonNegativeNumber(glassOz);
  const ouncesPerGlass = glassSize !== null && glassSize > 0 ? glassSize : 8;
  return {
    filled: glasses,
    dailyGoal: goal,
    percent: Math.min(100, Math.round((glasses / goal) * 100)),
    ounces: Math.round(glasses * ouncesPerGlass * 10) / 10,
  };
};

export const getNextNutritionAction = (summary: NutritionTodaySummary | null | undefined, hydration: HydrationState): { title: string; copy: string; target: NutritionTodayTarget } => {
  const meals = cleanWholeCount(summary?.mealCount);
  const water = getHydrationProgress(hydration);

  if (meals === 0) {
    return {
      title: 'Log the first meal you can remember clearly.',
      copy: 'Start with one honest entry. The dashboard gets smarter from real food logs, not guessed targets.',
      target: 'log',
    };
  }

  if (water.filled < water.dailyGoal) {
    return {
      title: 'Add a water check-in before the next meal.',
      copy: `${water.filled} of ${water.dailyGoal} glasses are logged. Hydration is the easiest win to tighten today.`,
      target: 'hydration',
    };
  }

  if (meals < 3) {
    return {
      title: 'Capture the next meal while it is fresh.',
      copy: 'Use voice or search so the next entry takes seconds instead of turning into homework later.',
      target: 'voice',
    };
  }

  return {
    title: 'Review the macro balance from today.',
    copy: 'You have enough logged context for a quick macro check before the day gets away from you.',
    target: 'macros',
  };
};

const countLoggedWeekDays = (days: NutritionWeekDay[]) => new Set(
  days
    .filter((day) => cleanWholeCount(day.mealCount) > 0 || cleanWholeNumber(day.calories) > 0)
    .map((day) => day.date),
).size;

export const buildNutritionInsights = ({ summary, hydration, weekDays, trainingDay = false, gentleMode = false }: NutritionInsightInput): NutritionInsight[] => {
  const insights: NutritionInsight[] = [];
  const proteinValue = cleanNonNegativeNumber(summary?.totalProtein);
  const fiberValue = cleanNonNegativeNumber(summary?.totalFiber);
  const protein = proteinValue === null ? 0 : Math.round(proteinValue);
  const fiber = fiberValue === null ? 0 : Math.round(fiberValue);
  const meals = cleanWholeCount(summary?.mealCount);
  const water = getHydrationProgress(hydration);
  const loggedWeekDays = countLoggedWeekDays(weekDays);

  if (gentleMode) {
    return [
      {
        id: 'gentle-mode-support',
        title: 'Gentle recovery mode',
        copy: 'Numbers are hidden here. Keep a steady meal rhythm, water check-ins, and coach-backed changes if tracking feels stressful.',
        target: 'log',
        tone: 'purple',
      },
      {
        id: 'hydration-gap',
        title: 'Hydration check',
        copy: water.filled < water.dailyGoal
          ? 'Add one water check-in when it feels manageable; steady care beats pressure.'
          : 'Hydration is checked in. Keep the same low-pressure rhythm for the rest of today.',
        target: 'hydration',
        tone: 'gold',
      },
      {
        id: 'meal-timing',
        title: 'Meal rhythm',
        copy: meals === 0
          ? 'Start with the meal you remember best, then let the coach help with the rest.'
          : 'Capture the next clear meal when you can, without turning the day into a numbers review.',
        target: meals === 0 ? 'log' : 'voice',
        tone: 'fern',
      },
      {
        id: 'weekly-rhythm',
        title: 'Weekly rhythm',
        copy: loggedWeekDays > 0
          ? 'You have recent nutrition check-ins. Build from that rhythm with the least stressful next step.'
          : 'One honest check-in is enough to restart the rhythm; the coach can help keep it simple.',
        target: 'log',
        tone: 'cyan',
      },
    ];
  }

  if (trainingDay && (protein < 90 || water.filled < water.dailyGoal)) {
    insights.push({
      id: 'training-day-support',
      title: 'Training-day support',
      copy: 'Pair today\'s session with a protein-forward meal and a water check-in before recovery gets away from you.',
      target: 'log',
      tone: 'purple',
    });
  }

  if (meals > 0 && proteinValue !== null && protein < PROTEIN_SUPPORT_THRESHOLD_GRAMS) {
    insights.push({
      id: 'protein-gap',
      title: 'Protein support',
      copy: `${protein}g protein logged so far. Add a clear protein source at the next meal if it matches what you actually ate or plan to eat.`,
      target: 'search',
      tone: 'cyan',
    });
  }

  if (meals > 0 && fiberValue !== null && fiber < FIBER_SUPPORT_THRESHOLD_GRAMS) {
    insights.push({
      id: 'fiber-gap',
      title: 'Fiber coverage',
      copy: `${fiber}g fiber logged so far. Add fruit, beans, oats, or vegetables if they fit the meal you actually ate.`,
      target: 'search',
      tone: 'fern',
    });
  }

  if (water.filled < water.dailyGoal) {
    insights.push({
      id: 'hydration-gap',
      title: 'Hydration check',
      copy: `${water.filled} of ${water.dailyGoal} glasses logged. One quick water entry tightens today without changing the food log.`,
      target: 'hydration',
      tone: 'gold',
    });
  }

  if (meals <= 1) {
    insights.push({
      id: 'meal-timing',
      title: 'Meal timing',
      copy: meals === 0
        ? 'Start with the meal you remember best, then fill in the rest later.'
        : 'Capture the next meal while details are still fresh instead of reconstructing it tonight.',
      target: meals === 0 ? 'log' : 'voice',
      tone: 'purple',
    });
  }

  insights.push({
    id: 'weekly-rhythm',
    title: 'Weekly rhythm',
    copy: `${loggedWeekDays} of the last 7 days have nutrition logs. Consistency matters more than a perfect entry.`,
    target: loggedWeekDays >= 5 ? 'macros' : 'log',
    tone: 'cyan',
  });

  return insights.slice(0, 4);
};
