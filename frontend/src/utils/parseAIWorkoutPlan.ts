/**
 * parseAIWorkoutPlan
 * ==================
 * Extracts structured exercise data from AI assistant free-text responses.
 * Supports multiple formats: numbered lists, markdown tables, JSON blocks.
 *
 * Used by: AIAssistantDrawer "Apply to Logger" button
 * Consumed by: WorkoutLogger via custom event / sessionStorage
 */

// ── Transfer types (shared between AI drawer and Logger) ──

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
}

// ── Custom event name constant ──
export const APPLY_WORKOUT_EVENT = 'applyWorkoutToLogger';
export const NAVIGATE_TO_LOGGER_EVENT = 'navigateToWorkoutLogger';
export const PENDING_WORKOUT_KEY = 'pendingAIWorkoutPlan';
export const PENDING_WORKOUT_QUEUE_KEY = 'pendingAIWorkoutPlanQueue';
const MAX_PENDING_WORKOUT_PLANS = 12;

type WorkoutStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getWorkoutStorage(): WorkoutStorage | null {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage;
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

  return {
    source: plan.source === 'ai-copilot' ? 'ai-copilot' : 'ai-chat',
    exercises,
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

// ── Parser ──

/**
 * Attempt to extract exercises from an AI message.
 * Returns null if no exercises detected.
 */
export function parseAIWorkoutPlan(content: string): WorkoutExerciseTransfer[] | null {
  // Strategy 1: Look for embedded JSON block (```json ... ```)
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

  // Strategy 2: Look for numbered exercise lines
  // Patterns like:
  //   1. Barbell Back Squat - 4 sets x 8 reps @ 185 lbs
  //   2) Dumbbell Bench Press: 3x10, 60s rest
  //   - Romanian Deadlift — 3 sets of 12 reps, 135 lbs, tempo 3/1/2
  const exerciseLines = extractExerciseLines(content);
  if (exerciseLines.length >= 1) {
    return exerciseLines;
  }

  return null;
}

/**
 * Normalize a JSON exercise object into our transfer format
 */
function normalizeExercise(raw: any): WorkoutExerciseTransfer | null {
  const name = raw.exerciseName || raw.name || raw.exercise;
  if (!name || typeof name !== 'string') return null;

  return {
    exerciseName: name.trim(),
    sets: parseInt(raw.sets || raw.setScheme) || 3,
    reps: parseInt(raw.reps || raw.repGoal) || 10,
    weight: raw.weight ? parseFloat(raw.weight) : undefined,
    tempo: raw.tempo || undefined,
    restTime: raw.restTime || raw.restPeriod ? parseInt(raw.restTime || raw.restPeriod) : undefined,
    notes: raw.notes || raw.intensityGuideline || undefined,
  };
}

/**
 * Extract exercises from free-text numbered/bulleted lines
 */
function extractExerciseLines(text: string): WorkoutExerciseTransfer[] {
  const results: WorkoutExerciseTransfer[] = [];

  // Split into lines
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match patterns like:
    // "1. Exercise Name - 4 sets x 8 reps"
    // "- Exercise Name: 3x10 @ 135lbs"
    // "**Exercise Name** — 4 sets of 12"
    const exerciseMatch = trimmed.match(
      /^(?:\d+[\.\)]\s*|[-•]\s*|\*\*)?([A-Z][A-Za-z\s\-'()]+?)(?:\*\*)?(?:\s*[-—:]\s*|\s+)(\d+)\s*(?:sets?\s*(?:x|×|of)\s*|\s*x\s*)(\d+)\s*(?:reps?)?/i
    );

    if (exerciseMatch) {
      const exercise: WorkoutExerciseTransfer = {
        exerciseName: exerciseMatch[1].trim().replace(/\*\*/g, ''),
        sets: parseInt(exerciseMatch[2]),
        reps: parseInt(exerciseMatch[3]),
      };

      // Extract weight: "@ 185 lbs" or "185lbs" or "185 pounds"
      const weightMatch = trimmed.match(/(?:@\s*)?(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kg)/i);
      if (weightMatch) exercise.weight = parseFloat(weightMatch[1]);

      // Extract tempo: "tempo 3/1/2" or "2/0/2/0"
      const tempoMatch = trimmed.match(/(?:tempo\s+)?(\d\/\d\/\d(?:\/\d)?)/i);
      if (tempoMatch) exercise.tempo = tempoMatch[1];

      // Extract rest: "60s rest" or "rest 90s" or "90 sec rest"
      const restMatch = trimmed.match(
        /(?:\brest\s*:?\s*(\d+)\s*(?:s|sec|secs|seconds?)\b|\b(\d+)\s*(?:s|sec|secs|seconds?)\b\s*rest\b)/i
      );
      if (restMatch) exercise.restTime = parseInt(restMatch[1] || restMatch[2]);

      results.push(exercise);
      continue;
    }

    // Simpler pattern: "Exercise Name (3x10)"
    const simpleMatch = trimmed.match(
      /^(?:\d+[\.\)]\s*|[-•]\s*|\*\*)?([A-Z][A-Za-z\s\-'()]+?)(?:\*\*)?[\s]*\((\d+)\s*[x×]\s*(\d+)\)/i
    );

    if (simpleMatch) {
      results.push({
        exerciseName: simpleMatch[1].trim().replace(/\*\*/g, ''),
        sets: parseInt(simpleMatch[2]),
        reps: parseInt(simpleMatch[3]),
      });
    }
  }

  return results;
}

/**
 * Dispatch the custom event to send exercises to WorkoutLogger
 */
export function dispatchApplyToLogger(exercises: WorkoutExerciseTransfer[]): void {
  const payload: WorkoutPlanTransfer = { exercises, source: 'ai-chat' };

  // Always store in sessionStorage as fallback (Logger may not be mounted yet)
  appendPendingWorkoutPlan(payload);

  // Dispatch event for immediate pickup if Logger is mounted
  window.dispatchEvent(new CustomEvent(APPLY_WORKOUT_EVENT, { detail: payload }));

  // Also dispatch navigation event so WorkoutsWorkspace can switch to Logger tab
  window.dispatchEvent(new Event(NAVIGATE_TO_LOGGER_EVENT));
}
