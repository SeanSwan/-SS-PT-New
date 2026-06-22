import { formatDisplayDate } from './displayDate.mjs';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ROSTER_USER_IDS = 50;
const MAX_REVIEW_QUEUE_DAYS = 14;
const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;

export const ESTIMATE_REVIEW_SOURCES = ['ai_chat', 'barcode', 'photo', 'usda_lookup', 'voice'];
export const FUTURE_DATE_ERROR = 'Future date';

const todayStr = () => formatDisplayDate();

const serverUtcDateOnly = (offsetDays = 0, now = new Date()) => {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
  return date.toISOString().slice(0, 10);
};

export const daysBefore = (dateValue, days) => {
  const date = new Date(`${dateValue}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().split('T')[0];
};

const isValidDate = (value) => {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
};

export const requestedDateOrDefault = (rawValue) => {
  if (typeof rawValue === 'undefined') return todayStr();
  return isValidDate(rawValue) ? rawValue : null;
};

export const resolveRequestedDate = (rawValue) => {
  const date = requestedDateOrDefault(rawValue);
  if (!date) return { status: 400, error: 'Invalid date' };
  if (date > serverUtcDateOnly(1)) return { status: 400, error: FUTURE_DATE_ERROR };
  return { date };
};

export const parseRosterUserIds = (rawValue) => {
  if (typeof rawValue !== 'string' || !rawValue.trim()) return [];
  const values = rawValue.split(',').map((value) => value.trim());
  if (values.length > MAX_ROSTER_USER_IDS) return null;
  const ids = values.map((value) => (/^[1-9]\d*$/.test(value) ? Number(value) : null));
  if (ids.some((value) => !Number.isSafeInteger(value))) return null;
  return [...new Set(ids)];
};

export const parseSingleUserId = (rawValue) => {
  if (typeof rawValue !== 'string' || !/^[1-9]\d*$/.test(rawValue.trim())) return null;
  const parsed = Number(rawValue.trim());
  return Number.isSafeInteger(parsed) ? parsed : null;
};

export const parseReviewWindowDays = (rawValue) => {
  if (typeof rawValue === 'undefined') return 7;
  if (typeof rawValue !== 'string' || !/^[1-9]\d*$/.test(rawValue.trim())) return null;
  const parsed = Number(rawValue.trim());
  return Number.isSafeInteger(parsed) && parsed <= MAX_REVIEW_QUEUE_DAYS ? parsed : null;
};

const toNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const rounded = (value) => Math.round(value * 10) / 10;

export const timelineEntry = (entry) => ({
  id: entry.id,
  mealType: entry.mealType,
  description: entry.description,
  calories: toNumber(entry.calories),
  protein: toNumber(entry.protein),
  carbs: toNumber(entry.carbs),
  fat: toNumber(entry.fat),
  fiber: toNumber(entry.fiber),
  sugar: toNumber(entry.sugar),
  sodium: toNumber(entry.sodium),
  source: entry.source,
  verified: Boolean(entry.verified),
  createdAt: entry.createdAt,
});

export const reviewQueueEntry = (entry) => ({
  ...timelineEntry(entry),
  userId: Number(entry.userId),
  date: entry.date,
});

export const emptyClientTriage = (userId) => ({
  userId,
  mealCountToday: 0,
  latestMealType: null,
  totalCalories: 0,
  totalProtein: 0,
  totalCarbs: 0,
  totalFat: 0,
  totalFiber: 0,
  totalSugar: 0,
  totalSodium: 0,
  weeklyLoggedDays: 0,
  flags: { noMealsToday: true, sodiumAttention: false, sugarAttention: false, sparseWeekly: true },
});

export const addTodayEntry = (client, entry) => {
  client.mealCountToday += 1;
  client.latestMealType = entry.mealType || client.latestMealType;
  client.totalCalories += toNumber(entry.calories);
  client.totalProtein += toNumber(entry.protein);
  client.totalCarbs += toNumber(entry.carbs);
  client.totalFat += toNumber(entry.fat);
  client.totalFiber += toNumber(entry.fiber);
  client.totalSugar += toNumber(entry.sugar);
  client.totalSodium += toNumber(entry.sodium);
};

export const finalizeClient = (client, weeklyDates) => {
  const weeklyLoggedDays = weeklyDates.size;
  return {
    ...client,
    totalCalories: rounded(client.totalCalories),
    totalProtein: rounded(client.totalProtein),
    totalCarbs: rounded(client.totalCarbs),
    totalFat: rounded(client.totalFat),
    totalFiber: rounded(client.totalFiber),
    totalSugar: rounded(client.totalSugar),
    totalSodium: rounded(client.totalSodium),
    weeklyLoggedDays,
    flags: {
      noMealsToday: client.mealCountToday === 0,
      sodiumAttention: client.totalSodium > 2300,
      sugarAttention: client.totalSugar > 50,
      sparseWeekly: weeklyLoggedDays <= 2,
    },
  };
};
