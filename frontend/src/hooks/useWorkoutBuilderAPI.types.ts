import type { SwanCoachPlanningFingerprint } from '../services/aiWorkoutPlanningTypes';

export interface PainExclusion {
  bodyRegion: string;
  painLevel: number;
  painType: string;
  muscles: string[];
  reason: string;
  entryId: number;
}

export interface PainWarning extends PainExclusion {}

export interface Compensation {
  type: string;
  frequency: number;
  avgSeverity: number;
  trend: 'improving' | 'stable' | 'worsening';
  lastDetected: string | null;
  cesStrategy: {
    inhibit: string[];
    lengthen: string[];
    activate: string[];
    integrate: string[];
  } | null;
}

export interface EquipmentLocation {
  id: number;
  name: string;
  locationType: string;
  equipmentCount: number;
  items: { id: number; name: string; category: string; resistanceType: string }[];
}

export interface ClientContext {
  clientId: number;
  trainerId: number;
  clientName: string;
  fetchedAt: string;
  pain: {
    activeEntries: number;
    exclusions: PainExclusion[];
    warnings: PainWarning[];
    excludedMuscles: string[];
  };
  movement: {
    nasmPhaseRecommendation: number | null;
    compensations: Compensation[];
    exerciseScores: Record<string, unknown>;
    totalAnalyses: number;
  };
  formAnalysis: {
    recentCount: number;
    detectedCompensations: string[];
    avgScore: number;
    flaggedExercises: { exercise: string; score: number; analysisId: number }[];
  };
  workouts: {
    sessionsLast2Weeks: number;
    recentExercises: string[];
    avgFormRating: number;
    avgIntensity: number;
  };
  equipment: EquipmentLocation[];
  variation: {
    recentSessions: number;
    lastSessionType: 'build' | 'switch' | null;
    lastSessionDate: string | null;
    recentlyUsedExercises: string[];
    currentPattern: string;
  };
  constraints: {
    excludedMuscles: string[];
    compensationTypes: string[];
    recentlyUsedExercises: string[];
    nasmPhase: number | null;
  };
}

export interface WorkoutExercise {
  exerciseKey: string;
  exerciseName: string;
  muscles: string[];
  category: string;
  equipment: string[];
  nasmLevel: number;
  sets: number;
  reps: string;
  tempo: string;
  rest: string;
  intensity: string;
}

export interface WarmupExercise {
  name: string;
  duration?: string;
  sets?: number;
  reps?: number;
  type: 'inhibit' | 'lengthen' | 'activate';
  reason?: string;
}

export interface Explanation {
  type: string;
  message: string;
  details?: string[];
}

export interface GeneratedWorkout {
  clientId: number;
  trainerId: number;
  clientName: string;
  generatedAt: string;
  planningSystem: 'swan_coach_planning';
  swanCoachPlanning: SwanCoachPlanningFingerprint;
  sessionType: 'build' | 'switch';
  category: string;
  nasmPhase: number;
  phaseParams: {
    name: string;
    focus: string;
    intensity: string;
    tempo: string;
  };
  warmup: WarmupExercise[];
  exercises: WorkoutExercise[];
  swapSuggestions: unknown[] | null;
  cooldown: { name: string; duration?: string; sets?: number; reps?: number }[];
  constraints: ClientContext['constraints'];
  explanations: Explanation[];
  context: {
    painExclusions: number;
    painWarnings: number;
    compensations: number;
    recentWorkouts: number;
    avgFormRating: number;
    equipmentProfileId: number | null;
  };
}

export interface Mesocycle {
  mesocycle: number;
  weeks: string;
  nasmPhase: number;
  phaseName: string;
  focus: string;
  params: {
    sets: string;
    reps: string;
    intensity: string;
    tempo: string;
    rest: string;
  };
  overloadStrategy: string;
  deloadWeek: number | null;
}

export interface WorkoutBuilderPlanExercise {
  exerciseId?: string | number;
  exerciseName?: string;
  sets?: string | number;
  reps?: string | number;
  targetReps?: string | number;
  tempo?: string;
  rest?: string;
  restPeriod?: string | number;
  [key: string]: unknown;
}

export interface WorkoutBuilderPlanDay {
  dayNumber?: number;
  dayName?: string;
  name?: string;
  focus?: string;
  category?: string;
  exercises?: WorkoutBuilderPlanExercise[];
  [key: string]: unknown;
}

export interface WorkoutBuilderPlanWeek {
  weekNumber: number;
  focus?: string;
  mesocycle?: number;
  nasmPhase?: number;
  days?: WorkoutBuilderPlanDay[];
  sessions?: WorkoutBuilderPlanDay[];
  [key: string]: unknown;
}

export interface WorkoutBuilderRecommendationDetail {
  type: string;
  text: string;
  sourceCitation?: string;
  [key: string]: unknown;
}

export interface WorkoutBuilderEquipmentContext {
  profileId: number | null;
  availableEquipment: string[];
  resistanceTypes: string[];
  [key: string]: unknown;
}

export interface GeneratedPlan {
  clientId: number;
  trainerId: number;
  clientName: string;
  generatedAt: string;
  planningSystem: 'swan_coach_planning';
  swanCoachPlanning: SwanCoachPlanningFingerprint;
  planSummary: {
    durationWeeks: number;
    sessionsPerWeek: number;
    totalSessions: number;
    primaryGoal: string;
    startingPhase: number;
    equipmentProfileId: number | null;
  };
  mesocycles: Mesocycle[];
  weeklySchedule: { dayNumber: number; focus: string; category: string }[];
  weeks?: WorkoutBuilderPlanWeek[];
  constraints: ClientContext['constraints'];
  compensations: { type: string; trend: string }[];
  recommendations: string[];
  recommendationDetails?: WorkoutBuilderRecommendationDetail[];
  rationale?: string[];
  equipmentContext?: WorkoutBuilderEquipmentContext | null;
}

export interface WorkoutBuilderPlanSavePayload {
  userId: number;
  title: string;
  description: string;
  nasmPhase: number | null;
  durationWeeks: number;
  status: 'draft';
  planData: Record<string, unknown>;
  createdBy: 'ai';
  metadata: {
    source: 'workout_builder';
    planningSystem: 'swan_coach_planning';
    swanCoachPlanning: SwanCoachPlanningFingerprint;
    primaryGoal: string;
    sessionsPerWeek: number;
    totalSessions: number;
    equipmentProfileId: number | null;
    generatedAt: string;
  };
}

export interface SavedWorkoutPlan {
  id?: string | number;
  title?: string;
  status?: string;
  planData?: unknown;
  metadata?: unknown;
  [key: string]: unknown;
}

export interface AdminOverview {
  fetchedAt: string;
  trainerId: number;
  painAlerts: {
    clientId: number;
    clientName: string;
    bodyRegion: string;
    painLevel: number;
    painType: string;
    reportedAt: string;
  }[];
  equipmentPendingApprovals: number;
  formAnalysis: {
    total: number;
    complete: number;
    processing: number;
    failed: number;
    avgScore: number;
    flaggedExercises: { userId: number; exercise: string; score: number }[];
  };
  variationSessionsThisWeek: number;
  workoutsLoggedThisWeek: number;
}
