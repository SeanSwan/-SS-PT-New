export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodQuality = 'low' | 'medium' | 'high';

export interface FoodItem {
  id: string;
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quality: FoodQuality;
}

export interface FoodIntakeEntry {
  id: string;
  timestamp: string;
  userId: string;
  meal: MealType;
  items: FoodItem[];
}

export interface MacroPayload {
  date: string;
  mealType: MealType;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: FoodItem[];
  source: 'manual';
  verified: false;
}

export interface SavedMacroEntry extends MacroPayload {
  id?: string | number;
}

export const MEAL_TYPES: Array<{ value: MealType; label: string }> = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export const FOOD_QUALITY: Array<{ value: FoodQuality; label: string }> = [
  { value: 'low', label: 'Low Quality (Processed/Ultra-Processed)' },
  { value: 'medium', label: 'Medium Quality (Semi-Processed)' },
  { value: 'high', label: 'High Quality (Whole Foods)' },
];

export const SAVE_ERROR_COPY = 'Food intake could not be saved. Review My Macros before retrying.';
export const UPDATE_ERROR_COPY = 'Saved meal could not be updated. Review My Macros before retrying.';
export const DELETE_ERROR_COPY = 'Saved meal could not be removed. Review My Macros before retrying.';

export const getLocalDateString = (date = new Date()) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().split('T')[0];
};

const todayIso = () => getLocalDateString();

const numeric = (value: unknown, fallback = 0) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback;
  return value;
};

const cleanText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeMealType = (value: unknown): MealType =>
  MEAL_TYPES.some((type) => type.value === value) ? value as MealType : 'snack';

const normalizeQuality = (value: unknown): FoodQuality =>
  FOOD_QUALITY.some((quality) => quality.value === value) ? value as FoodQuality : 'medium';

export const createEmptyFoodItem = (id = '1'): FoodItem => ({
  id,
  name: '',
  portion: '',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  quality: 'medium',
});

export const createFoodItemId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const calculateFoodTotals = (items: FoodItem[]) =>
  items.reduce(
    (totals, item) => ({
      calories: totals.calories + numeric(item.calories),
      protein: totals.protein + numeric(item.protein),
      carbs: totals.carbs + numeric(item.carbs),
      fat: totals.fat + numeric(item.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

export const validateFoodItems = (items: FoodItem[]) => {
  const errors: Record<string, string> = {};
  items.forEach((item) => {
    if (!cleanText(item.name)) errors[`food-name-${item.id}`] = 'Food name is required';
    if (!cleanText(item.portion)) errors[`food-portion-${item.id}`] = 'Portion size is required';
  });
  return errors;
};

export const buildMacroPayload = (
  mealType: MealType,
  items: FoodItem[],
  date = todayIso(),
): MacroPayload => {
  const sanitizedItems = items.map((item) => ({
    ...item,
    name: cleanText(item.name),
    portion: cleanText(item.portion),
    calories: numeric(item.calories),
    protein: numeric(item.protein),
    carbs: numeric(item.carbs),
    fat: numeric(item.fat),
    quality: normalizeQuality(item.quality),
  }));
  const totals = calculateFoodTotals(sanitizedItems);
  return {
    date,
    mealType,
    description: sanitizedItems.map((item) => `${item.name} (${item.portion})`).join(', '),
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    items: sanitizedItems,
    source: 'manual',
    verified: false,
  };
};

export const buildFoodIntakeEntry = (
  userId: string,
  mealType: MealType,
  items: FoodItem[],
): FoodIntakeEntry => ({
  id: Date.now().toString(),
  timestamp: new Date().toISOString(),
  userId,
  meal: mealType,
  items,
});

const foodItemFromUnknown = (item: any, index: number): FoodItem => ({
  id: String(item?.id ?? `saved-${index + 1}`),
  name: cleanText(item?.name || item?.description),
  portion: cleanText(item?.portion || item?.serving || '1 serving'),
  calories: numeric(item?.calories),
  protein: numeric(item?.protein),
  carbs: numeric(item?.carbs),
  fat: numeric(item?.fat),
  quality: normalizeQuality(item?.quality),
});

export const editableItemsFromSavedEntry = (entry: SavedMacroEntry): FoodItem[] => {
  if (Array.isArray(entry.items) && entry.items.length > 0) {
    return entry.items.map(foodItemFromUnknown);
  }
  return [{
    ...createEmptyFoodItem('1'),
    name: entry.description || 'Saved meal',
    portion: '1 serving',
    calories: numeric(entry.calories),
    protein: numeric(entry.protein),
    carbs: numeric(entry.carbs),
    fat: numeric(entry.fat),
  }];
};

export const savedMacroEntryFromResponse = (responseEntry: any, fallback: MacroPayload): SavedMacroEntry => ({
  ...fallback,
  ...responseEntry,
  mealType: normalizeMealType(responseEntry?.mealType ?? fallback.mealType),
  description: cleanText(responseEntry?.description) || fallback.description,
  calories: numeric(responseEntry?.calories, fallback.calories),
  protein: numeric(responseEntry?.protein, fallback.protein),
  carbs: numeric(responseEntry?.carbs, fallback.carbs),
  fat: numeric(responseEntry?.fat, fallback.fat),
  date: cleanText(responseEntry?.date) || fallback.date,
  items: Array.isArray(responseEntry?.items) && responseEntry.items.length > 0
    ? responseEntry.items.map(foodItemFromUnknown)
    : fallback.items,
  source: 'manual',
  verified: false,
});
