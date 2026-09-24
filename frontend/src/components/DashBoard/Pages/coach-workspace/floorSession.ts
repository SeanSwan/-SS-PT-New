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
/** The booked session a Floor save completes (Today's session card) — the logger's scheduledSessionId. */
export type FloorLink = { scheduledSessionId: string; date: string; startsAt: string };
/** The plan day Floor was seeded from, so the save can prove it is still today's assignment. */
export type FloorPlanDay = { weekNumber: number; dayNumber: number };

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

const KG = 'kg|kgs|kilos?|kilograms?';
const UNIT = `(?:lbs?|pounds?|${KG})`;
const NUM = '\\d{1,4}(?:\\.\\d)?';
const KG_WORD = new RegExp(`(?:^|[^a-z])(?:${KG})(?![a-z])`);
const LB_PER_KG = 2.2046226218;

/**
 * A set spoken or typed on the floor: "145 for 6", "145 x 6", "145 × 6",
 * "6 reps at 145", "6 at 145 lb", "100 kg for 5". The dials are pounds, so a
 * weight said in kilograms is CONVERTED (100 kg → 220.5 lb, nearest half pound);
 * a unit is never dropped. A kilogram word that is not attached to the weight
 * ("100 for 5 kg") is refused rather than guessed. Numbers only — never words.
 */
export function parseSetUtterance(text: string): FloorSet | null {
  return parseSet(text.toLowerCase().replace(/,/g, ' '))?.set ?? null;
}

/** The kilograms a set was said in, for the "from 100 kg" note — null when it was pounds or unitless. */
export function spokenKilograms(text: string): number | null {
  return parseSet(text.toLowerCase().replace(/,/g, ' '))?.kg ?? null;
}

const WHOLE = new RegExp(`^(?:${NUM}\\s*${UNIT}?\\s*(?:for|x|×|by)\\s*\\d{1,3}(?:\\s*reps?)?|\\d{1,3}\\s*(?:reps?|times)?\\s*(?:at|@)\\s*${NUM}\\s*${UNIT}?)\\s*[.!]?$`);

/**
 * The WHOLE text is a set and nothing else ("145 for 6", "145 x 6 lbs.") — the
 * only shape the Floor composer may turn into a set instead of a chat message.
 * "Log bench 4x8 at 185" or "What about 3x10 for Jesse?" stay messages.
 */
export function wholeSetUtterance(text: string): FloorSet | null {
  const value = text.toLowerCase().replace(/,/g, ' ').trim();
  return WHOLE.test(value) ? parseSet(value)?.set ?? null : null;
}

const REPS_FIRST = new RegExp(`\\b(\\d{1,3})\\s*(?:reps?|times)\\s*(?:at|with|@)\\s*(${NUM})\\s*(${UNIT})?(?![a-z\\d])`);
const REPS_AT = new RegExp(`\\b(\\d{1,2})\\s*(?:at|@)\\s*(\\d{2,4}(?:\\.\\d)?)\\s*(${UNIT})?(?![a-z\\d])`);
const WEIGHT_FIRST = new RegExp(`\\b(${NUM})\\s*(${UNIT})?\\s*(?:for|x|×|by)\\s*(\\d{1,3})\\b`);

function parseSet(value: string): { set: FloorSet; kg: number | null } | null {
  const repsFirst = REPS_FIRST.exec(value) ?? REPS_AT.exec(value);
  if (repsFirst) return withUnit(value, Number(repsFirst[2]), repsFirst[3], Number(repsFirst[1]));
  const weightFirst = WEIGHT_FIRST.exec(value);
  return weightFirst ? withUnit(value, Number(weightFirst[1]), weightFirst[2], Number(weightFirst[3])) : null;
}

function withUnit(value: string, weight: number, unit: string | undefined, reps: number): { set: FloorSet; kg: number | null } | null {
  const inKg = Boolean(unit && new RegExp(`^(?:${KG})$`).test(unit));
  if (!inKg && KG_WORD.test(value)) return null; // a kilogram word the weight does not carry: refuse, never guess
  const set = valid(inKg ? weight * LB_PER_KG : weight, reps);
  return set ? { set, kg: inKg ? weight : null } : null;
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

/**
 * After a save lands, drop exactly what it carried: per exercise, the submitted
 * sets that still lead that exercise's list (compared by value — a remount
 * rebuilds the objects from storage). Sets saved on the floor WHILE the request
 * was out stay, so they go in the next save instead of vanishing.
 */
export function reconcileAfterSave(current: ReadonlyArray<FloorExercise>, sent: ReadonlyArray<FloorExercise>): FloorExercise[] {
  return current.map((exercise, index) => {
    const before = sent[index];
    if (!before || before.name !== exercise.name) return exercise;
    let kept = 0;
    while (kept < before.sets.length && exercise.sets[kept]
      && exercise.sets[kept].weight === before.sets[kept].weight && exercise.sets[kept].reps === before.sets[kept].reps) kept += 1;
    return kept ? { ...exercise, sets: exercise.sets.slice(kept) } : exercise;
  });
}

export type FloorAccess = 'open' | 'checking' | 'closed';
const CLOSED = new Set(['invalid', 'denied', 'unavailable', 'blocked-return', 'retired']);

/**
 * Floor opens a client's stored sets only once the SAME admission the chat uses
 * has accepted that client. Checking, refused or another target → nothing from
 * this device is shown (the drafts stay stored for when access returns).
 */
export function floorAccess(args: { clientMode: boolean; clientId: number | null; phase?: string | null; acceptedTargetUserId?: number | string | null }): FloorAccess {
  if (args.clientMode) return 'open';
  if (args.phase && CLOSED.has(args.phase)) return 'closed';
  const accepted = args.acceptedTargetUserId == null ? null : Number(args.acceptedTargetUserId);
  return args.phase === 'ready' && args.clientId !== null && accepted === args.clientId ? 'open' : 'checking';
}

