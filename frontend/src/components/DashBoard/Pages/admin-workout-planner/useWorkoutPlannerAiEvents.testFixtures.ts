/**
 * useWorkoutPlannerAiEvents.testFixtures — test-only fixtures shared by the
 * blueprint S3 receiver suite. Extracted from the spec so the spec itself stays
 * inside the 300-line Rule 4 cap; same shape as planDataBuilder.testFixtures.ts.
 * Fixtures only: no assertions, no production imports.
 */
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import type { GeneratedPlan, PlanExercise } from './WorkoutPlannerTypes';
import type { PlannerHorizonSelection } from './workoutPlannerAiEvents.types';

export const slim = (id: string, name: string): ExerciseSlim => ({
  id, name, exerciseKey: id, exerciseType: 'strength', bodyPartCategory: 'legs',
  primaryMuscles: [], difficulty: 1,
});

export const builderRow = (id: string, exercise: ExerciseSlim): PlanExercise => ({
  id, exerciseSlim: exercise, sets: 4, reps: '6-8', tempo: '3/1/1', restSeconds: 90,
  intensityPercent: 80, notes: '',
});

export const horizonPlan = (): GeneratedPlan => ({
  clientId: 84, clientName: 'Client 84',
  planSummary: { durationWeeks: 4, sessionsPerWeek: 3, totalSessions: 12, primaryGoal: 'strength', startingPhase: 2 },
  mesocycles: [], weeklySchedule: [], recommendations: [],
  weeks: [
    { weekNumber: 1, days: [
      { dayNumber: 1, exercises: [{ exerciseName: 'Bench Press', sets: 3, reps: 10, tempo: '2/0/2', restSeconds: 60 }] },
      { dayNumber: 2, exercises: [
        { exerciseName: 'Leg Press', sets: 3, reps: 12, tempo: '2/0/2', restSeconds: 60, rotationFallback: true },
        { exerciseName: 'Calf Raise', sets: 3, reps: 15 },
      ] },
    ] },
  ],
});

export interface HarnessState {
  planExercises: PlanExercise[];
  generatedPlan: GeneratedPlan | null;
}

export interface HarnessOptions {
  planExercises?: PlanExercise[];
  generatedPlan?: GeneratedPlan | null;
  selection?: PlannerHorizonSelection | null;
  library?: ExerciseSlim[];
  searchImpl?: (query: string) => Promise<ExerciseSlim[]>;
}
