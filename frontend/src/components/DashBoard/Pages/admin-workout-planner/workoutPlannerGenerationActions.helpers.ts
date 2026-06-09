/**
 * Helpers: workoutPlannerGenerationActions
 * Purpose: Keep Swan Coach generation request payloads, response verification,
 * generated exercise mapping, and error messages outside the React hook.
 */

import type {
  GeneratedPlan,
  GeneratedWorkout,
  PlanDuration,
  PlanExercise,
  PlanGoal,
  WorkoutCategory,
} from './WorkoutPlannerTypes';
import type { WorkoutPlannerStatusMessage } from './WorkoutPlannerStatusAssistantStrip';

export type GeneratedWorkoutPayload = GeneratedWorkout & {
  context?: {
    criticalDataUnavailable?: boolean;
  };
};

export interface GeneratedWorkoutResponse {
  success?: boolean;
  workout?: GeneratedWorkoutPayload;
}

export interface GeneratedPlanResponse {
  success?: boolean;
  plan?: GeneratedPlan;
}

interface WorkoutGenerationRequestInput {
  selectedClientId: number;
  category: WorkoutCategory;
  goal: PlanGoal;
  phaseNumber: number;
  selectedEquipmentProfileId: number | null;
}

interface PlanGenerationRequestInput {
  selectedClientId: number;
  goal: PlanGoal;
  phaseNumber: number;
  planDuration: PlanDuration;
  sessionsPerWeek: number;
  selectedEquipmentProfileId: number | null;
}

type GeneratedExercise = GeneratedWorkout['exercises'][number];

interface GenerationErrorData {
  error?: string;
  details?: string;
}

interface SwanCoachStampedPayload {
  planningSystem?: unknown;
  swanCoachPlanning?: { createdBy?: unknown } | null;
}

const parsedInteger = (value: string, fallback: number) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseRestSeconds = (rest: unknown) => {
  if (typeof rest === 'number') return rest;
  const restText = String(rest ?? '60').toLowerCase();
  if (restText.includes('min')) return parsedInteger(restText, 3) * 60;
  return parsedInteger(restText.replace(/[^0-9]/g, ''), 60);
};

const parseIntensityPercent = (intensity: unknown): number => {
  if (typeof intensity === 'number') return intensity;
  return parsedInteger(String(intensity).replace(/[^0-9]/g, ''), 70);
};

const generationErrorData = (err: unknown): GenerationErrorData | undefined => (
  (err as { response?: { data?: GenerationErrorData } })?.response?.data
);

const specificGenerationMessage = (err: unknown): string | undefined => {
  const errData = generationErrorData(err);
  if (errData?.details) return errData.details;
  return errData?.error;
};

const isObjectPayload = (value: unknown) => {
  if (value === null) return false;
  return typeof value === 'object';
};

const hasSwanCoachCreator = (payload: SwanCoachStampedPayload) => (
  payload.swanCoachPlanning?.createdBy === 'swan_coach_planning'
);

export const buildWorkoutGenerationRequest = ({
  selectedClientId,
  category,
  goal,
  phaseNumber,
  selectedEquipmentProfileId,
}: WorkoutGenerationRequestInput) => ({
  clientId: selectedClientId,
  category,
  exerciseCount: 6,
  rotationPattern: 'standard',
  primaryGoal: goal,
  nasmPhase: phaseNumber,
  ...(selectedEquipmentProfileId ? { equipmentProfileId: selectedEquipmentProfileId } : {}),
});

export const buildPlanGenerationRequest = ({
  selectedClientId,
  goal,
  phaseNumber,
  planDuration,
  sessionsPerWeek,
  selectedEquipmentProfileId,
}: PlanGenerationRequestInput) => ({
  clientId: selectedClientId,
  durationWeeks: Number(planDuration),
  sessionsPerWeek,
  primaryGoal: goal,
  startingPhaseOverride: phaseNumber,
  ...(selectedEquipmentProfileId ? { equipmentProfileId: selectedEquipmentProfileId } : {}),
});

export const readGeneratedWorkout = (data: unknown): GeneratedWorkoutPayload | null => {
  const response = data as GeneratedWorkoutResponse | undefined;
  return response?.success && response.workout ? response.workout : null;
};

export const readGeneratedPlan = (data: unknown): GeneratedPlan | null => {
  const response = data as GeneratedPlanResponse | undefined;
  return response?.success && response.plan ? response.plan : null;
};

export const isSwanCoachPlanningPayload = (value: unknown) => {
  if (!isObjectPayload(value)) return false;
  const payload = value as SwanCoachStampedPayload;
  if (payload.planningSystem !== 'swan_coach_planning') return false;
  return hasSwanCoachCreator(payload);
};

export const generatedWorkoutSafetyWarning = (workout: GeneratedWorkoutPayload): string => {
  const safetyWarning = workout.explanations?.find(
    (explanation) => explanation.type === 'safety_warning'
  );
  return safetyWarning?.message
    || 'Pain/injury data unavailable - review this workout carefully before assigning.';
};

export const getGeneratedPlanSafetyWarning = (plan: GeneratedPlan) => {
  const structuredWarning = plan.recommendationDetails?.find(
    detail => detail.type === 'safety_warning'
  );
  if (structuredWarning?.text) return structuredWarning.text;

  return plan.recommendations.find(recommendation => {
    const lower = recommendation.toLowerCase();
    return lower.includes('pain') && lower.includes('injury') && lower.includes('could not be loaded');
  });
};

const generatedExerciseType = (exercise: GeneratedExercise) => {
  if (exercise.category) return exercise.category;
  return 'compound';
};

const generatedExercisePrimaryBodyPart = (exercise: GeneratedExercise) => {
  const [primaryMuscle] = exercise.muscles ?? [];
  if (primaryMuscle) return primaryMuscle;
  return 'Full Body';
};

const generatedExerciseMuscles = (exercise: GeneratedExercise) => (
  exercise.muscles ?? []
);

const generatedExerciseNotes = (exercise: GeneratedExercise) => {
  if (!exercise.recommendedWeightMin) return '';
  return `Recommended: ${exercise.recommendedWeightMin}-${exercise.recommendedWeightMax} lbs (based on ${exercise.basedOn1RM} lb 1RM)`;
};

const generatedExerciseSlim = (exercise: GeneratedExercise) => ({
  id: exercise.exerciseKey,
  name: exercise.exerciseName,
  exerciseKey: exercise.exerciseKey,
  exerciseType: generatedExerciseType(exercise),
  bodyPartCategory: generatedExercisePrimaryBodyPart(exercise),
  primaryMuscles: generatedExerciseMuscles(exercise),
  difficulty: 300,
});

const mapGeneratedExerciseToPlanExercise = (
  exercise: GeneratedExercise,
  index: number,
): PlanExercise => ({
  id: `gen-${index}-${Date.now()}`,
  exerciseSlim: generatedExerciseSlim(exercise),
  sets: exercise.sets,
  reps: String(exercise.reps),
  tempo: exercise.tempo,
  restSeconds: parseRestSeconds(exercise.rest),
  intensityPercent: parseIntensityPercent(exercise.intensity),
  notes: generatedExerciseNotes(exercise),
});

export const mapGeneratedWorkoutToPlanExercises = (
  workout: GeneratedWorkoutPayload,
): PlanExercise[] => workout.exercises.map(mapGeneratedExerciseToPlanExercise);

export const unverifiedWorkoutMessage = (): WorkoutPlannerStatusMessage => ({
  type: 'error',
  text: 'Swan Coach Planning did not verify this workout. Regenerate before assigning.',
});

export const unverifiedPlanMessage = (): WorkoutPlannerStatusMessage => ({
  type: 'error',
  text: 'Swan Coach Planning did not verify this plan. Regenerate before saving.',
});

export const workoutGenerationErrorMessage = (err: unknown): WorkoutPlannerStatusMessage => {
  const specificMsg = specificGenerationMessage(err);

  if (specificMsg?.includes('client context unavailable')) {
    return {
      type: 'error',
      text: 'Unable to generate workout: Client data could not be loaded. Verify the client has an active profile with pain entries and equipment profile.',
    };
  }
  if (specificMsg?.includes('equipment')) {
    return {
      type: 'error',
      text: `Unable to generate workout: ${specificMsg}. Please verify the client's equipment profile.`,
    };
  }
  if (specificMsg) return { type: 'error', text: `Workout generation failed: ${specificMsg}` };
  return { type: 'error', text: 'Swan Coach generation failed. Check client data and try again.' };
};

export const planGenerationErrorMessage = (err: unknown): WorkoutPlannerStatusMessage => {
  const specificMsg = specificGenerationMessage(err);
  return {
    type: 'error',
    text: specificMsg
      ? `Plan generation failed: ${specificMsg}`
      : 'Failed to generate training plan. Check client data and try again.',
  };
};
