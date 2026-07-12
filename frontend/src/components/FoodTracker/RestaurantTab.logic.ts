import type { FoodDetail, FoodResult } from '../../hooks/useRestaurantSearch';
import { cleanMacro } from './mealPhotoLog';

export interface RestaurantAddFoodPayload {
  id?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: string;
  brandName?: string;
  mealSource?: string;
}

export const POPULAR_SEARCHES = [
  'Chipotle burrito bowl',
  'Chick-fil-A sandwich',
  'Subway turkey',
  'Starbucks latte',
  "McDonald's Big Mac",
  'Panera soup',
];

const MALFORMED_SERVING_PATTERN = /(?:nan|infinity|0x[0-9a-f]+|\d+(?:\.\d+)?e[+-]?\d+)/i;
const ZERO_SERVING_PATTERN = /^0+(?:\.0+)?(?:\s*[a-zA-Z/%.-]+)*$/;

export function formatRestaurantServing(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || MALFORMED_SERVING_PATTERN.test(trimmed) || ZERO_SERVING_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function buildRestaurantLogPayload(food: FoodDetail): RestaurantAddFoodPayload {
  const serving = food.primaryServing;
  return {
    id: String(food.id),
    name: food.brand ? `${food.brand} ${food.name}` : food.name,
    calories: cleanMacro(serving.calories) ?? 0,
    protein: cleanMacro(serving.protein) ?? 0,
    carbs: cleanMacro(serving.carbs) ?? 0,
    fat: cleanMacro(serving.fat) ?? 0,
    portion: formatRestaurantServing(serving.description) ?? 'Serving details unavailable',
    brandName: food.brand || undefined,
    mealSource: food.type === 'Brand' ? 'restaurant' : 'packaged',
  };
}

export function formatRestaurantMacro(value: unknown, suffix = ''): string | null {
  const cleaned = cleanMacro(value);
  return cleaned === null ? null : `${cleaned}${suffix}`;
}

export function splitRestaurantResults(results: FoodResult[]) {
  return {
    brandResults: results.filter((result) => result.brand),
    genericResults: results.filter((result) => !result.brand),
  };
}
