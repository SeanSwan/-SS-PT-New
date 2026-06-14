import { describe, expect, it } from 'vitest';
import type { GeneratedPlan } from './WorkoutPlannerTypes';
import {
  formatWorkoutPlannerExerciseName,
  withDisplayExerciseNamesForExport,
} from './workoutPlannerExerciseDisplay';

const generatedPlan: GeneratedPlan = {
  clientId: 91,
  clientName: 'Client 91',
  planSummary: {
    durationWeeks: 1,
    sessionsPerWeek: 1,
    totalSessions: 1,
    primaryGoal: 'general_fitness',
    startingPhase: 2,
  },
  mesocycles: [],
  weeklySchedule: [],
  recommendations: [],
  weeks: [{
    weekNumber: 1,
    days: [{
      dayNumber: 1,
      exercises: [
        { exerciseId: 'a', exerciseName: 'NASM Dumbbell Bench Press', sets: 3 },
        { exerciseId: 'b', name: 'NASM: Cable Row', sets: 3 },
      ],
    }],
    sessions: [{
      dayNumber: 2,
      exercises: [
        { exerciseId: 'c', exerciseName: 'nasm - Goblet Squat', sets: 3 },
      ],
    }],
  }],
};

describe('workoutPlannerExerciseDisplay', () => {
  it('removes leading NASM source prefixes without touching exercise metadata', () => {
    expect(formatWorkoutPlannerExerciseName('NASM Dumbbell Bench Press')).toBe('Dumbbell Bench Press');
    expect(formatWorkoutPlannerExerciseName('NASM: Cable Row')).toBe('Cable Row');
    expect(formatWorkoutPlannerExerciseName('nasm - Goblet Squat')).toBe('Goblet Squat');
    expect(formatWorkoutPlannerExerciseName('Single-Arm NASM Row')).toBe('Single-Arm NASM Row');
  });

  it('returns a safe fallback for blank labels', () => {
    expect(formatWorkoutPlannerExerciseName('')).toBe('Unknown Exercise');
    expect(formatWorkoutPlannerExerciseName(null)).toBe('Unknown Exercise');
  });

  it('sanitizes generated-plan exercise labels for PDF preview copies only', () => {
    const exportedPlan = withDisplayExerciseNamesForExport(generatedPlan);

    expect(exportedPlan.weeks?.[0].days?.[0].exercises[0].exerciseName)
      .toBe('Dumbbell Bench Press');
    expect(exportedPlan.weeks?.[0].days?.[0].exercises[1].name)
      .toBe('Cable Row');
    expect(exportedPlan.weeks?.[0].sessions?.[0].exercises[0].exerciseName)
      .toBe('Goblet Squat');
    expect(generatedPlan.weeks?.[0].days?.[0].exercises[0].exerciseName)
      .toBe('NASM Dumbbell Bench Press');
  });
});
