/**
 * mealPhotoLog
 * ============
 * Pure logic for the Slice 1.4 self-serve "approve & save" flow: turn an AI
 * meal-photo analysis into review-ready, editable macro entries and the payloads
 * for POST /api/macros (the lighter client self-log path, Decision #2).
 *
 * Care-first / honesty: every saved entry is verified:false (an AI ESTIMATE the
 * client reviewed, not a coach/USDA-verified value), source 'food-scanner'.
 * The HTTP route caps macros + meal types; this mirrors its allowlist so the UI
 * never sends something the server will silently coerce.
 */

import type { MealPlanInput } from './MealPlanApproveSavePanel.logic';

// POST /api/macros ALLOWED_MEAL_TYPES (stricter than the model's 6-value set).
export const MEAL_TYPE_OPTIONS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealTypeOption = (typeof MEAL_TYPE_OPTIONS)[number];

const padDatePart = (value: number): string => String(value).padStart(2, '0');
const DECIMAL_NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;

export interface EditableFood {
  name: string;
  mealType?: MealTypeOption;
  estimatedServing?: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber?: number | null;
  confidence?: number;
}

export function normalizeMealType(value: string | undefined | null): MealTypeOption {
  const v = String(value || '').toLowerCase().trim();
  return (MEAL_TYPE_OPTIONS as readonly string[]).includes(v) ? (v as MealTypeOption) : 'snack';
}

export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`;
}

/** Coerce a user-edited macro field to a non-negative number or null (never a guessed 0). */
export function cleanMacro(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  let n: number | null = null;
  if (typeof value === 'number') {
    n = Number.isFinite(value) ? value : null;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    n = DECIMAL_NUMBER_PATTERN.test(trimmed) ? Number(trimmed) : null;
  }
  return n !== null && Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null;
}

export interface MacroPayload {
  date: string;
  mealType: MealTypeOption;
  description: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  source: 'food-scanner';
  verified: false;
}

export function toMacroPayload(food: EditableFood, opts: { mealType: string; date?: string }, now = new Date()): MacroPayload {
  return {
    date: opts.date || todayIso(now),
    mealType: normalizeMealType(opts.mealType),
    description: String(food?.name || '').trim().slice(0, 500) || 'Logged meal item',
    calories: cleanMacro(food?.calories),
    protein: cleanMacro(food?.protein),
    carbs: cleanMacro(food?.carbs),
    fat: cleanMacro(food?.fat),
    fiber: cleanMacro(food?.fiber),
    source: 'food-scanner',
    verified: false,
  };
}

/** Build POST payloads for every food that still has a name (removed/blank rows are dropped). */
export function buildMacroPayloads(foods: EditableFood[], opts: { mealType: string; date?: string }): MacroPayload[] {
  return (Array.isArray(foods) ? foods : [])
    .filter((f) => f && String(f.name || '').trim().length > 0)
    .map((f) => toMacroPayload(f, { ...opts, mealType: f.mealType || opts.mealType }));
}

export function summarizeSave(results: Array<{ ok: boolean }>): { saved: number; failed: number; total: number } {
  const saved = results.filter((r) => r && r.ok).length;
  return { saved, failed: results.length - saved, total: results.length };
}

export interface SearchFood {
  name: string;
  brand?: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

/**
 * Self-log payload for a food picked from the USDA/Open Food Facts search (Slice 1.5).
 * source 'usda_lookup' (route-valid; macros come from external food DB lookup,
 * not hand-typed manual entry), verified:false (per-serving estimate until a
 * coach/USDA portion is confirmed - care-first honesty).
 */
export interface NutritionDraftMeal {
  mealType?: string;
  description?: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
}

/**
 * Adapt a parseNutritionTranscript draft (per-meal rows from the voice route) into the
 * MealPlanInput shape MealPlanApproveSavePanel consumes - so voice logging REUSES the
 * hardened, idempotent editable-confirm/save panel (Slice 1.6). Null macros are
 * preserved end-to-end (never coerced to a guessed 0), per-meal type kept.
 */
export function voiceDraftToMealPlan(meals: NutritionDraftMeal[] | undefined): MealPlanInput {
  return {
    meals: (Array.isArray(meals) ? meals : []).map((m) => {
      const desc = String(m?.description || '').trim() || 'Logged meal';
      return {
        mealType: m?.mealType,
        name: desc,
        // The spoken description IS the meal label (meal.name); the single food row
        // only carries macros - leaving its name blank avoids a "desc: desc" echo in
        // describeMeal while keeping sumFoods/items macro math intact.
        foods: [{
          name: '',
          serving: '',
          calories: m?.calories ?? null,
          protein: m?.protein ?? null,
          carbs: m?.carbs ?? null,
          fat: m?.fat ?? null,
          fiber: m?.fiber ?? null,
          sugar: m?.sugar ?? null,
          sodium: m?.sodium ?? null,
        }],
        totalCalories: m?.calories ?? null,
      };
    }),
  };
}

export function buildSearchMacroPayload(food: SearchFood, opts: { mealType: string; date?: string }) {
  const name = String(food?.name || '').trim();
  const brand = String(food?.brand || '').trim();
  const description = ((brand && name) ? `${name} (${brand})` : name).slice(0, 500) || 'Logged food';
  return {
    date: opts.date || todayIso(),
    mealType: normalizeMealType(opts.mealType),
    description,
    calories: cleanMacro(food?.calories),
    protein: cleanMacro(food?.protein),
    carbs: cleanMacro(food?.carbs),
    fat: cleanMacro(food?.fat),
    source: 'usda_lookup' as const,
    verified: false as const,
  };
}
