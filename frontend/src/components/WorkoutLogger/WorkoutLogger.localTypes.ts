import type {
  DailyWorkoutForm,
  ExerciseEntry,
} from '../../services/nasmApiService';

export interface WorkoutLoggerProps {
  clientId?: number;
  onComplete?: (formData: DailyWorkoutForm) => void;
  onCancel?: () => void;
  forceSelfMode?: boolean;
  initialData?: Partial<ExerciseEntry[]>;
  loadTodayPlanSignal?: number;
  scheduledSessionCreditHint?: number | null;
  scheduledSessionId?: string | null;
  scheduledSessionDate?: string | null;
  onOpenHistoryImport?: () => void;
}


/** C4a draft-wins gate — moved here when WorkoutDraftGateBanner was absorbed into the shell Notice lane. */
export type WorkoutDraftGate = 'none' | 'pending' | 'restored' | 'discarded';

export interface WorkoutLoggerExerciseOption {
  id: string;
  name: string;
  description?: string;
  exerciseType: string;
  difficulty: number;
  muscleGroups: string[];
}

export interface WorkoutLoggerClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  availableSessions: number | null;
  clientSource?: string | null;
  phone?: string;
}

export interface PlannedExercise {
  exerciseId?: string | number;
  id?: string | number;
  exerciseName?: string;
  name?: string;
  sets?: unknown[] | number | string;
  setScheme?: number | string;
  weight?: number | string;
  targetReps?: number | string;
  reps?: number | string;
  repGoal?: number | string;
  tempo?: string;
  restTime?: number | string;
  restSeconds?: number | string;
  restPeriod?: number | string;
  notes?: string;
}

export interface PlannedSession {
  exercises?: PlannedExercise[];
  weekNumber?: number | string;
  dayLabel?: string;
  dayNumber?: number | string;
}

export interface PlannedAssignment {
  assignmentId?: string | null;
  assignmentKey?: string | null;
  planId?: string | number | null;
  assignmentType?: string | null;
  source?: string | null;
  isLoggable?: boolean | null;
  isBillable?: boolean | null;
  shouldDeductSession?: boolean | null;
  status?: string | null;
  title?: string | null;
  scheduledDate?: string | null;
  weekNumber?: number | string | null;
  dayNumber?: number | string | null;
  dayLabel?: string | null;
  exerciseCount?: number | null;
  firstExerciseName?: string | null;
  ctaLabel?: string | null;
  exercises?: PlannedExercise[];
}

export interface PlannedDay {
  dayName?: string;
  exercises?: PlannedExercise[];
}

export interface CurrentWorkoutPlanResponse {
  id?: string | number;
  currentSession?: PlannedSession;
  todayAssignment?: PlannedAssignment;
  assignmentPicker?: PlanAssignmentPickerItem[];
  data?: {
    id?: string | number;
    currentSession?: PlannedSession;
    todayAssignment?: PlannedAssignment;
    assignmentPicker?: PlanAssignmentPickerItem[];
  };
  plan?: {
    id?: string | number;
    currentSession?: PlannedSession;
    todayAssignment?: PlannedAssignment;
    assignmentPicker?: PlanAssignmentPickerItem[];
    days?: PlannedDay[];
  };
}

export interface PlanAssignmentPickerItem extends PlannedAssignment {
  id: string;
  planTitle?: string | null;
  planStatus?: string | null;
  isCurrent?: boolean | null;
  isLoadable?: boolean | null;
  canSubmitPlannedAssignment?: boolean | null;
  submitMode?: 'planned_assignment' | 'draft_only' | string | null;
  sessionType?: string | null;
  exercises?: PlannedExercise[];
}
