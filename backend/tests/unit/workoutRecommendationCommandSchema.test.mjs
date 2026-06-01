import { describe, expect, it } from 'vitest';
import workoutCommands from '../../services/ai/commandRegistry/workoutCommands.mjs';

const recommendationCommand = workoutCommands.find(
  (command) => command.type === 'view_exercise_recommendations',
);
const deleteWorkoutPlanCommand = workoutCommands.find(
  (command) => command.type === 'delete_workout_plan',
);
const muscleGroupId = '11111111-1111-4111-8111-111111111111';
const excludedExerciseId = '22222222-2222-4222-8222-222222222222';
const workoutPlanId = '33333333-3333-4333-8333-333333333333';

describe('Swan Coach exercise recommendation command schema', () => {
  it('preserves trainer-dictated recommendation filters through validation', () => {
    const parsed = recommendationCommand.inputSchema.parse({
      clientId: 42,
      goal: 'strength',
      difficulty: 'beginner',
      equipment: ['Dumbbell', 'Cable'],
      muscleGroups: [muscleGroupId],
      muscleGroupNames: ['quads', 'glutes'],
      bodyRegions: ['lower_body', 'core'],
      excludeExercises: [excludedExerciseId],
      limit: 8,
      rehabFocus: true,
      optPhase: 2,
    });

    expect(parsed).toEqual({
      clientId: 42,
      goal: 'strength',
      difficulty: 'beginner',
      equipment: ['Dumbbell', 'Cable'],
      muscleGroups: [muscleGroupId],
      muscleGroupNames: ['quads', 'glutes'],
      bodyRegions: ['lower_body', 'core'],
      excludeExercises: [excludedExerciseId],
      limit: 8,
      rehabFocus: true,
      optPhase: 2,
    });
  });

  it('accepts real UUID workout plan ids for archive/delete commands', () => {
    expect(deleteWorkoutPlanCommand.inputSchema.parse({ planId: workoutPlanId })).toEqual({
      planId: workoutPlanId,
    });
  });
});
