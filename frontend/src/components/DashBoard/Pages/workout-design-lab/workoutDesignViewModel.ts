/**
 * Workout Design Lab shared view model.
 * Prototype-only session truth survives concept switches; no mutation leaves the browser.
 */
import type { ExerciseSlim } from "../../../WorkoutLogger/useExerciseSearch";

export interface WorkoutDesignExercise {
  id: string;
  name: string;
  focus: string;
  sets: number;
  reps: number;
  load: string;
  tempo: string;
  restSeconds: number;
  rpe: number;
  pain: number;
  form: string;
}

export interface WorkoutDesignViewModel {
  prototypeClient: string;
  workoutDate: string;
  dateContext: "today" | "tomorrow" | "past date";
  readiness: number;
  readinessLabel: string;
  planContext: string;
  historyContext: string;
  missedDaySignal: string;
  coachNotes: string;
  approvalReceipt: string;
  exercises: WorkoutDesignExercise[];
}

export const DEFAULT_WORKOUT_VIEW_MODEL: WorkoutDesignViewModel = {
  prototypeClient: "Prototype Athlete 042",
  workoutDate: "Thursday | July 10",
  dateContext: "today",
  readiness: 82,
  readinessLabel: "Ready with one modification",
  planContext: "Foundation 2 | Lower-body control",
  historyContext: "Last session: 3 days ago | all sets approved",
  missedDaySignal: "Tuesday session missed | volume redistributed",
  coachNotes:
    "Keep left-knee pain at or below 2/10. Prioritize controlled tempo.",
  approvalReceipt: "Draft reviewed | prototype approval receipt #WDL-042",
  exercises: [
    {
      id: "fixture-1",
      name: "Goblet squat",
      focus: "Stability | lower body",
      sets: 3,
      reps: 10,
      load: "35 lb",
      tempo: "4/2/1",
      restSeconds: 75,
      rpe: 7,
      pain: 2,
      form: "Controlled",
    },
    {
      id: "fixture-2",
      name: "Half-kneeling press",
      focus: "Anti-rotation | push",
      sets: 3,
      reps: 8,
      load: "20 lb",
      tempo: "3/1/1",
      restSeconds: 60,
      rpe: 6,
      pain: 0,
      form: "Stable",
    },
    {
      id: "fixture-3",
      name: "Stability-ball row",
      focus: "Core | pull",
      sets: 3,
      reps: 12,
      load: "25 lb",
      tempo: "3/1/2",
      restSeconds: 60,
      rpe: 7,
      pain: 0,
      form: "Aligned",
    },
  ],
};

export const addRolodexExercise = (
  model: WorkoutDesignViewModel,
  exercise: ExerciseSlim,
): WorkoutDesignViewModel => {
  if (model.exercises.some(({ id }) => id === exercise.id)) return model;
  return {
    ...model,
    exercises: [
      ...model.exercises,
      {
        id: exercise.id,
        name: exercise.name,
        focus:
          exercise.bodyPartCategory || exercise.exerciseType || "Full body",
        sets: exercise.recommendedSets ?? 3,
        reps: exercise.recommendedReps ?? 10,
        load: "Coach selects",
        tempo: exercise.defaultTempo ?? "3/1/1",
        restSeconds: exercise.defaultRestSeconds ?? exercise.restInterval ?? 60,
        rpe: 6,
        pain: 0,
        form: "Review",
      },
    ],
    approvalReceipt: `${exercise.name} added from the shared Rolodex | prototype only`,
  };
};
