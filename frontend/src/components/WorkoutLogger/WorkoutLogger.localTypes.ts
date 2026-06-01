import type {
  DailyWorkoutForm,
  ExerciseEntry,
} from '../../services/nasmApiService';

export interface WorkoutLoggerProps {
  clientId?: number;
  onComplete?: (formData: DailyWorkoutForm) => void;
  onCancel?: () => void;
  initialData?: Partial<ExerciseEntry[]>;
  scheduledSessionId?: string | null;
  scheduledSessionDate?: string | null;
}

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
  weight?: number | string;
  targetReps?: number | string;
  reps?: number | string;
  tempo?: string;
  restTime?: number | string;
  restSeconds?: number | string;
}

export interface PlannedSession {
  exercises?: PlannedExercise[];
  weekNumber?: number | string;
  dayLabel?: string;
  dayNumber?: number | string;
}

export interface PlannedDay {
  dayName?: string;
  exercises?: PlannedExercise[];
}

export interface CurrentWorkoutPlanResponse {
  currentSession?: PlannedSession;
  data?: {
    currentSession?: PlannedSession;
  };
  plan?: {
    currentSession?: PlannedSession;
    days?: PlannedDay[];
  };
}
