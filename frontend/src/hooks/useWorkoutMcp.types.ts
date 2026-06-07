/**
 * Workout API hook types
 * ======================
 *
 * Shared public types for the SwanStudios workout API hook and Program
 * Architect adapters.
 */

export interface Exercise {
  id: string;
  name: string;
  description: string;
  difficulty?: string;
  category?: string;
  exerciseType?: string;
  isRehabExercise?: boolean;
  optPhase?: string;
  muscleGroups?: { id: string; name: string; shortName: string; bodyRegion: string }[];
  equipment?: { id: string; name: string; category: string }[];
}

export interface SetData {
  setNumber: number;
  setType: string;
  repsGoal?: number;
  repsCompleted?: number;
  weightGoal?: number;
  weightUsed?: number;
  duration?: number;
  distance?: number;
  restGoal?: number;
  restTaken?: number;
  rpe?: number;
  tempo?: string;
  notes?: string;
  isPR?: boolean;
  completedAt?: string;
}

export interface WorkoutExercise {
  id?: string;
  exerciseId: string;
  orderInWorkout?: number;
  performanceRating?: number;
  difficultyRating?: number;
  painLevel?: number;
  formRating?: number;
  formNotes?: string;
  isRehabExercise?: boolean;
  notes?: string;
  startedAt?: string;
  completedAt?: string;
  sets?: SetData[];
  exercise?: Exercise;
}

export interface WorkoutSession {
  id?: string;
  userId: string;
  workoutPlanId?: string;
  title: string;
  description?: string;
  plannedStartTime?: string;
  startedAt?: string;
  completedAt?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  duration?: number;
  caloriesBurned?: number;
  feelingRating?: number;
  intensityRating?: number;
  notes?: string;
  exercises?: WorkoutExercise[];
}

export interface ClientProgress {
  userId: string;
  strengthLevel: number;
  cardioLevel: number;
  flexibilityLevel: number;
  balanceLevel: number;
  coreLevel: number;
  totalWorkouts: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  totalExercises: number;
  lastWorkoutDate?: string;
  currentStreak: number;
  personalRecords?: Record<string, any>;
}

export interface WorkoutStatistics {
  totalWorkouts: number;
  totalDuration: number;
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  averageIntensity: number;
  weekdayBreakdown: number[];
  exerciseBreakdown?: { exerciseId: string; name: string; count: number }[];
  muscleGroupBreakdown?: { muscleGroup: string; count: number }[];
  intensityTrends?: { date: string; intensity: number }[];
  recentWorkouts?: { id: string; title: string; date: string; duration: number }[];
}

export interface WorkoutPlanDayExercise {
  exerciseId: string;
  exerciseName?: string;
  orderInWorkout?: number;
  setScheme?: string;
  repGoal?: string;
  restPeriod?: number;
  tempo?: string;
  intensityGuideline?: string;
  supersetGroup?: number;
  notes?: string;
  isOptional?: boolean;
  alternateExerciseId?: string;
}

export interface WorkoutPlanDay {
  dayNumber: number;
  name: string;
  focus?: string;
  dayType: string;
  assignmentType?: string;
  billingIntent?: string;
  shouldDeductSession?: boolean;
  optPhase?: string;
  notes?: string;
  warmupInstructions?: string;
  cooldownInstructions?: string;
  estimatedDuration?: number;
  sortOrder?: number;
  exercises?: WorkoutPlanDayExercise[];
}

export interface WorkoutPlan {
  id?: string;
  name: string;
  description?: string;
  trainerId: string;
  clientId: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'completed' | 'archived';
  planningSystem?: string;
  planData?: unknown;
  days?: WorkoutPlanDay[];
}
