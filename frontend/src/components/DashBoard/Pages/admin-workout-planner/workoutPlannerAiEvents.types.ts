/**
 * Payload types for the AI_PLANNER_* CustomEvent family (blueprint 03 §2).
 * Dispatched by the command lane (useCoachCommand → dispatchAIWorkoutEvent),
 * consumed by useWorkoutPlannerAiEvents in the open Workout Planner.
 */

export interface PlannerAddExercisePayload {
  exerciseName: string;
  sets?: number;
  reps?: string | number;
  tempo?: string;
  restSeconds?: number;
  dayNumber?: number;
  weekNumber?: number;
}

export interface PlannerSwapExercisePayload {
  fromExerciseName: string;
  toExerciseName: string;
  dayNumber?: number;
  weekNumber?: number;
}

export interface PlannerRemoveExercisePayload {
  exerciseName: string;
  dayNumber?: number;
  weekNumber?: number;
}

export interface PlannerUpdateExercisePayload {
  exerciseName: string;
  sets?: number;
  reps?: string | number;
  tempo?: string;
  restSeconds?: number;
}

export interface PlannerGeneratePayload {
  category?: string;
  goal?: string;
  phase?: number;
}

/** Selected Detailed-Schedule day, surfaced by LongHorizonScheduleView. */
export interface PlannerHorizonSelection {
  weekNumber: number;
  dayIndex: number;
}
