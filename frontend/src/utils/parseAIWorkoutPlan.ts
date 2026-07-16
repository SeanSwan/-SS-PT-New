/**
 * parseAIWorkoutPlan
 * Extracts assistant workout text and stages parsed plans for logger review.
 */

export interface WorkoutExerciseTransfer {
  exerciseName: string;
  sets: number;
  reps: number;
  weight?: number;
  tempo?: string;
  restTime?: number;
  notes?: string;
}

export interface WorkoutPlanTransfer {
  exercises: WorkoutExerciseTransfer[];
  source: 'ai-chat' | 'ai-copilot';
  targetClientId?: number;
}

export const APPLY_WORKOUT_EVENT = 'applyWorkoutToLogger';
export const NAVIGATE_TO_LOGGER_EVENT = 'navigateToWorkoutLogger';
export const PENDING_WORKOUT_KEY = 'pendingAIWorkoutPlan';
export const PENDING_WORKOUT_QUEUE_KEY = 'pendingAIWorkoutPlanQueue';
const MAX_PENDING_WORKOUT_PLANS = 12;

type WorkoutStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getWorkoutStorage(): WorkoutStorage | null {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage;
}

function normalizeTargetClientId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizePlanTransfer(raw: unknown): WorkoutPlanTransfer | null {
  if (!raw || typeof raw !== 'object') return null;

  const plan = raw as Partial<WorkoutPlanTransfer>;
  if (!Array.isArray(plan.exercises) || plan.exercises.length === 0) return null;

  const exercises = plan.exercises.filter((exercise): exercise is WorkoutExerciseTransfer => {
    if (!exercise || typeof exercise !== 'object') return false;
    const candidate = exercise as Partial<WorkoutExerciseTransfer>;
    return typeof candidate.exerciseName === 'string'
      && candidate.exerciseName.trim().length > 0
      && Number.isFinite(Number(candidate.sets))
      && Number.isFinite(Number(candidate.reps));
  });

  if (exercises.length === 0) return null;

  const targetClientId = normalizeTargetClientId(plan.targetClientId);

  return {
    source: plan.source === 'ai-copilot' ? 'ai-copilot' : 'ai-chat',
    exercises,
    ...(targetClientId ? { targetClientId } : {}),
  };
}

function parseStoredPlans(raw: string | null): WorkoutPlanTransfer[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    return candidates
      .map(normalizePlanTransfer)
      .filter((plan): plan is WorkoutPlanTransfer => Boolean(plan));
  } catch {
    return [];
  }
}

export function appendPendingWorkoutPlan(
  payload: WorkoutPlanTransfer,
  storage: WorkoutStorage | null = getWorkoutStorage(),
): boolean {
  if (!storage) return false;

  const normalizedPayload = normalizePlanTransfer(payload);
  if (!normalizedPayload) return false;

  try {
    const legacyPlans = parseStoredPlans(storage.getItem(PENDING_WORKOUT_KEY));
    const queuedPlans = parseStoredPlans(storage.getItem(PENDING_WORKOUT_QUEUE_KEY));
    const nextPlans = [
      ...legacyPlans,
      ...queuedPlans,
      normalizedPayload,
    ].slice(-MAX_PENDING_WORKOUT_PLANS);

    storage.setItem(PENDING_WORKOUT_QUEUE_KEY, JSON.stringify(nextPlans));
    storage.removeItem(PENDING_WORKOUT_KEY);
    return true;
  } catch {
    return false;
  }
}

export function drainPendingWorkoutPlans(
  storage: WorkoutStorage | null = getWorkoutStorage(),
): WorkoutPlanTransfer[] {
  if (!storage) return [];

  const plans = [
    ...parseStoredPlans(storage.getItem(PENDING_WORKOUT_KEY)),
    ...parseStoredPlans(storage.getItem(PENDING_WORKOUT_QUEUE_KEY)),
  ];

  try {
    storage.removeItem(PENDING_WORKOUT_KEY);
    storage.removeItem(PENDING_WORKOUT_QUEUE_KEY);
  } catch { /* ignore */ }

  return plans;
}
export function drainPendingWorkoutPlansForClient(
  targetClientId: number | null | undefined,
  storage: WorkoutStorage | null = getWorkoutStorage(),
): WorkoutPlanTransfer[] {
  if (!storage) return [];

  const target = normalizeTargetClientId(targetClientId);
  if (!target) return [];

  const plans = [
    ...parseStoredPlans(storage.getItem(PENDING_WORKOUT_KEY)),
    ...parseStoredPlans(storage.getItem(PENDING_WORKOUT_QUEUE_KEY)),
  ];
  const matched = plans.filter((plan) => !plan.targetClientId || plan.targetClientId === target);
  const remaining = plans.filter((plan) => plan.targetClientId && plan.targetClientId !== target);

  try {
    storage.removeItem(PENDING_WORKOUT_KEY);
    if (remaining.length) storage.setItem(PENDING_WORKOUT_QUEUE_KEY, JSON.stringify(remaining));
    else storage.removeItem(PENDING_WORKOUT_QUEUE_KEY);
  } catch { /* ignore */ }

  return matched;
}

export function parseAIWorkoutPlan(content: string): WorkoutExerciseTransfer[] | null {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      const exercises = parsed.exercises || parsed;
      if (Array.isArray(exercises) && exercises.length > 0) {
        return exercises.map(normalizeExercise).filter(Boolean) as WorkoutExerciseTransfer[];
      }
    } catch { /* fall through to text parsing */ }
  }

  const exerciseLines = extractExerciseLines(content);
  if (exerciseLines.length >= 1) {
    return exerciseLines;
  }

  return null;
}

function normalizeExercise(raw: any): WorkoutExerciseTransfer | null {
  const name = raw.exerciseName || raw.name || raw.exercise;
  if (!name || typeof name !== 'string') return null;

  const setSpec = raw.sets ?? raw.setScheme;
  const repSpec = raw.reps ?? raw.targetReps ?? raw.repGoal;
  const restSpec = raw.restTime ?? raw.restSeconds ?? raw.restPeriod ?? raw.rest;
  const weightSpec = raw.weight ?? raw.load;
  const parsedSetCount = Array.isArray(setSpec) ? setSpec.length : parseInt(setSpec);
  const parsedReps = parseInt(repSpec);
  const parsedWeight = parseFloat(weightSpec);

  return {
    exerciseName: name.trim(),
    sets: Number.isFinite(parsedSetCount) && parsedSetCount > 0 ? parsedSetCount : 3,
    reps: Number.isFinite(parsedReps) ? parsedReps : 10,
    weight: Number.isFinite(parsedWeight) ? parsedWeight : undefined,
    tempo: raw.tempo || undefined,
    restTime: restSpec !== undefined && restSpec !== null && restSpec !== '' ? parseInt(restSpec) : undefined,
    notes: raw.notes || raw.intensityGuideline || undefined,
  };
}
function cleanExerciseName(value: string): string {
  return value.trim().replace(/\*\*/g, '').replace(/[.:]+$/, '').trim();
}

function cleanPrescription(value: string): string {
  return value.trim().replace(/\s+/g, ' ').replace(/[.;]+$/, '');
}

function buildReviewOnlyExercise(name: string, sets: number, notes: string): WorkoutExerciseTransfer {
  return { exerciseName: cleanExerciseName(name), sets, reps: 0, notes: cleanPrescription(notes) };
}

function extractExerciseLines(text: string): WorkoutExerciseTransfer[] {
  const results: WorkoutExerciseTransfer[] = [];

  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const intervalMatch = trimmed.match(
      /^(?:\d+[.)]\s*|[-\u2022]\s*|\*\*)?([A-Z][A-Za-z\s\-'()]+?)(?:\*\*)?\s*[-\u2013\u2014:]\s*(\d+)\s*(?:rounds?|sets?)\s*(?:x|\u00d7|of)\s*(\d+)\s*(s|sec|secs|seconds?|m|min|mins|minutes?)\b/i
    );

    if (intervalMatch) {
      results.push(buildReviewOnlyExercise(
        intervalMatch[1],
        parseInt(intervalMatch[2]),
        `${intervalMatch[2]} ${trimmed.toLowerCase().includes('set') ? 'sets' : 'rounds'} x ${intervalMatch[3]} ${intervalMatch[4]}`,
      ));
      continue;
    }

    const timedSetMatch = trimmed.match(
      /^(?:\d+[.)]\s*|[-\u2022]\s*|\*\*)?([A-Z][A-Za-z\s\-'()]+?)(?:\*\*)?\s*[-\u2013\u2014:]\s*(\d+)\s*(?:x|\u00d7)\s*(\d+)\s*(s|sec|secs|seconds?|m|min|mins|minutes?)\b/i
    );

    if (timedSetMatch) {
      results.push(buildReviewOnlyExercise(
        timedSetMatch[1],
        parseInt(timedSetMatch[2]),
        `${timedSetMatch[2]} x ${timedSetMatch[3]} ${timedSetMatch[4]}`,
      ));
      continue;
    }

    const durationMatch = trimmed.match(
      /^(?:\d+[.)]\s*|[-\u2022]\s*|\*\*)?([A-Z][A-Za-z\s\-'()]+?)(?:\*\*)?\s*[-\u2013\u2014:]\s*(\d+)\s*(?:m|min|mins|minutes?)\b/i
    );

    if (durationMatch) {
      results.push(buildReviewOnlyExercise(
        durationMatch[1],
        1,
        `${durationMatch[2]} minutes`,
      ));
      continue;
    }

    const exerciseMatch = trimmed.match(
      /^(?:(?:[A-Z]\d+|\d+)[.)]\s*|[-\u2022]\s*|\*\*)?([A-Z0-9][A-Za-z0-9\s\-'()&/]+?)(?:\*\*)?(?:\s*[-\u2013\u2014:]\s*|\s+)(\d+)\s*(?:sets?\s*(?:x|\u00d7|of)\s*|\s*(?:x|\u00d7)\s*)(\d+)\s*(?:reps?)?/i
    );

    if (exerciseMatch) {
      const exercise: WorkoutExerciseTransfer = {
        exerciseName: cleanExerciseName(exerciseMatch[1]),
        sets: parseInt(exerciseMatch[2]),
        reps: parseInt(exerciseMatch[3]),
      };

      const weightMatch = trimmed.match(/(?:@\s*)?(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kg)/i);
      if (weightMatch) exercise.weight = parseFloat(weightMatch[1]);

      const tempoMatch = trimmed.match(/(?:tempo\s+)?(\d\/\d\/\d(?:\/\d)?)/i);
      if (tempoMatch) exercise.tempo = tempoMatch[1];

      const restMatch = trimmed.match(
        /(?:\brest\s*:?\s*(\d+)\s*(?:s|sec|secs|seconds?)\b|\b(\d+)\s*(?:s|sec|secs|seconds?)\b\s*rest\b)/i
      );
      if (restMatch) exercise.restTime = parseInt(restMatch[1] || restMatch[2]);

      results.push(exercise);
      continue;
    }

    // Simpler pattern: "Exercise Name (3x10)"
    const simpleMatch = trimmed.match(
      /^(?:(?:[A-Z]\d+|\d+)[.)]\s*|[-\u2022]\s*|\*\*)?([A-Z0-9][A-Za-z0-9\s\-'()&/]+?)(?:\*\*)?[\s]*\((\d+)\s*[x\u00d7]\s*(\d+)\)/i
    );

    if (simpleMatch) {
      results.push({
        exerciseName: cleanExerciseName(simpleMatch[1]),
        sets: parseInt(simpleMatch[2]),
        reps: parseInt(simpleMatch[3]),
      });
    }
  }

  return results;
}

export function dispatchApplyToLogger(exercises: WorkoutExerciseTransfer[]): void {
  const payload: WorkoutPlanTransfer = { exercises, source: 'ai-chat' };

  appendPendingWorkoutPlan(payload);

  window.dispatchEvent(new CustomEvent(APPLY_WORKOUT_EVENT, { detail: payload }));

  window.dispatchEvent(new Event(NAVIGATE_TO_LOGGER_EVENT));
}
