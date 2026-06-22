import { assertAssignmentOrAdmin } from '../middleware/verifyClientAccess.mjs';
import { formatDisplayDate } from '../services/nutrition/displayDate.mjs';

export const ALLOWED_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
export const ALLOWED_SOURCES = ['manual', 'ai-chat', 'food-scanner', 'barcode'];
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_ITEMS_COUNT = 50;
export const MAX_WEEKLY_RANGE_DAYS = 90;
export const MACRO_DATE_ERROR = 'Date must be a real YYYY-MM-DD calendar date.';

const MAX_MACRO_VALUE = 99999;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_NUMBER_REGEX = /^\d+(?:\.\d+)?$/;
const USER_ID_QUERY_REGEX = /^[1-9]\d*$/;

const roundOneDecimal = (value) => Math.round(value * 10) / 10;

const toFiniteDecimalNumber = (val) => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val !== 'string') return null;

  const trimmed = val.trim();
  if (!DECIMAL_NUMBER_REGEX.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const sanitizeNumber = (val, max = MAX_MACRO_VALUE) => {
  if (val === null || val === undefined) return null;
  const n = toFiniteDecimalNumber(val);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(roundOneDecimal(n), max);
};

export const isValidDate = (str) => {
  if (!DATE_REGEX.test(str)) return false;
  const d = new Date(str + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
};

export const serverUtcDateOnly = (offsetDays = 0, now = new Date()) => {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
  return date.toISOString().slice(0, 10);
};

export const serverDisplayDateOnly = (offsetDays = 0, now = new Date()) => {
  const date = new Date(now.getTime());
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return formatDisplayDate(date);
};

export const resolveOptionalMacroDate = (rawValue, fallbackDate = serverDisplayDateOnly()) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return { date: fallbackDate };
  }

  if (typeof rawValue !== 'string' || !isValidDate(rawValue)) {
    return { status: 400, error: MACRO_DATE_ERROR };
  }

  return { date: rawValue };
};

export const resolveMacroTargetUserId = async (req, queryField = 'userId') => {
  const ownUserId = Number(req.user.id);
  const rawTarget = req.query?.[queryField];
  if (!rawTarget) return { userId: ownUserId };

  if (typeof rawTarget !== 'string' || !USER_ID_QUERY_REGEX.test(rawTarget)) {
    return { status: 400, error: 'Invalid userId' };
  }

  const targetUserId = Number(rawTarget);
  const allowed = await assertAssignmentOrAdmin(req.user.id, req.user.role, targetUserId);
  if (!allowed) {
    return { status: 404, error: 'Macro data not found' };
  }

  return { userId: targetUserId };
};

export const buildDailyMacroSummary = (entries, date, userId) => {
  const summary = {
    date,
    userId,
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalFiber: 0,
    totalSugar: 0,
    totalSodium: 0,
    mealCount: entries.length,
    meals: {},
  };

  for (const entry of entries) {
    summary.totalCalories += entry.calories || 0;
    summary.totalProtein += entry.protein || 0;
    summary.totalCarbs += entry.carbs || 0;
    summary.totalFat += entry.fat || 0;
    summary.totalFiber += entry.fiber || 0;
    summary.totalSugar += entry.sugar || 0;
    summary.totalSodium += entry.sodium || 0;

    if (!summary.meals[entry.mealType]) {
      summary.meals[entry.mealType] = { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
    }
    summary.meals[entry.mealType].calories += entry.calories || 0;
    summary.meals[entry.mealType].protein += entry.protein || 0;
    summary.meals[entry.mealType].carbs += entry.carbs || 0;
    summary.meals[entry.mealType].fat += entry.fat || 0;
    summary.meals[entry.mealType].count += 1;
  }

  summary.totalCalories = roundOneDecimal(summary.totalCalories);
  summary.totalProtein = roundOneDecimal(summary.totalProtein);
  summary.totalCarbs = roundOneDecimal(summary.totalCarbs);
  summary.totalFat = roundOneDecimal(summary.totalFat);
  summary.totalFiber = roundOneDecimal(summary.totalFiber);
  summary.totalSugar = roundOneDecimal(summary.totalSugar);
  summary.totalSodium = roundOneDecimal(summary.totalSodium);

  return summary;
};

export const buildWeeklyMacroDays = (entries) => {
  const dailyTotals = {};
  for (const entry of entries) {
    const d = entry.date;
    if (!dailyTotals[d]) {
      dailyTotals[d] = { date: d, calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 };
    }
    dailyTotals[d].calories += entry.calories || 0;
    dailyTotals[d].protein += entry.protein || 0;
    dailyTotals[d].carbs += entry.carbs || 0;
    dailyTotals[d].fat += entry.fat || 0;
    dailyTotals[d].mealCount += 1;
  }

  return Object.values(dailyTotals).map((day) => ({
    ...day,
    calories: roundOneDecimal(day.calories),
    protein: roundOneDecimal(day.protein),
    carbs: roundOneDecimal(day.carbs),
    fat: roundOneDecimal(day.fat),
  }));
};

export const buildMacroEntryUpdates = (entry, body) => {
  const updates = {};
  const numericFields = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
  const hasClientVerifiedInput = Object.prototype.hasOwnProperty.call(body, 'verified');

  if (body.mealType !== undefined) {
    updates.mealType = ALLOWED_MEAL_TYPES.includes(body.mealType) ? body.mealType : entry.mealType;
  }

  if (body.description !== undefined) {
    if (typeof body.description === 'string' && body.description.trim().length > 0) {
      updates.description = body.description.trim().substring(0, MAX_DESCRIPTION_LENGTH);
    }
  }

  for (const field of numericFields) {
    if (body[field] !== undefined) {
      updates[field] = sanitizeNumber(body[field]);
    }
  }

  if (body.items !== undefined) {
    updates.items = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS_COUNT) : entry.items;
  }

  if (Object.keys(updates).length > 0 || hasClientVerifiedInput) {
    updates.verified = false;
  }

  return updates;
};
