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

import { getLocalIsoDate } from '../../../../../utils/localDate';

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
  /**
   * Parser may extract tempo as an "eccentric/pause/concentric" string
   * (e.g. "3/1/1"). If missing, the canonical mapper substitutes
   * `DEFAULT_TEMPO` so the log row always has a usable value.
   */
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

// ─────────────────────────────────────────────────────────────
// SECTION: Output type (mirrors adminClientService.logWorkout signature)
// ─────────────────────────────────────────────────────────────
export interface LogWorkoutPayloadSet {
  setNumber: number;
  reps: number;
  weight: number;
  rpe?: number;
  notes?: string;
  /**
   * Phase 13 (2026-04-15): canonical tempo on every transcript-applied set.
   * The backend accepts tempo already ([workoutLogService.mjs:110]), the
   * transcript lane just wasn't feeding it. Parser tempo wins when present;
   * otherwise the mapper substitutes `DEFAULT_TEMPO` so admin history tables
   * (and future anatomy/tempo analytics) always have a value.
   */
  tempo?: string;
}

export interface LogWorkoutPayloadExercise {
  name: string;
  sets: LogWorkoutPayloadSet[];
  /**
   * Phase 15.0 (2026-04-15): exercise-level coaching note (e.g.
   * "knees caved on last set" or "shoulder clicking on dumbbell bench").
   * The backend service stamps this on EVERY row of the exercise group
   * so deleting any single set preserves the note on the remaining rows.
   *
   * Replaces the Phase 13.2 set-1-encoded `Coach: ` marker, which had
   * two real correctness bugs:
   *   1. Deleting set 1 in the admin edit flow silently lost the note.
   *   2. A legitimate trainer-authored set note starting with `Coach: `
   *      could be misclassified as an exercise note on read.
   */
  exerciseNote?: string;
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
  /**
   * Phase 13 (2026-04-15): hard override for the session date.
   * When set, this value wins over both `parsed.date` and `fallbackDate` —
   * used by the Coach Assistant review card so a user-corrected date
   * reaches the backend even when the parser also extracted a date.
   */
  targetDate?: string;
}

const DEFAULT_TITLE = 'Voice Memo Workout';
const DEFAULT_DURATION_MINUTES = 50;
const DEFAULT_INTENSITY = 5;
/**
 * Phase 13 (2026-04-15): canonical default tempo for transcript-applied sets.
 * Represents eccentric/pause/concentric in seconds. "1/1/0" is the NASM
 * baseline for general strength sets with no held pause and a fast concentric,
 * which matches the intent of a manually logged workout where the coach did
 * not dictate an explicit tempo.
 */
export const DEFAULT_TEMPO = '1/1/0';

/**
 * Phase 13.2 separator — LEGACY READ-ONLY.
 *
 * Phase 15.0 (2026-04-15) replaced this fragile set-1-encoding contract
 * with a dedicated `workout_logs.exerciseNote` column, stamped on every
 * row of an exercise group. The mapper no longer emits this separator
 * on write. It remains exported because `WorkoutHistoryPanel` needs a
 * single source of truth for the literal marker string when it reads
 * legacy rows.
 *
 * Phase 15.1 scope clarification: ONLY the unambiguous SEPARATOR form
 * of Phase 13.2 data is auto-recoverable on read:
 *
 *     "<set note> · Coach: <exercise note>"   ← split + lazy-migrated on edit
 *     "Coach: <text>"                         ← NOT touched, rendered verbatim
 *
 * Bare `Coach: ` prefixed notes (where Phase 13.2 set 1 had no own set
 * note) are intentionally left alone. A legitimate trainer-authored set
 * note that starts with `Coach:` is indistinguishable from such a
 * legacy row by text alone, so promoting it would reintroduce the same
 * misclassification bug Phase 15.0 was built to kill. Legacy rows of
 * that shape will show their `Coach:` prefix in the set-note slot
 * until an explicit maintenance pass handles them.
 *
 * **Do not use this separator for new writes.** The Phase 15 mapper
 * writes `exerciseNote` as its own top-level field on the exercise.
 */
export const EXERCISE_NOTE_SEPARATOR = ' · Coach: ';

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────
// Phase 13.1 (2026-04-15): use local-calendar helper, NOT UTC. The prior
// `toISOString().split` returned tomorrow for PDT users after ~5pm local.
function todayIsoDate(): string {
  return getLocalIsoDate();
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

  // targetDate is a hard override (Phase 13): when set it beats BOTH the
  // parser-extracted date and the fallback. Order: targetDate > parser > fallback.
  const targetDate = options.targetDate && options.targetDate.trim() ? options.targetDate.trim() : undefined;
  const date = targetDate
    ? targetDate
    : (parsed.date && parsed.date.trim() ? parsed.date.trim() : fallbackDate);
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
        // Phase 13: preserve parser-extracted tempo when present, otherwise
        // substitute the canonical default. Backend accepts `tempo` already.
        set.tempo = typeof s.tempo === 'string' && s.tempo.trim() ? s.tempo.trim() : DEFAULT_TEMPO;
        return set;
      });

      // Phase 15.0 (2026-04-15): preserve `performanceNotes` as a
      // first-class `exerciseNote` field on the exercise. The backend
      // service stamps it on every row of the group, so deleting any
      // single set no longer loses the note.
      //
      // Set-level notes stay in `set.notes` unchanged — a legitimate
      // trainer-authored set note that starts with `Coach: ` is no
      // longer reclassified, because read-path code reads the
      // dedicated column directly.
      const exerciseNote =
        typeof ex.performanceNotes === 'string' && ex.performanceNotes.trim()
          ? ex.performanceNotes.trim()
          : undefined;

      const out: LogWorkoutPayloadExercise = {
        name: ex.exerciseName.trim(),
        sets: denseSets,
      };
      if (exerciseNote) out.exerciseNote = exerciseNote;
      return out;
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
