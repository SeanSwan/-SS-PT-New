/**
 * FILE: NutritionTodayPanel.repeatMeal.ts
 * PURPOSE: Build the one-tap repeat-meal macro payload without inventing
 *          verification or losing source provenance.
 */
import { formatLocalCalendarDate } from './clients-team/nutritionDate';

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
  source?: string | null;
}

const allowedMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
const repeatSourceMap: Record<string, 'manual' | 'ai-chat' | 'food-scanner' | 'barcode' | 'voice' | 'usda_lookup'> = {
  manual: 'manual',
  'ai-chat': 'ai-chat',
  ai_chat: 'ai-chat',
  'food-scanner': 'food-scanner',
  photo: 'food-scanner',
  barcode: 'barcode',
  voice: 'voice',
  usda_lookup: 'usda_lookup',
};
const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;
const todayIso = () => formatLocalCalendarDate();

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

const normalizeRepeatMealType = (value: unknown) => {
  if (typeof value !== 'string') return 'snack';
  const normalized = value.trim().toLowerCase();
  return allowedMealTypes.includes(normalized) ? normalized : 'snack';
};

const normalizeRepeatSource = (value: unknown) => {
  if (typeof value !== 'string') return 'manual';
  return repeatSourceMap[value.trim().toLowerCase()] || 'manual';
};

export const buildRepeatMacroPayload = (entry: RepeatMacroEntry | null | undefined, date = todayIso()) => {
  const description = String(entry?.description || '').trim();
  if (!description) return null;
  return {
    date,
    mealType: normalizeRepeatMealType(entry?.mealType),
    description,
    calories: cleanNonNegativeNumber(entry?.calories),
    protein: cleanNonNegativeNumber(entry?.protein),
    carbs: cleanNonNegativeNumber(entry?.carbs),
    fat: cleanNonNegativeNumber(entry?.fat),
    fiber: cleanNonNegativeNumber(entry?.fiber),
    sugar: cleanNonNegativeNumber(entry?.sugar),
    sodium: cleanNonNegativeNumber(entry?.sodium),
    items: Array.isArray(entry?.items) ? entry.items : [],
    source: normalizeRepeatSource(entry?.source),
    verified: false,
  };
};
