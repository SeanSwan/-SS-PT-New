import { formatLocalCalendarDate, getLocalCalendarDateDaysAgo } from './clients-team/nutritionDate';
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

export interface RepeatMacroEntry {
  mealType?: string | null;
  description?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
  items?: unknown;
}

const allowedMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
const PROTEIN_TARGET_GRAMS = 150;
const FIBER_TARGET_GRAMS = 30;
const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;

export const todayIso = (date: Date = new Date()) => formatLocalCalendarDate(date);
export const daysAgoIso = (days: number, from = new Date()) => getLocalCalendarDateDaysAgo(days, from);

const toFiniteDecimalNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const cleanWholeNumber = (value: unknown) => {
  const numberValue = toFiniteDecimalNumber(value);
  return numberValue !== null && Number.isFinite(numberValue) && numberValue > 0 ? Math.round(numberValue) : 0;
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
      .filter((day) => cleanWholeNumber(day.mealCount) > 0 || cleanWholeNumber(day.calories) > 0)
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

export const getHydrationProgress = ({ filled, dailyGoal }: HydrationState) => {
  const goal = Math.max(1, cleanWholeNumber(dailyGoal) || 8);
  const glasses = Math.min(goal, Math.max(0, cleanWholeNumber(filled)));
  return {
    filled: glasses,
    dailyGoal: goal,
    percent: Math.round((glasses / goal) * 100),
    ounces: glasses * 8,
  };
};

export const getNextNutritionAction = (
  summary: NutritionTodaySummary | null | undefined,
  hydration: HydrationState,
): { title: string; copy: string; target: NutritionTodayTarget } => {
  const meals = cleanWholeNumber(summary?.mealCount);
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

export const buildRepeatMacroPayload = (entry: RepeatMacroEntry | null | undefined, date = todayIso()) => {
  const description = String(entry?.description || '').trim();
  if (!description) return null;
  const mealType = allowedMealTypes.includes(String(entry?.mealType || '')) ? entry?.mealType : 'snack';
  return {
    date,
    mealType,
    description,
    calories: entry?.calories ?? null,
    protein: entry?.protein ?? null,
    carbs: entry?.carbs ?? null,
    fat: entry?.fat ?? null,
    fiber: entry?.fiber ?? null,
    sugar: entry?.sugar ?? null,
    sodium: entry?.sodium ?? null,
    items: Array.isArray(entry?.items) ? entry.items : [],
    source: 'manual' as const,
    verified: false,
  };
};

const countLoggedWeekDays = (days: NutritionWeekDay[]) => new Set(
  days
    .filter((day) => cleanWholeNumber(day.mealCount) > 0 || cleanWholeNumber(day.calories) > 0)
    .map((day) => day.date),
).size;

export const buildNutritionInsights = ({
  summary,
  hydration,
  weekDays,
  trainingDay = false,
  gentleMode = false,
}: NutritionInsightInput): NutritionInsight[] => {
  const insights: NutritionInsight[] = [];
  const protein = cleanWholeNumber(summary?.totalProtein);
  const fiber = cleanWholeNumber(summary?.totalFiber);
  const meals = cleanWholeNumber(summary?.mealCount);
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

  if (meals > 0 && protein < PROTEIN_TARGET_GRAMS - 20) {
    insights.push({
      id: 'protein-gap',
      title: 'Protein support',
      copy: `${protein}g of ${PROTEIN_TARGET_GRAMS}g logged. Add a clear protein source at the next meal so the log supports training recovery.`,
      target: 'search',
      tone: 'cyan',
    });
  }

  if (meals > 0 && fiber < FIBER_TARGET_GRAMS - 8) {
    insights.push({
      id: 'fiber-gap',
      title: 'Fiber coverage',
      copy: `${fiber}g of ${FIBER_TARGET_GRAMS}g logged. Add fruit, beans, oats, or vegetables if they fit the meal you actually ate.`,
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
