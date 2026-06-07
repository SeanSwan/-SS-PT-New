/**
 * WorkoutBuilderPage.logic
 * ------------------------
 * Pure helpers for the active /workout-builder surface. Keeping identity
 * parsing here lets the page stay lean and gives tests a stable contract.
 */

import type { GeneratedPlan, GeneratedWorkout } from '../../hooks/useWorkoutBuilderAPI';

export type WorkoutBuilderMode = 'workout' | 'plan';

interface WorkoutBuilderGenerationApi {
  generateWorkout: (options: {
    clientId: number;
    category?: string;
    equipmentProfileId?: number;
    exerciseCount?: number;
    rotationPattern?: string;
  }) => Promise<GeneratedWorkout>;
  generatePlan: (options: {
    clientId: number;
    durationWeeks?: number;
    sessionsPerWeek?: number;
    primaryGoal?: string;
    equipmentProfileId?: number;
  }) => Promise<GeneratedPlan>;
}

interface WorkoutBuilderGenerationOptions {
  api: WorkoutBuilderGenerationApi;
  mode: WorkoutBuilderMode;
  clientId: number;
  category: string;
  exerciseCount: string;
  rotationPattern: string;
  equipmentProfileId: string;
  planWeeks: string;
  sessionsPerWeek: string;
  primaryGoal: string;
}

interface WorkoutBuilderGenerationResult {
  workout: GeneratedWorkout | null;
  plan: GeneratedPlan | null;
}

const parsePositiveInputNumber = (value: string, fallback: number): number => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseOptionalEquipmentProfileId = (value: string): number | undefined => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const parsePositiveClientId = (value: string | null | undefined): number | null => {
  const rawClientId = value?.trim();
  if (!rawClientId || !/^[1-9]\d*$/.test(rawClientId)) return null;

  const parsedClientId = Number(rawClientId);
  return Number.isSafeInteger(parsedClientId) ? parsedClientId : null;
};

export const runWorkoutBuilderGeneration = async ({
  api,
  mode,
  clientId,
  category,
  exerciseCount,
  rotationPattern,
  equipmentProfileId,
  planWeeks,
  sessionsPerWeek,
  primaryGoal,
}: WorkoutBuilderGenerationOptions): Promise<WorkoutBuilderGenerationResult> => {
  const selectedEquipmentProfileId = parseOptionalEquipmentProfileId(equipmentProfileId);

  if (mode === 'workout') {
    const workout = await api.generateWorkout({
      clientId,
      category,
      exerciseCount: parsePositiveInputNumber(exerciseCount, 6),
      rotationPattern,
      equipmentProfileId: selectedEquipmentProfileId,
    });
    return { workout, plan: null };
  }

  const plan = await api.generatePlan({
    clientId,
    durationWeeks: parsePositiveInputNumber(planWeeks, 12),
    sessionsPerWeek: parsePositiveInputNumber(sessionsPerWeek, 3),
    primaryGoal,
    equipmentProfileId: selectedEquipmentProfileId,
  });
  return { workout: null, plan };
};
