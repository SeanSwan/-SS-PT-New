import type {
  PDFExerciseEntry,
  WorkoutLoggerPDFData,
} from '../../services/pdfExportService';
import type { ExerciseEntry } from '../../services/nasmApiService';
import type { WorkoutLoggerClient } from './WorkoutLogger.localTypes';

interface BuildWorkoutLoggerPdfPayloadParams {
  client: WorkoutLoggerClient | null;
  trainer?: {
    firstName?: string;
    lastName?: string;
  } | null;
  date: string;
  exercises: ExerciseEntry[];
  sessionNotes: string;
  overallIntensity: number | null;
}

export function mapWorkoutExercisesForPdf(exercises: ExerciseEntry[]): PDFExerciseEntry[] {
  return exercises.map((exercise) => ({
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    sets: exercise.sets.map((set) => ({
      setNumber: set.setNumber,
      weight: set.weight,
      reps: set.reps,
      rpe: set.rpe,
      tempo: set.tempo,
      restTime: set.restTime,
      formQuality: set.formQuality,
      notes: set.notes,
    })),
    formRating: exercise.formRating,
    painLevel: exercise.painLevel,
    performanceNotes: exercise.performanceNotes,
  }));
}

export function buildWorkoutLoggerPdfPayload({
  client,
  trainer,
  date,
  exercises,
  sessionNotes,
  overallIntensity,
}: BuildWorkoutLoggerPdfPayloadParams): WorkoutLoggerPDFData {
  return {
    clientName: client ? `${client.firstName} ${client.lastName}` : 'Client',
    trainerName: trainer?.firstName ? `${trainer.firstName} ${trainer.lastName || ''}` : undefined,
    date,
    exercises: mapWorkoutExercisesForPdf(exercises),
    sessionNotes,
    overallIntensity: overallIntensity ?? undefined,
  };
}
