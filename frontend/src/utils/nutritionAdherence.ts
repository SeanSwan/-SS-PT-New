/**
 * nutritionAdherence.ts — pure logged-vs-target macro math (launch BP02 §5.1)
 * =============================================================================
 * THE nutrition gap the Phase-0 audit confirmed: no live surface compared
 * logged macros to the client's ClientNutritionPlan targets (the only
 * logged-vs-target component used HARDCODED reference values and was mounted
 * nowhere live). These pure functions power the Macros-tab adherence module
 * and the Phase-4g adherence chart card.
 *
 * REUSABLE-CORE (§6 doctrine): zero app-specific imports; compiles in any
 * TS project. One truth per metric — callers supply data from the canonical
 * hooks, nothing is re-fetched here.
 */

export interface AdherenceTargets {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface LoggedTotals {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface LoggedDay extends LoggedTotals {
  date: string;
  mealCount?: number | null;
}

export type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';

export interface MacroAdherenceRow {
  key: MacroKey;
  label: string;
  unit: string;
  logged: number;
  target: number;
  /** Uncapped truth (127 = 27% over target). */
  pct: number;
  /** Bar fill for rendering, capped at 100. */
  barPct: number;
}

export interface DayAdherencePoint {
  date: string;
  /** Calorie-adherence % for the day; null = nothing logged that day. */
  pct: number | null;
  logged: boolean;
}

const MACRO_META: Array<{ key: MacroKey; label: string; unit: string }> = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
];

const positive = (value: number | null | undefined): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** True when the plan carries at least one usable macro target. */
export const hasUsableTargets = (targets: AdherenceTargets | null | undefined): boolean =>
  !!targets && MACRO_META.some(({ key }) => positive(targets[key]) !== null);

/**
 * Today's per-macro adherence rows. Macros without a positive target are
 * omitted (never fabricate a comparison); logged values default to 0.
 */
export function computeMacroAdherence(
  targets: AdherenceTargets | null | undefined,
  logged: LoggedTotals | null | undefined
): MacroAdherenceRow[] {
  if (!targets) return [];
  const rows: MacroAdherenceRow[] = [];
  for (const meta of MACRO_META) {
    const target = positive(targets[meta.key]);
    if (target === null) continue;
    const loggedValue = Math.max(0, Number(logged?.[meta.key]) || 0);
    const pct = Math.round((loggedValue / target) * 100);
    rows.push({
      ...meta,
      logged: loggedValue,
      target,
      pct,
      barPct: Math.min(100, pct),
    });
  }
  return rows;
}

/**
 * 7-day (or N-day) calorie-adherence strip. Days with zero logged meals are
 * honest gaps (pct null), never rendered as 0% failures.
 */
export function computeWeeklyAdherence(
  targets: AdherenceTargets | null | undefined,
  days: LoggedDay[] | null | undefined
): DayAdherencePoint[] {
  const calorieTarget = positive(targets?.calories);
  return (days ?? []).map((day) => {
    const logged = (Number(day.mealCount) || 0) > 0 || (Number(day.calories) || 0) > 0;
    if (!logged || calorieTarget === null) {
      return { date: day.date, pct: null, logged };
    }
    const calories = Math.max(0, Number(day.calories) || 0);
    return { date: day.date, pct: Math.round((calories / calorieTarget) * 100), logged };
  });
}
