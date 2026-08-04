/**
 * ============================================================================
 * FILE: NutritionCoachTab.logic.ts
 * PURPOSE: Pure view-model math for the Phase 4A coach nutrition tab —
 *          date stepper clamping, 7-day range building, adherence hero
 *          mapping, actual-vs-target rows, and trend series (HY3 §(a) IA).
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 *
 * DATA-TRUTH LAW: inferred/needs-review counts from the server adherence
 * spine are surfaced as visible chips so estimated data is never
 * indistinguishable from logged truth.
 */
import { formatLocalCalendarDate } from '../nutritionDate';
import type { NutritionTimelineEntry } from './NutritionTabContent.logic';

export type NutritionRangeMode = 'day' | 'range';

export interface NutritionTargetSummary {
  dailyCalories?: number | null;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatGrams?: number | null;
  fiberGrams?: number | null;
  sodiumLimitMg?: number | null;
  hydrationTargetLiters?: number | null;
}

export interface NutritionAdherenceSummary {
  loggedDays?: number | null;
  consistencyScore?: number | null;
  proteinTargetHitRate?: number | null;
  avgCaloriesPctOfTarget?: number | null;
  inferredEntryCount?: number | null;
  needsReviewCount?: number | null;
  currentLogStreak?: number | null;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseIsoDate = (isoDate: string): Date | null => {
  if (!ISO_DATE_PATTERN.test(isoDate)) return null;
  const [year, month, day] = isoDate.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toCount = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : 0;

const toMetric = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value;
};

/* ------------------------------- date stepper ------------------------------ */

export const stepNutritionDate = (isoDate: string, delta: 1 | -1, todayIso: string): string => {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return todayIso;
  parsed.setDate(parsed.getDate() + delta);
  const stepped = formatLocalCalendarDate(parsed);
  return stepped > todayIso ? todayIso : stepped;
};

export const canStepNutritionForward = (isoDate: string, todayIso: string): boolean =>
  ISO_DATE_PATTERN.test(isoDate) && isoDate < todayIso;

/** Inclusive trailing range ending at endIso: 7 days => start = end - 6. */
export const buildNutritionRangeParams = (
  endIso: string,
  days = 7,
): { start: string; end: string } => {
  const parsed = parseIsoDate(endIso);
  const safeDays = Number.isSafeInteger(days) && days > 1 && days <= 31 ? days : 7;
  if (!parsed) return { start: endIso, end: endIso };
  const start = new Date(parsed);
  start.setDate(start.getDate() - (safeDays - 1));
  return { start: formatLocalCalendarDate(start), end: endIso };
};

export const formatNutritionStepperLabel = (isoDate: string): string => {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return 'Unknown date';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

/* ------------------------------ adherence hero ----------------------------- */

export type AdherenceChipTone = 'gold' | 'purple' | 'calm';

export interface AdherenceChip {
  id: string;
  label: string;
  tone: AdherenceChipTone;
}

export interface AdherenceHeroView {
  adherenceLabel: string;
  adherencePercent: number | null;
  rangeLabel: string;
  streakLabel: string;
  streakActive: boolean;
  chips: AdherenceChip[];
}

export const buildAdherenceHeroView = (
  adherence: NutritionAdherenceSummary | null,
  mode: NutritionRangeMode,
): AdherenceHeroView => {
  const consistency = adherence ? toMetric(adherence.consistencyScore) : null;
  const adherencePercent = consistency === null ? (adherence ? 0 : null) : Math.min(100, Math.round(consistency));
  const streak = adherence ? toCount(adherence.currentLogStreak) : 0;
  const needsReview = adherence ? toCount(adherence.needsReviewCount) : 0;
  const inferred = adherence ? toCount(adherence.inferredEntryCount) : 0;
  const proteinHit = adherence ? toMetric(adherence.proteinTargetHitRate) : null;

  const chips: AdherenceChip[] = [];
  if (needsReview > 0) chips.push({ id: 'verify', label: `Verify ${needsReview}`, tone: 'purple' });
  if (inferred > 0) chips.push({ id: 'estimated', label: `${inferred} estimated`, tone: 'gold' });
  if (proteinHit !== null) chips.push({ id: 'protein-hit', label: `Protein target ${Math.min(100, Math.round(proteinHit))}%`, tone: 'calm' });
  if (chips.length === 0) chips.push({ id: 'clear', label: 'No attention flags', tone: 'calm' });

  return {
    adherenceLabel: adherencePercent === null ? '--' : `${adherencePercent}%`,
    adherencePercent,
    rangeLabel: mode === 'range' ? '7-day adherence' : 'Today adherence',
    streakLabel: streak > 0 ? `${streak}-day streak` : 'No active streak',
    streakActive: streak > 0,
    chips,
  };
};

/* ---------------------------- actual vs target ----------------------------- */

export interface ActualVsTargetRow {
  id: string;
  label: string;
  actualLabel: string;
  targetLabel: string;
  /** 0-100 bar width; capped so over-target never overflows the track. */
  fillPercent: number;
  overTarget: boolean;
}

export interface ActualVsTargetResult {
  hasTargets: boolean;
  modeLabel: string;
  rows: ActualVsTargetRow[];
}

const entryLocalDate = (entry: NutritionTimelineEntry): string | null => {
  if (!entry.createdAt) return null;
  const parsed = new Date(entry.createdAt);
  return Number.isNaN(parsed.getTime()) ? null : formatLocalCalendarDate(parsed);
};

const strictNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0;
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

interface MacroTotals { calories: number; protein: number; carbs: number; fat: number; fiber: number }

const sumEntries = (entries: NutritionTimelineEntry[]): MacroTotals =>
  entries.reduce<MacroTotals>((totals, entry) => ({
    calories: totals.calories + strictNumber(entry.calories),
    protein: totals.protein + strictNumber(entry.protein),
    carbs: totals.carbs + strictNumber(entry.carbs),
    fat: totals.fat + strictNumber(entry.fat),
    fiber: totals.fiber + strictNumber(entry.fiber),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

const loggedDayCount = (entries: NutritionTimelineEntry[]): number =>
  new Set(entries.map(entryLocalDate).filter((date): date is string => date !== null)).size;

const row = (
  id: string,
  label: string,
  actual: number,
  target: number | null,
  unit: string,
): ActualVsTargetRow => {
  const roundedActual = Math.round(actual);
  return {
    id,
    label,
    actualLabel: `${roundedActual.toLocaleString('en-US')}${unit}`,
    targetLabel: target === null ? 'No target' : `${Math.round(target).toLocaleString('en-US')}${unit}`,
    fillPercent: target === null || target <= 0 ? 0 : Math.min(100, Math.round((actual / target) * 100)),
    overTarget: target !== null && target > 0 && actual > target,
  };
};

export const buildActualVsTargetRows = (
  entries: NutritionTimelineEntry[],
  target: NutritionTargetSummary | null,
  mode: NutritionRangeMode,
): ActualVsTargetResult => {
  const targets = {
    calories: target ? toMetric(target.dailyCalories) : null,
    protein: target ? toMetric(target.proteinGrams) : null,
    carbs: target ? toMetric(target.carbsGrams) : null,
    fat: target ? toMetric(target.fatGrams) : null,
    fiber: target ? toMetric(target.fiberGrams) : null,
  };
  const hasTargets = Object.values(targets).some((value) => value !== null);

  const totals = sumEntries(entries);
  const divisor = mode === 'range' ? Math.max(1, loggedDayCount(entries)) : 1;
  const perDay = (value: number): number => value / divisor;

  return {
    hasTargets,
    modeLabel: mode === 'range' ? 'Daily average vs target' : 'Today actual vs target',
    rows: [
      row('calories', 'Calories', perDay(totals.calories), targets.calories, ' cal'),
      row('protein', 'Protein', perDay(totals.protein), targets.protein, 'g'),
      row('carbs', 'Carbs', perDay(totals.carbs), targets.carbs, 'g'),
      row('fat', 'Fat', perDay(totals.fat), targets.fat, 'g'),
      row('fiber', 'Fiber', perDay(totals.fiber), targets.fiber, 'g'),
    ],
  };
};

/* -------------------------------- trend line ------------------------------- */

export interface NutritionTrendPoint { x: string; y: number }

/** Zero-filled per-day calorie series across [startIso, endIso] (max 31 days). */
export const buildNutritionTrendPoints = (
  entries: NutritionTimelineEntry[],
  startIso: string,
  endIso: string,
): NutritionTrendPoint[] => {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (!start || !end || start.getTime() > end.getTime()) return [];

  const caloriesByDate = new Map<string, number>();
  for (const entry of entries) {
    const date = entryLocalDate(entry);
    if (!date) continue;
    caloriesByDate.set(date, (caloriesByDate.get(date) || 0) + strictNumber(entry.calories));
  }

  const points: NutritionTrendPoint[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < 31 && cursor.getTime() <= end.getTime(); i += 1) {
    const iso = formatLocalCalendarDate(cursor);
    points.push({
      x: cursor.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      y: Math.round(caloriesByDate.get(iso) || 0),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
};

/* ------------------------------ last-log label ----------------------------- */

export interface LastLogView { label: string; tone: 'ok' | 'warn' | 'none' }

export const buildLastLogView = (
  entries: NutritionTimelineEntry[],
  todayIso: string = formatLocalCalendarDate(),
): LastLogView => {
  let newest: Date | null = null;
  for (const entry of entries) {
    if (!entry.createdAt) continue;
    const parsed = new Date(entry.createdAt);
    if (Number.isNaN(parsed.getTime())) continue;
    if (!newest || parsed.getTime() > newest.getTime()) newest = parsed;
  }
  if (!newest) return { label: 'No logs in view', tone: 'none' };

  const logIso = formatLocalCalendarDate(newest);
  const time = newest.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (logIso === todayIso) return { label: `Last log: Today ${time}`, tone: 'ok' };
  const dayLabel = newest.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  return { label: `Last log: ${dayLabel} ${time}`, tone: 'warn' };
};
