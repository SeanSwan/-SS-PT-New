/**
 * Workout Management Components
 * 
 * Centralized exports for all workout management components
 * to enable easy importing across the application
 */

// Core Workout Management
export { default as AdminWorkoutManagement } from './AdminWorkoutManagement';
export { default as TrainerWorkoutManagement } from '../TrainerDashboard/WorkoutManagement/TrainerWorkoutManagement';
export { default as EnhancedMyWorkoutsSection } from '../ClientDashboard/sections/EnhancedMyWorkoutsSection';

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