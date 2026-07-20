import { format } from 'date-fns';

export interface PlannerWorkoutSession {
  id: string;
  clientRequestId?: string;
  date: string | null;
  status: string;
  title: string;
  exerciseCount: number;
  completionPercentage: number;
  notes?: string;
  exercises: any[];
}

interface BuildWorkoutSessionPayloadParams {
  clientId: string;
  currentSession: PlannerWorkoutSession | null;
  notes: string;
  selectedExercises: any[];
  sessionDate: string;
}

interface WorkoutSessionDraftParams {
  currentSession: PlannerWorkoutSession | null;
  notes: string;
  selectedExercises: any[];
}

const asArray = (value: unknown): any[] => Array.isArray(value) ? value : [];

const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const formatWorkoutSessionDate = (date: string | null): string => {
  if (!date) return 'Date pending';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return 'Date pending';

  return format(parsedDate, 'MMM dd, yyyy');
};

export const formatEditableSessionDate = (date: string | null): string => {
  const parsedDate = date ? new Date(date) : new Date();
  return format(Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate, 'yyyy-MM-dd');
};

export const createBlankWorkoutSession = (sessionDate: string): PlannerWorkoutSession => ({
  id: '',
  clientRequestId: globalThis.crypto.randomUUID(),
  date: sessionDate,
  status: 'planned',
  title: 'New Workout Session',
  exerciseCount: 0,
  completionPercentage: 0,
  exercises: []
});

export const hasWorkoutSessionDraft = ({
  currentSession,
  notes,
  selectedExercises
}: WorkoutSessionDraftParams): boolean => (
  Boolean(currentSession)
  || notes.trim().length > 0
  || selectedExercises.length > 0
);

export const getWorkoutHistoryUrl = (clientId: string): string =>
  `/api/workouts/${clientId}/history`;

export const buildWorkoutSessionPayload = ({
  clientId,
  currentSession,
  notes,
  selectedExercises,
  sessionDate
}: BuildWorkoutSessionPayloadParams) => ({
  userId: clientId,
  clientRequestId: currentSession?.clientRequestId,
  sessionDate,
  title: currentSession?.title || 'Workout Session',
  status: currentSession?.status || 'planned',
  notes,
  exercises: selectedExercises.map((exercise, index) => {
    const setCount = Math.max(1, asNumber(exercise.recommendedSets || exercise.sets?.length, 3));
    const repsGoal = asNumber(exercise.recommendedReps, 10);
    const restGoal = asNumber(exercise.recommendedRest, 60);

    return {
      id: exercise.workoutExerciseId || exercise.workoutExercise?.id || exercise.sessionExerciseId,
      exerciseId: exercise.exerciseId || exercise.id,
      orderInWorkout: index + 1,
      sets: Array.from({ length: setCount }).map((_, setIndex) => ({
        setNumber: setIndex + 1,
        setType: 'working',
        repsGoal,
        weightGoal: 0,
        restGoal
      }))
    };
  })
});

export const extractWorkoutHistory = (payload: any): PlannerWorkoutSession[] => {
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : asArray(payload?.history?.workoutSessions);

  return rows.map((row: any, index: number) => {
    const exercises = asArray(row?.exercises);
    const exerciseCount = asNumber(
      row?.exerciseCount ?? row?.exercisesCount ?? (Array.isArray(row?.exercises) ? exercises.length : row?.exercises),
      0
    );
    const status = row?.status || 'completed';

    return {
      id: String(row?.id || `workout-${index}`),
      date: row?.date || row?.completedAt || row?.createdAt || null,
      status,
      title: row?.title || row?.name || 'Workout Session',
      exerciseCount,
      completionPercentage: asNumber(row?.completionPercentage, status === 'completed' ? 100 : 0),
      notes: typeof row?.notes === 'string' ? row.notes : '',
      exercises,
    };
  });
};
