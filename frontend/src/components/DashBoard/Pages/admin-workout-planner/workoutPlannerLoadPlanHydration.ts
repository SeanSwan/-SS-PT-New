/**
 * Utilities: workoutPlannerLoadPlanHydration
 * Purpose: Convert saved workout-plan payloads into builder-ready state without
 * mixing API response parsing, generated-plan restoration, and React setters.
 */

import { resolveWorkoutPlannerPlanClientId } from './WorkoutPlannerClientIdentity';
import type {
  GeneratedPlan,
  PlanExercise,
  PlanGoal,
  WorkoutCategory,
} from './WorkoutPlannerTypes';

export interface SavedWorkoutPlan {
  userId?: unknown;
  nasmPhase?: number;
  planData?: Record<string, unknown>;
}

export interface ManualSnapshotInput {
  phaseName: string;
  phaseNumber: number;
  category: WorkoutCategory;
  goal: PlanGoal;
  planExercises: PlanExercise[];
}

type GeneratedPlanWeeks = NonNullable<GeneratedPlan['weeks']>;
type PlanDataRecord = Record<string, unknown>;

interface LoadedPlanHydrationInput {
  plan: SavedWorkoutPlan;
  planId: string;
  selectedClientId: number | null;
}

export interface LoadedPlanHydration {
  planData: PlanDataRecord;
  weeks: GeneratedPlanWeeks;
  firstWeek: GeneratedPlanWeeks[number] | undefined;
  hydratedExercises: PlanExercise[];
  wasGenerated: boolean;
  restoredPlanClientId: number | null;
}

interface ManualSnapshotBuildInput {
  phaseName: string;
  fallbackPhaseNumber: number;
  fallbackCategory: WorkoutCategory;
  fallbackGoal: PlanGoal;
  plan: SavedWorkoutPlan;
  hydration: LoadedPlanHydration;
}

const asRecord = (value: unknown): PlanDataRecord | null => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as PlanDataRecord
    : null
);

const firstTrainingDay = (weeks: GeneratedPlanWeeks) => {
  const firstWeek = weeks[0];
  return firstWeek?.days?.[0] || firstWeek?.sessions?.[0];
};

const savedPlanWeeks = (planData: PlanDataRecord): GeneratedPlanWeeks => (
  Array.isArray(planData.weeks) ? planData.weeks as GeneratedPlanWeeks : []
);

const savedPlanExercises = (weeks: GeneratedPlanWeeks): unknown[] => {
  const firstDay = firstTrainingDay(weeks);
  return Array.isArray(firstDay?.exercises) ? firstDay.exercises : [];
};

const isGeneratedSavedPlan = (
  planData: PlanDataRecord,
  weeks: GeneratedPlanWeeks,
): boolean => (
  weeks.length > 0
  && (
    Boolean(planData.planSummary)
    || (Array.isArray(planData.mesocycles) && planData.mesocycles.length > 0)
  )
);

export const readSavedWorkoutPlan = (data: unknown): SavedWorkoutPlan | null => {
  const response = asRecord(data);
  const plan = response?.plan;
  return asRecord(plan) ? plan as SavedWorkoutPlan : null;
};

export const hydrateLoadedPlanExercises = (
  planId: string,
  exercises: unknown[],
): PlanExercise[] => exercises.map((rawExercise, index) => {
  const exercise = asRecord(rawExercise) || {};

  return {
    id: `loaded-${planId}-${index}-${Date.now()}`,
    exerciseSlim: {
      id: String(exercise.exerciseId || ''),
      name: String(exercise.exerciseName || exercise.name || 'Unknown'),
      exerciseKey: String(exercise.exerciseId || ''),
      exerciseType: 'compound',
      bodyPartCategory: 'Full Body',
      primaryMuscles: [],
      difficulty: 300,
    },
    sets: Number(exercise.sets) || 3,
    reps: String(exercise.reps || exercise.repGoal || '8-12'),
    tempo: String(exercise.tempo || ''),
    restSeconds: typeof exercise.restPeriod === 'number' ? exercise.restPeriod : 60,
    intensityPercent: 70,
    notes: String(exercise.notes || ''),
  };
});

export const buildLoadedPlanHydration = ({
  plan,
  planId,
  selectedClientId,
}: LoadedPlanHydrationInput): LoadedPlanHydration => {
  const planData = asRecord(plan.planData) || {};
  const weeks = savedPlanWeeks(planData);
  const wasGenerated = isGeneratedSavedPlan(planData, weeks);

  return {
    planData,
    weeks,
    firstWeek: weeks[0],
    hydratedExercises: hydrateLoadedPlanExercises(planId, savedPlanExercises(weeks)),
    wasGenerated,
    restoredPlanClientId: wasGenerated
      ? resolveWorkoutPlannerPlanClientId(plan.userId, selectedClientId)
      : null,
  };
};

export const buildLoadedGeneratedPlan = (
  plan: SavedWorkoutPlan,
  hydration: LoadedPlanHydration,
  clientId: number,
): GeneratedPlan => {
  const { firstWeek, planData, weeks } = hydration;

  return {
    clientId,
    clientName: String(planData.clientName || ''),
    planSummary: (planData.planSummary as GeneratedPlan['planSummary']) || {
      durationWeeks: weeks.length,
      sessionsPerWeek: firstWeek?.days?.length || firstWeek?.sessions?.length || 0,
      totalSessions: 0,
      primaryGoal: String(planData.goal || 'general_fitness'),
      startingPhase: plan.nasmPhase || 2,
    },
    mesocycles: (planData.mesocycles as GeneratedPlan['mesocycles']) || [],
    weeklySchedule: (planData.weeklySchedule as GeneratedPlan['weeklySchedule']) || [],
    recommendations: (planData.recommendations as string[]) || [],
    recommendationDetails: planData.recommendationDetails as GeneratedPlan['recommendationDetails'],
    equipmentContext: planData.equipmentContext as GeneratedPlan['equipmentContext'],
    rationale: planData.rationale as string[] | undefined,
    weeks,
  };
};

export const loadedPlanCategory = (
  planData: PlanDataRecord,
  fallback: WorkoutCategory,
): WorkoutCategory => (planData.category as WorkoutCategory) || fallback;

export const loadedPlanGoal = (
  planData: PlanDataRecord,
  fallback: PlanGoal,
): PlanGoal => (planData.goal as PlanGoal) || fallback;

export const buildLoadedManualSnapshotInput = ({
  phaseName,
  fallbackPhaseNumber,
  fallbackCategory,
  fallbackGoal,
  plan,
  hydration,
}: ManualSnapshotBuildInput): ManualSnapshotInput => ({
  phaseName,
  phaseNumber: plan.nasmPhase || fallbackPhaseNumber,
  category: loadedPlanCategory(hydration.planData, fallbackCategory),
  goal: loadedPlanGoal(hydration.planData, fallbackGoal),
  planExercises: hydration.hydratedExercises,
});
