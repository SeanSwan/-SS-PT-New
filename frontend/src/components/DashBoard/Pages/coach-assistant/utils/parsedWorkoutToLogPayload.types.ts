export interface ParsedSet {
  setNumber: number;
  weight: number | null;
  reps: number;
  rpe?: number;
  formQuality?: number;
  notes?: string;
  tempo?: string;
}

export interface ParsedExercise {
  exerciseName: string;
  sets: ParsedSet[];
  formRating?: number;
  painLevel?: number;
  performanceNotes?: string;
}

export interface ParsedWorkout {
  exercises: ParsedExercise[];
  sessionNotes?: string;
  overallIntensity?: number;
  painFlags?: Array<{ bodyRegion: string; side: string; mention: string }>;
  confidence?: number;
  date?: string;
}

export interface LogWorkoutPayloadSet {
  setNumber: number;
  reps: number;
  weight: number;
  rpe?: number;
  notes?: string;
  tempo?: string;
}

export interface LogWorkoutPayloadExercise {
  name: string;
  sets: LogWorkoutPayloadSet[];
  exerciseNote?: string;
}

export interface LogWorkoutPayload {
  title: string;
  date: string;
  duration: number;
  intensity?: number;
  notes?: string;
  exercises: LogWorkoutPayloadExercise[];
}

export interface MapperOptions {
  fallbackTitle?: string;
  fallbackDate?: string;
  fallbackDurationMinutes?: number;
  fallbackIntensity?: number;
  targetDate?: string;
}

export const DEFAULT_TITLE = 'Voice Memo Workout';
export const DEFAULT_DURATION_MINUTES = 50;
export const DEFAULT_TEMPO = '1/1/0';
export const EXERCISE_NOTE_SEPARATOR = ' · Coach: ';
