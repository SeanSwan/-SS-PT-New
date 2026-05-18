/**
 * Workout Management Components
 * 
 * Centralized exports for all workout management components
 * to enable easy importing across the application
 */

// Shared Components
export { default as ExerciseLibrary } from './ExerciseLibrary';
export { default as WorkoutPlanBuilder } from './WorkoutPlanBuilder';
export { default as ClientSelection } from './ClientSelection';

// Hooks
export { default as useWorkoutMcp } from '../../hooks/useWorkoutMcp';

// Types
export type { 
  Exercise, 
  WorkoutPlan, 
  WorkoutSession, 
  ClientProgress, 
  WorkoutStatistics,
  SetData,
  WorkoutExercise,
  WorkoutPlanDay,
  WorkoutPlanDayExercise
} from '../../hooks/useWorkoutMcp';
