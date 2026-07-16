/**
 * ============================================================================
 * FILE: workoutPlannerGenerateIntent.ts
 * PURPOSE: Turns the AI_PLANNER_GENERATE payload (spoken/typed intent detail
 *          from the command lane) into validated planner overrides so a
 *          dictated "give me a leg day for hypertrophy" generates exactly
 *          that instead of whatever the dropdowns last said (H4 fix).
 *          Pure + deterministic; unrecognized detail is dropped, never
 *          guessed, so generation stays honest to the visible controls.
 * ============================================================================
 */

import { PLAN_GOALS, WORKOUT_CATEGORIES, type PlanGoal, type WorkoutCategory } from './WorkoutPlannerTypes';

export interface PlannerGenerateOverrides {
  category?: WorkoutCategory;
  goal?: PlanGoal;
  phaseNumber?: number;
}

const norm = (value: unknown): string => (
  typeof value === 'string' ? value.toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim() : ''
);

const CATEGORY_SYNONYMS: Record<string, WorkoutCategory> = {
  'full body': 'full_body', 'total body': 'full_body', 'whole body': 'full_body',
  chest: 'chest', pecs: 'chest',
  back: 'back', lats: 'back',
  shoulders: 'shoulders', shoulder: 'shoulders', delts: 'shoulders',
  arms: 'arms', arm: 'arms', biceps: 'arms', triceps: 'arms',
  legs: 'legs', leg: 'legs', 'leg day': 'legs', 'lower body': 'legs',
  quads: 'legs', hamstrings: 'legs', glutes: 'legs',
  core: 'core', abs: 'core', trunk: 'core', midsection: 'core',
};

const GOAL_SYNONYMS: Record<string, PlanGoal> = {
  'general fitness': 'general_fitness', general: 'general_fitness', fitness: 'general_fitness',
  hypertrophy: 'hypertrophy', 'muscle growth': 'hypertrophy', muscle: 'hypertrophy',
  size: 'hypertrophy', mass: 'hypertrophy',
  strength: 'strength', 'max strength': 'strength', strong: 'strength',
  'fat loss': 'fat_loss', 'weight loss': 'fat_loss', cutting: 'fat_loss', lean: 'fat_loss',
  'athletic performance': 'athletic_performance', athletic: 'athletic_performance',
  performance: 'athletic_performance', sports: 'athletic_performance',
  'golf performance': 'golf_performance', golf: 'golf_performance',
};

const CANONICAL_CATEGORIES = new Set<string>(WORKOUT_CATEGORIES.map((c) => c.value));
const CANONICAL_GOALS = new Set<string>(PLAN_GOALS.map((g) => g.value));

/** Validate/translate raw command-lane detail into planner overrides. */
export function normalizePlannerGeneratePayload(payload: unknown): PlannerGenerateOverrides {
  const raw = (payload ?? {}) as { category?: unknown; goal?: unknown; phase?: unknown };
  const overrides: PlannerGenerateOverrides = {};

  const category = norm(raw.category);
  if (CANONICAL_CATEGORIES.has(category.replace(/ /g, '_'))) {
    overrides.category = category.replace(/ /g, '_') as WorkoutCategory;
  } else if (CATEGORY_SYNONYMS[category]) {
    overrides.category = CATEGORY_SYNONYMS[category];
  }

  const goal = norm(raw.goal);
  if (CANONICAL_GOALS.has(goal.replace(/ /g, '_'))) {
    overrides.goal = goal.replace(/ /g, '_') as PlanGoal;
  } else if (GOAL_SYNONYMS[goal]) {
    overrides.goal = GOAL_SYNONYMS[goal];
  }

  const phase = Number(raw.phase);
  if (Number.isInteger(phase) && phase >= 1 && phase <= 5) {
    overrides.phaseNumber = phase;
  }

  return overrides;
}

interface PlannerGenerateSetters {
  setCategory: (value: WorkoutCategory) => void;
  setGoal: (value: PlanGoal) => void;
  setPhaseNumber: (value: number) => void;
}

/**
 * Reflect spoken overrides into the visible planner controls. The caller
 * still passes the overrides to the generation request directly, because the
 * immediate call reads closure state that these setters update one render
 * later (H4).
 */
export function applyPlannerGenerateOverrides(
  overrides: PlannerGenerateOverrides | undefined,
  setters: PlannerGenerateSetters,
): void {
  if (overrides?.category) setters.setCategory(overrides.category);
  if (overrides?.goal) setters.setGoal(overrides.goal);
  if (overrides?.phaseNumber) setters.setPhaseNumber(overrides.phaseNumber);
}

const CATEGORY_LABELS: Record<WorkoutCategory, string> = {
  full_body: 'full-body', chest: 'chest', back: 'back', shoulders: 'shoulders',
  arms: 'arms', legs: 'legs', core: 'core',
};

/** Receipt copy: what Swan Coach is actually generating. */
export function plannerGenerateReceiptText(overrides: PlannerGenerateOverrides): string {
  const subject = overrides.category ? `${CATEGORY_LABELS[overrides.category]} workout` : 'workout';
  const details = [
    overrides.goal ? overrides.goal.replace(/_/g, ' ') : null,
    overrides.phaseNumber ? `Phase ${overrides.phaseNumber}` : null,
  ].filter(Boolean).join(', ');
  return `Generating a fresh ${subject}${details ? ` — ${details}` : ''}…`;
}
