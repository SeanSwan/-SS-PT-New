/**
 * ============================================================================
 * FILE: parsedWorkoutToLogPayload.ts
 * PURPOSE: Pure mapper from /api/workout-logs/upload parsed shape to the
 *          canonical adminClientService.logWorkout payload shape.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-14
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Converts the `parsedWorkout` returned by `POST /api/workout-logs/upload`
 * into the exact payload shape accepted by `adminClientService.logWorkout`,
 * which posts to `POST /api/admin/clients/:clientId/workouts`.
 *
 * WHY IT EXISTS:
 * Both `WorkoutLoggerModal` and the new Coach Assistant transcript intake
 * need to turn a parsed workout into a canonical log payload. Extracting
 * the mapping into one pure function prevents drift between the two
 * code paths and makes the conversion unit-testable in isolation.
 *
 * INPUT (from backend/routes/workoutLogUploadRoutes.mjs response):
 *   {
 *     exercises: [{
 *       exerciseName: string,
 *       sets: [{ setNumber, weight, reps, rpe?, formQuality?, notes? }],
 *       formRating?: number,
 *       painLevel?: number,
 *       performanceNotes?: string,
 *     }],
 *     sessionNotes?: string,
 *     overallIntensity?: number,
 *     painFlags?: Array<{ bodyRegion, side, mention }>,
 *     confidence?: number,
 *     date?: string,
 *   }
 *
 * OUTPUT (matches adminClientService.logWorkout signature at line 497):
 *   {
 *     title: string,
 *     date: 'YYYY-MM-DD',
 *     duration: number,
 *     intensity: number,
 *     notes?: string,
 *     exercises: [{
 *       name: string,
 *       sets: [{ setNumber, reps, weight, rpe?, notes? }]
 *     }]
 *   }
 *
 * The backend's `logWorkout` endpoint requires title, date, duration, and
 * intensity. The parser does not always return all four, so this mapper
 * applies safe fallbacks when the parser is silent — same defaults the
 * existing WorkoutLoggerModal voice-mode prefill uses.
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Input types (mirrors VoiceMemoUpload.tsx ParsedWorkout shape)
// ─────────────────────────────────────────────────────────────
export interface ParsedSet {
  setNumber: number;
  weight: number | null;
  reps: number;
  rpe?: number;
  formQuality?: number;
  notes?: string;
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

// ─────────────────────────────────────────────────────────────
// SECTION: Output type (mirrors adminClientService.logWorkout signature)
// ─────────────────────────────────────────────────────────────
export interface LogWorkoutPayloadSet {
  setNumber: number;
  reps: number;
  weight: number;
  rpe?: number;
  notes?: string;
}

export interface LogWorkoutPayloadExercise {
  name: string;
  sets: LogWorkoutPayloadSet[];
}

export interface LogWorkoutPayload {
  title: string;
  date: string;
  duration: number;
  intensity: number;
  notes?: string;
  exercises: LogWorkoutPayloadExercise[];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Mapper options
// ─────────────────────────────────────────────────────────────
export interface MapperOptions {
  /** Used when the parser does not extract a title. */
  fallbackTitle?: string;
  /** Used when the parser does not extract a date. */
  fallbackDate?: string;
  /** Used when the parser does not extract duration (minutes). */
  fallbackDurationMinutes?: number;
  /** Used when the parser does not extract intensity (1-10). */
  fallbackIntensity?: number;
}

const DEFAULT_TITLE = 'Voice Memo Workout';
const DEFAULT_DURATION_MINUTES = 50;
const DEFAULT_INTENSITY = 5;

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────
function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function clampIntensity(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (value < 1) return 1;
  if (value > 10) return 10;
  return Math.round(value);
}

function clampDuration(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.round(value);
}

// ─────────────────────────────────────────────────────────────
// SECTION: Main mapper
// ─────────────────────────────────────────────────────────────
/**
 * Convert a parsed workout from the upload endpoint into the canonical
 * `logWorkout` payload shape accepted by `POST /api/admin/clients/:id/workouts`.
 *
 * Behavior contract:
 * - Drops parsed exercises with empty/blank exerciseName (parser sometimes
 *   returns "" for low-confidence rows — those would fail backend validation).
 * - Drops sets with zero/null reps AND zero/null weight (parser can emit
 *   placeholder rows; the backend rejects sets with no real work).
 * - Coerces null weight to 0 so the canonical shape has number | 0, never null.
 * - Renumbers setNumber sequentially after filtering so the output is dense.
 * - Applies fallback title/date/duration/intensity ONLY when the parser is
 *   silent. Caller-supplied fallbacks override the built-in defaults.
 */
export function parsedWorkoutToLogPayload(
  parsed: ParsedWorkout,
  options: MapperOptions = {},
): LogWorkoutPayload {
  const fallbackTitle = options.fallbackTitle?.trim() || DEFAULT_TITLE;
  const fallbackDate = options.fallbackDate || todayIsoDate();
  const fallbackDuration = options.fallbackDurationMinutes ?? DEFAULT_DURATION_MINUTES;
  const fallbackIntensity = options.fallbackIntensity ?? DEFAULT_INTENSITY;

  const date = parsed.date && parsed.date.trim() ? parsed.date.trim() : fallbackDate;
  const intensity = clampIntensity(parsed.overallIntensity, fallbackIntensity);
  const duration = clampDuration(undefined, fallbackDuration);
  const notes = parsed.sessionNotes?.trim() || undefined;

  const exercises: LogWorkoutPayloadExercise[] = (parsed.exercises ?? [])
    .filter((ex) => ex && typeof ex.exerciseName === 'string' && ex.exerciseName.trim().length > 0)
    .map((ex) => {
      const filteredSets = (ex.sets ?? []).filter((s) => {
        const reps = typeof s.reps === 'number' ? s.reps : 0;
        const weight = typeof s.weight === 'number' ? s.weight : 0;
        // Drop rows with no real work — backend rejects sets that have neither weight nor reps.
        return reps > 0 || weight > 0;
      });

      const denseSets: LogWorkoutPayloadSet[] = filteredSets.map((s, idx) => {
        const set: LogWorkoutPayloadSet = {
          setNumber: idx + 1,
          reps: typeof s.reps === 'number' ? s.reps : 0,
          weight: typeof s.weight === 'number' && s.weight !== null ? s.weight : 0,
        };
        if (typeof s.rpe === 'number' && s.rpe > 0) set.rpe = s.rpe;
        if (typeof s.notes === 'string' && s.notes.trim()) set.notes = s.notes.trim();
        return set;
      });

      return {
        name: ex.exerciseName.trim(),
        sets: denseSets,
      };
    })
    .filter((ex) => ex.sets.length > 0); // Drop exercises whose sets all got filtered out.

  return {
    title: fallbackTitle,
    date,
    duration,
    intensity,
    ...(notes ? { notes } : {}),
    exercises,
  };
}
