/**
 * FILE: floorSession.ts
 * PURPOSE: The pure half of Floor mode — reading a plan's set scheme, hearing a
 * set in a sentence ("145 for 6"), and turning the sets a coach saved on the
 * floor into the SAME ExerciseEntry[] the Workout Logger submits, so a Floor
 * session lands in the canonical workout log through the canonical payload
 * builder (workoutLoggerSubmitPayload.ts), never a parallel write path.
 */
import type { ExerciseEntry } from '../../../../services/nasmApiService';

export type FloorSet = { weight: number; reps: number };
export type FloorExercise = { name: string; targetSets: number | null; targetReps: number | null; sets: FloorSet[] };

const clampWeight = (value: number) => Math.max(0, Math.min(2000, Math.round(value * 2) / 2));
const clampReps = (value: number) => Math.max(0, Math.min(200, Math.round(value)));
export const nextWeight = (weight: number, delta: number) => clampWeight(weight + delta);
export const nextReps = (reps: number, delta: number) => clampReps(reps + delta);

/** "3 × 10", "3x10", "4 x 8-10", "3 sets" → targets; distances and times ("2 × 400m", "3 x 30s") are not reps. */
export function parseSetScheme(scheme: string | null | undefined): { sets: number | null; reps: number | null } {
  const value = String(scheme ?? '');
  const both = /(\d{1,2})\s*[×x*]\s*(\d{1,3})(?![\d.])(?!\s*(?:m|s|sec|secs|min|mins|yd|yds|ft|km|mi|k)\b|\s*["'’])/i.exec(value);
  if (both) return { sets: Number(both[1]), reps: Number(both[2]) };
  const timed = /(\d{1,2})\s*[×x*]\s*\d/i.exec(value);
  if (timed) return { sets: Number(timed[1]), reps: null };
  const setsOnly = /(\d{1,2})\s*sets?\b/i.exec(value);
  return { sets: setsOnly ? Number(setsOnly[1]) : null, reps: null };
}

/**
 * A set spoken or typed on the floor: "145 for 6", "145 x 6", "145 × 6",
 * "6 reps at 145", "6 at 145 lb". Weight first unless the reps are named.
 * Numbers only — never a guess from words.
 */
export function parseSetUtterance(text: string): FloorSet | null {
  const value = text.toLowerCase().replace(/,/g, ' ');
  return parseSet(value);
}

/**
 * The WHOLE text is a set and nothing else ("145 for 6", "145 x 6 lbs.") — the
 * only shape the Floor composer may turn into a set instead of a chat message.
 * "Log bench 4x8 at 185" or "What about 3x10 for Jesse?" stay messages.
 */
export function wholeSetUtterance(text: string): FloorSet | null {
  const value = text.toLowerCase().replace(/,/g, ' ').trim();
  const whole = /^(?:\d{1,4}(?:\.\d)?\s*(?:lbs?|pounds|kg)?\s*(?:for|x|×|by)\s*\d{1,3}(?:\s*reps?)?|\d{1,3}\s*(?:reps?|times)?\s*(?:at|@)\s*\d{1,4}(?:\.\d)?\s*(?:lbs?|pounds|kg)?)\s*[.!]?$/;
  return whole.test(value) ? parseSet(value) : null;
}

function parseSet(value: string): FloorSet | null {
  const repsFirst = /\b(\d{1,3})\s*(?:reps?|times)\s*(?:at|with|@)\s*(\d{1,4}(?:\.\d)?)\b/.exec(value)
    ?? /\b(\d{1,2})\s*(?:at|@)\s*(\d{2,4}(?:\.\d)?)\s*(?:lbs?|pounds|kg)?\b/.exec(value);
  if (repsFirst) return valid(Number(repsFirst[2]), Number(repsFirst[1]));
  const weightFirst = /\b(\d{1,4}(?:\.\d)?)\s*(?:lbs?|pounds|kg)?\s*(?:for|x|×|by)\s*(\d{1,3})\b/.exec(value);
  return weightFirst ? valid(Number(weightFirst[1]), Number(weightFirst[2])) : null;
}

function valid(weight: number, reps: number): FloorSet | null {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || reps < 1 || reps > 200 || weight < 0 || weight > 2000) return null;
  return { weight: clampWeight(weight), reps: clampReps(reps) };
}

/** Exercises the coach actually logged, in the Workout Logger's own shape. */
export function floorExerciseEntries(exercises: ReadonlyArray<FloorExercise>): ExerciseEntry[] {
  return exercises
    .filter((exercise) => exercise.name.trim() && exercise.sets.length > 0)
    .map((exercise, index) => ({
      exerciseId: `floor-${index + 1}`,
      exerciseName: exercise.name.trim(),
      sets: exercise.sets.map((set, setIndex) => ({
        setNumber: setIndex + 1, weight: set.weight, reps: set.reps, rpe: null, restTime: 0, formQuality: null, setType: 'working' as const,
      })),
      formRating: null,
      painLevel: 0,
      performanceNotes: '',
    }));
}

export const loggedSetCount = (exercises: ReadonlyArray<FloorExercise>) => exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);

/** The local calendar day, YYYY-MM-DD — what the logger stores a workout under. */
export function localDateISO(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export const floorStorageKey = (actorKey: string, clientId: number) => `swan-coach:floor:v2:${actorKey}:${clientId}`;
