import type { ExerciseEntry, ExerciseSet } from '../../services/nasmApiService';
import type { WorkoutExerciseTransfer } from '../../utils/parseAIWorkoutPlan';
import type {
  CurrentWorkoutPlanResponse,
  PlannedDay,
  PlannedAssignment,
  PlannedExercise,
  PlannedSession,
} from './WorkoutLogger.localTypes';

export function coerceToNumericId(raw: unknown): number | undefined {
  if (typeof raw === 'number') {
    return Number.isSafeInteger(raw) && raw > 0 ? raw : undefined;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) return undefined;

    const parsed = Number(trimmed);
    if (Number.isSafeInteger(parsed)) return parsed;
  }

  return undefined;
}

export function normalizeWorkoutDate(raw: string | null, fallbackDate = new Date()): string {
  const fallback = fallbackDate.toISOString().split('T')[0];
  if (!raw) return fallback;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? fallback
    : parsed.toISOString().split('T')[0];
}

function numberOr(value: number | string | undefined, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

let workoutLoggerSetIdCounter = 0;
let workoutLoggerExerciseIdCounter = 0;

function createWorkoutLoggerSetId(prefix = 'set'): string {
  workoutLoggerSetIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${workoutLoggerSetIdCounter}`;
}

function createWorkoutLoggerExerciseId(prefix = 'exercise'): string {
  workoutLoggerExerciseIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${workoutLoggerExerciseIdCounter}`;
}

export function ensureWorkoutLoggerSetId(
  set: ExerciseSet,
  createSetId: () => string = createWorkoutLoggerSetId,
): ExerciseSet {
  return set.loggerSetId ? set : { ...set, loggerSetId: createSetId() };
}

// fallow-ignore-next-line unused-export
export function ensureWorkoutLoggerSetIds(
  exercise: ExerciseEntry,
  createSetId: () => string = createWorkoutLoggerSetId,
): ExerciseEntry {
  return {
    ...exercise,
    sets: exercise.sets.map((set) => ensureWorkoutLoggerSetId(set, createSetId)),
  };
}

export function getExerciseSetRowKey(set: ExerciseSet): string {
  return set.loggerSetId ?? `set-${set.setNumber}`;
}

export function ensureWorkoutLoggerExerciseRowIdentity(
  exercise: ExerciseEntry,
  createExerciseId: () => string = createWorkoutLoggerExerciseId,
  createSetId: () => string = createWorkoutLoggerSetId,
): ExerciseEntry {
  const withStableSets = ensureWorkoutLoggerSetIds(exercise, createSetId);
  return withStableSets.loggerExerciseId
    ? withStableSets
    : { ...withStableSets, loggerExerciseId: createExerciseId() };
}

export function getExerciseEntryRowKey(exercise: ExerciseEntry): string {
  return exercise.loggerExerciseId ?? `exercise-${exercise.exerciseId || exercise.exerciseName}`;
}

export function plannedExerciseToEntry(
  exercise: PlannedExercise,
  createLocalId: () => string,
): ExerciseEntry {
  const setCount = Array.isArray(exercise.sets) ? exercise.sets.length : numberOr(exercise.sets, 3);

  return {
    loggerExerciseId: createLocalId(),
    exerciseId: String(exercise.exerciseId || exercise.id || createLocalId()),
    exerciseName: exercise.exerciseName || exercise.name || 'Unknown Exercise',
    sets: Array.from({ length: setCount }, (_, index) => ({
      loggerSetId: createLocalId(),
      setNumber: index + 1,
      weight: numberOr(exercise.weight, 0),
      reps: numberOr(exercise.targetReps ?? exercise.reps, 10),
      rpe: null,
      tempo: exercise.tempo || '',
      restTime: numberOr(exercise.restTime ?? exercise.restSeconds, 60),
      formQuality: null,
      notes: '',
    })),
    formRating: null,
    painLevel: 0,
    performanceNotes: '',
  };
}

export function convertAIWorkoutExercisesToEntries(
  incoming: WorkoutExerciseTransfer[],
  createLocalId: (prefix: string) => string,
): ExerciseEntry[] {
  return incoming.map((exercise) => {
    const setCount = Array.isArray(exercise.sets)
      ? exercise.sets.length
      : (Number(exercise.sets) || 3);

    return {
      loggerExerciseId: createLocalId('exercise'),
      exerciseId: createLocalId('ai'),
      exerciseName: exercise.exerciseName,
      sets: Array.from({ length: setCount }, (_, index) => ({
        loggerSetId: createLocalId('set'),
        setNumber: index + 1,
        weight: exercise.weight || 0,
        reps: exercise.reps || 10,
        rpe: null,
        tempo: exercise.tempo || '',
        restTime: exercise.restTime || 60,
        formQuality: null,
        notes: exercise.notes || '',
      })),
      formRating: null,
      painLevel: 0,
      performanceNotes: '',
    };
  });
}

export function getCurrentWorkoutCursorSession(
  data: CurrentWorkoutPlanResponse | null | undefined,
): PlannedSession | null {
  return data?.currentSession
    ?? data?.data?.currentSession
    ?? data?.plan?.currentSession
    ?? null;
}

export function getCurrentWorkoutPlanId(
  data: CurrentWorkoutPlanResponse | null | undefined,
): string | number | null {
  return data?.id ?? data?.data?.id ?? data?.plan?.id ?? null;
}

export function getCurrentWorkoutTodayAssignment(
  data: CurrentWorkoutPlanResponse | null | undefined,
): PlannedAssignment | null {
  return data?.todayAssignment
    ?? data?.data?.todayAssignment
    ?? data?.plan?.todayAssignment
    ?? null;
}

export function getPlanDayForDate(
  days: PlannedDay[] | undefined,
  date = new Date(),
): PlannedDay | null {
  if (!days?.length) return null;

  const dayOfWeek = date.getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[dayOfWeek];

  return days.find((day) => day.dayName?.toLowerCase() === todayName.toLowerCase())
    || days[dayOfWeek % days.length]
    || null;
}
