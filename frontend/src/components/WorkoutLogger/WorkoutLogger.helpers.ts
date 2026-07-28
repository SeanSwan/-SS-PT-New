import type { ExerciseEntry, ExerciseSet } from '../../services/nasmApiService';
import type { WorkoutExerciseTransfer } from '../../utils/parseAIWorkoutPlan';
import type {
  CurrentWorkoutPlanResponse,
  PlanAssignmentPickerItem,
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

export function hasIncompleteWorkoutSets(exercises: ExerciseEntry[] = []): boolean {
  return exercises.some(exercise =>
    exercise.sets.length === 0 ||
    exercise.sets.some(set => set.weight === 0 && set.reps === 0)
  );
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
        reps: Number.isFinite(Number(exercise.reps)) ? Number(exercise.reps) : 10,
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

export function getCurrentWorkoutTodayAssignmentExercises(
  data: CurrentWorkoutPlanResponse | null | undefined,
): PlannedExercise[] {
  const assignment = getCurrentWorkoutTodayAssignment(data);
  return Array.isArray(assignment?.exercises) ? assignment.exercises : [];
}

export function isCurrentWorkoutAssignmentLoggable(
  assignment: PlannedAssignment | null | undefined,
  options: { hasScheduledSession?: boolean } = {},
): boolean {
  if (!assignment) return true;
  if (assignment.status?.toLowerCase() === 'completed') return false;
  if (assignment.assignmentType === 'trainer_session') {
    return options.hasScheduledSession === true;
  }
  return assignment.isLoggable !== false;
}

function normalizeAssignmentIntentValue(raw: unknown): string | null {
  const value = typeof raw === 'number' ? String(raw) : raw;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function currentWorkoutAssignmentMatchesRouteIntent(
  assignment: PlannedAssignment | null | undefined,
  intent: { assignmentKey?: string | null; assignmentType?: string | null } = {},
): boolean {
  const expectedKey = normalizeAssignmentIntentValue(intent.assignmentKey);
  const expectedType = normalizeAssignmentIntentValue(intent.assignmentType)?.toLowerCase() ?? null;
  if (!expectedKey && !expectedType) return true;
  if (!assignment) return false;

  const actualKey = normalizeAssignmentIntentValue(assignment.assignmentKey ?? assignment.assignmentId);
  const actualType = normalizeAssignmentIntentValue(assignment.assignmentType)?.toLowerCase() ?? null;

  if (expectedKey && actualKey !== expectedKey) return false;
  if (expectedType && actualType !== expectedType) return false;
  return true;
}

export function planAssignmentPickerItemToEntries(
  item: PlanAssignmentPickerItem,
  createLocalId: (prefix: string) => string,
): ExerciseEntry[] {
  const sourceExercises = Array.isArray(item.exercises) ? item.exercises : [];
  return sourceExercises.map((exercise) =>
    plannedExerciseToEntry(exercise, () => createLocalId('plan-picker'))
  );
}

export function planAssignmentPickerItemToContext(
  item: PlanAssignmentPickerItem,
): PlannedAssignment {
  return {
    assignmentId: item.assignmentId ?? item.assignmentKey ?? null,
    assignmentKey: item.assignmentKey ?? item.assignmentId ?? null,
    planId: item.planId ?? null,
    assignmentType: item.assignmentType ?? null,
    source: 'workout_plan',
    isLoggable: item.isLoadable !== false,
    isBillable: item.isBillable ?? false,
    shouldDeductSession: item.shouldDeductSession ?? false,
    status: item.status ?? null,
    title: item.title || item.dayLabel || item.planTitle || 'Selected Plan Day',
    scheduledDate: item.scheduledDate ?? null,
    weekNumber: item.weekNumber ?? null,
    dayNumber: item.dayNumber ?? null,
    dayLabel: item.dayLabel ?? null,
    exerciseCount: item.exerciseCount ?? (Array.isArray(item.exercises) ? item.exercises.length : null),
    firstExerciseName: item.firstExerciseName ?? item.exercises?.[0]?.exerciseName ?? item.exercises?.[0]?.name ?? null,
    ctaLabel: item.ctaLabel ?? null,
    exercises: item.exercises ?? [],
  };
}

export function planAssignmentPickerItemToSubmitAssignment(
  item: PlanAssignmentPickerItem,
): PlannedAssignment | null {
  return item.canSubmitPlannedAssignment === true
    ? planAssignmentPickerItemToContext(item)
    : null;
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
