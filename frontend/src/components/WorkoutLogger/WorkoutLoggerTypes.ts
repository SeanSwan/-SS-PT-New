/**
 * Workout Logger - Type Definitions
 * =================================
 * TypeScript interfaces for the NASM-compliant workout logging system
 * 
 * BLUEPRINT IMPLEMENTATION - THE WORKOUT LOGGING ECOSYSTEM:
 * This defines the complete data structures for workout logging from
 * The Grand Unifying Blueprint v43.2, featuring:
 * 
 * ✅ NASM-compliant exercise categorization
 * ✅ Comprehensive set-by-set logging
 * ✅ RPE and form quality tracking
 * ✅ Session summary and client feedback
 * ✅ Integration with gamification system
 * ✅ Real-time progress tracking
 */

// ==================== CORE WORKOUT ENTITIES ====================

/**
 * Exercise entity from Olympian's Codex database
 */
export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  targetMuscles: string[];
  equipment: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  instructions: string[];
  videoUrl?: string;
  imageUrl?: string;
  nasmPhase: NASMPhase;
  biomechanicalMovement: BiomechanicalMovement;
  createdAt: string;
  updatedAt: string;
}

/**
 * NASM Exercise Categories
 */
export type ExerciseCategory = 
  | 'Core'
  | 'Balance'
  | 'Plyometric'
  | 'Resistance'
  | 'Cardio'
  | 'Flexibility'
  | 'SAQ' // Speed, Agility, Quickness
  | 'Corrective'
  | 'Functional';

/**
 * NASM Training Phases
 */
export type NASMPhase = 
  | 'Phase 1: Foundation/Activation'
  | 'Phase 2: Strength/Control'
  | 'Phase 3: Power/Skill'
  | 'Phase 4: Recovery';

/**
 * Biomechanical Movement Patterns
 */
export type BiomechanicalMovement = 
  | 'Squat'
  | 'Lunge'
  | 'Push'
  | 'Pull'
  | 'Bend'
  | 'Twist'
  | 'Gait'
  | 'Stabilization';

/**
 * Individual set data for an exercise
 */
export interface ExerciseSet {
  id: string;
  setNumber: number;
  weight: number; // in lbs
  reps: number;
  tempo?: string; // e.g., "2-0-2-0"
  rpe: number; // Rate of Perceived Exertion (1-10)
  formQuality: number; // Form rating (1-5 stars)
  notes?: string;
  restTime?: number; // seconds
  completed: boolean;
  timestamp: string;
}

/**
 * Exercise instance within a workout
 */
export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  sets: ExerciseSet[];
  order: number; // Exercise order in workout
  notes?: string;
  substituted?: boolean; // If exercise was swapped from original plan
  originalExerciseId?: string; // If substituted, what was the original
  targetSets: number;
  targetReps: number;
  targetWeight?: number;
  targetRPE?: number;
}

/**
 * Complete workout session
 */
export interface WorkoutSession {
  id: string;
  clientId: string;
  trainerId: string;
  sessionId?: string; // Link to scheduled session if applicable
  startTime: string;
  endTime?: string;
  duration?: number; // minutes
  exercises: WorkoutExercise[];
  sessionNotes?: string;
  clientFeedback?: string;
  overallIntensity: number; // 1-10 scale
  energyLevel: number; // Client's energy level 1-10
  goals: string[]; // Session goals achieved
  status: WorkoutStatus;
  nasmFocus: NASMPhase[];
  totalVolume: number; // Total weight lifted
  totalSets: number;
  totalReps: number;
  averageRPE: number;
  averageFormScore: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Workout session status
 */
export type WorkoutStatus = 
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'missed';

// ==================== CLIENT AND TRAINER DATA ====================

/**
 * Client information for workout logging
 */
export interface WorkoutClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
  availableSessions: number;
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  goals: string[];
  restrictions?: string[];
  preferredExercises?: string[];
  dislikedExercises?: string[];
  lastWorkout?: string;
  totalWorkouts: number;
  averageIntensity: number;
  progressNotes?: string;
}

/**
 * Trainer information for workout logging
 */
export interface WorkoutTrainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
  specialties: string[];
  certifications: string[];
  experience: number; // years
}

// ==================== UI STATE TYPES ====================

/**
 * Form state for the workout logger
 */
export interface WorkoutLoggerState {
  // Session Info
  client: WorkoutClient | null;
  trainer: WorkoutTrainer | null;
  sessionStartTime: string | null;
  currentDuration: number; // seconds
  isTimerRunning: boolean;
  
  // Exercises
  exercises: WorkoutExercise[];
  currentExerciseIndex: number;
  exerciseSearchQuery: string;
  exerciseSearchResults: Exercise[];
  isSearching: boolean;
  
  // Current Set Being Logged
  currentSetData: Partial<ExerciseSet>;
  
  // Session Summary
  sessionNotes: string;
  clientFeedback: string;
  overallIntensity: number;
  energyLevel: number;
  goals: string[];
  
  // UI State
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  showExerciseModal: boolean;
  showSummaryModal: boolean;
  showSubstitutionModal: boolean;
  
  // Validation
  validationErrors: ValidationErrors;
}

/**
 * Validation errors for form fields
 */
export interface ValidationErrors {
  exercises?: string;
  sets?: { [exerciseId: string]: { [setId: string]: string[] } };
  sessionNotes?: string;
  clientFeedback?: string;
  general?: string[];
}

// ==================== API REQUEST/RESPONSE TYPES ====================

/**
 * Request payload for creating a workout log
 */
export interface CreateWorkoutLogRequest {
  clientId: string;
  trainerId: string;
  sessionId?: string;
  startTime: string;
  endTime: string;
  duration: number;
  exercises: {
    exerciseId: string;
    order: number;
    notes?: string;
    targetSets: number;
    targetReps: number;
    targetWeight?: number;
    sets: {
      setNumber: number;
      weight: number;
      reps: number;
      tempo?: string;
      rpe: number;
      formQuality: number;
      notes?: string;
      restTime?: number;
    }[];
  }[];
  sessionNotes?: string;
  clientFeedback?: string;
  overallIntensity: number;
  energyLevel: number;
  goals: string[];
}

/**
 * API response for workout log creation
 */
export interface CreateWorkoutLogResponse {
  success: boolean;
  data: {
    workoutLog: WorkoutSession;
    pointsAwarded: number;
    clientSessionsRemaining: number;
    achievements?: Achievement[];
  };
  message: string;
}

/**
 * Exercise search request
 */
export interface ExerciseSearchRequest {
  query?: string;
  category?: ExerciseCategory;
  nasmPhase?: NASMPhase;
  biomechanicalMovement?: BiomechanicalMovement;
  targetMuscles?: string[];
  equipment?: string[];
  difficulty?: string;
  limit?: number;
  offset?: number;
}

/**
 * Exercise search response
 */
export interface ExerciseSearchResponse {
  success: boolean;
  data: {
    exercises: Exercise[];
    total: number;
    hasMore: boolean;
  };
  message?: string;
}

// ==================== GAMIFICATION INTEGRATION ====================

/**
 * Achievement earned from workout completion
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  unlockedAt: string;
}

/**
 * Points calculation breakdown
 */
export interface PointsBreakdown {
  basePoints: number;
  intensityBonus: number;
  consistencyBonus: number;
  formBonus: number;
  achievementBonus: number;
  total: number;
  breakdown: {
    category: string;
    points: number;
    reason: string;
  }[];
}

// ==================== PREFERENCES AND SETTINGS ====================

/**
 * Workout logger preferences
 */
export interface WorkoutLoggerPreferences {
  defaultWeightUnit: 'lbs' | 'kg';
  showTempoInput: boolean;
  showRestTimer: boolean;
  autoStartRestTimer: boolean;
  defaultRestTime: number; // seconds
  showFormRating: boolean;
  showRPESlider: boolean;
  autoSaveInterval: number; // seconds
  enableVoiceCommands: boolean;
  playCompletionSounds: boolean;
  enableHapticFeedback: boolean;
}

/**
 * Exercise filter options for search
 */
export interface ExerciseFilters {
  categories: ExerciseCategory[];
  nasmPhases: NASMPhase[];
  biomechanicalMovements: BiomechanicalMovement[];
  targetMuscles: string[];
  equipment: string[];
  difficulty: string[];
  favorites: boolean;
  recent: boolean;
}

// ==================== EXPORT CONSTANTS ====================

/**
 * NASM Phase colors for UI
 */
export const NASM_PHASE_COLORS = {
  'Phase 1: Foundation/Activation': '#22c55e', // Green
  'Phase 2: Strength/Control': '#3b82f6',      // Blue  
  'Phase 3: Power/Skill': '#f59e0b',           // Orange
  'Phase 4: Recovery': '#8b5cf6'               // Purple
} as const;

/**
 * Exercise category icons
 */
export const EXERCISE_CATEGORY_ICONS = {
  'Core': '🏋️',
  'Balance': '⚖️',
  'Plyometric': '💥',
  'Resistance': '💪',
  'Cardio': '❤️',
  'Flexibility': '🤸',
  'SAQ': '⚡',
  'Corrective': '🔧',
  'Functional': '🎯'
} as const;

/**
 * RPE scale descriptions
 */
export const RPE_DESCRIPTIONS = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Light',
  4: 'Somewhat Easy',
  5: 'Moderate',
  6: 'Somewhat Hard',
  7: 'Hard',
  8: 'Very Hard', 
  9: 'Extremely Hard',
  10: 'Maximum Effort'
} as const;

/**
 * Form quality descriptions
 */
export const FORM_QUALITY_DESCRIPTIONS = {
  1: 'Poor - Needs major correction',
  2: 'Below Average - Multiple issues',
  3: 'Average - Minor corrections needed',
  4: 'Good - Nearly perfect form',
  5: 'Excellent - Perfect execution'
} as const;

/**
 * Default workout logger preferences
 */
export const DEFAULT_PREFERENCES: WorkoutLoggerPreferences = {
  defaultWeightUnit: 'lbs',
  showTempoInput: true,
  showRestTimer: true,
  autoStartRestTimer: true,
  defaultRestTime: 90,
  showFormRating: true,
  showRPESlider: true,
  autoSaveInterval: 30,
  enableVoiceCommands: false,
  playCompletionSounds: true,
  enableHapticFeedback: true
};

// ==================== UTILITY TYPES ====================

/**
 * Generic API response wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}

/**
 * Form validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

/**
 * Timer state
 */
export interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  currentTime: number;
  elapsedTime: number;
  formattedTime: string;
}

// ==================== EVENT TYPES ====================

/**
 * Workout logger events for analytics
 */
export type WorkoutLoggerEvent = 
  | 'workout_started'
  | 'exercise_added'
  | 'exercise_removed'
  | 'exercise_substituted'
  | 'set_completed'
  | 'set_deleted'
  | 'workout_paused'
  | 'workout_resumed'
  | 'workout_completed'
  | 'workout_cancelled'
  | 'exercise_searched'
  | 'form_auto_saved';

/**
 * Event payload for analytics
 */
export interface WorkoutLoggerEventPayload {
  event: WorkoutLoggerEvent;
  timestamp: string;
  clientId: string;
  trainerId: string;
  sessionId?: string;
  data?: any;
}
