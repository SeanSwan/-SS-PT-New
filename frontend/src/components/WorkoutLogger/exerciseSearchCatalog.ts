/**
 * exerciseSearchCatalog.ts — exercise-library payload normalization (S03 / R-H13)
 * ──────────────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE DOES:
 *   Turns an untrusted `/api/exercises/library` payload into ExerciseSlim rows.
 *   Every media and logging-default field the Rolodex preview depends on is
 *   carried through here unchanged in meaning:
 *     videoUrl, previewVideoUrl, imageUrl, thumbnailUrl, catalogVideoSample,
 *     defaultTempo, defaultRestSeconds, recommendedSets, recommendedReps,
 *     recommendedDuration, restInterval, optPhases, nasmMovementPattern,
 *     canBePerformedAtHome (plus the description/variation/modifier text).
 *
 * WHY IT IS ITS OWN MODULE:
 *   The lifecycle hook owns fetch/query/search sequencing. Keeping the payload
 *   mapping here keeps useExerciseSearch.ts inside the repository's 300-line
 *   maintainability cap. Behaviour is unchanged from the pre-S03 hook.
 *
 * HARD RULES:
 *   - A malformed array member (null, array, primitive) is DROPPED, never
 *     coerced into a fake "Unknown Exercise" row.
 *   - String-array fields keep only non-empty strings, so no consumer can call
 *     a string method on a number.
 *   - No new metadata defaults and no global type changes are introduced.
 *
 * HOW IT FITS IN THE APP:
 *   useExerciseSearch() → normalizeExerciseCatalog(payload.exercises)
 */

import type { ExerciseSlim } from './exerciseSearchWorker';

const toOptionalString = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim() ? value : undefined
);

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value);
  return undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

/** String arrays only. A JSON-encoded string is decoded for legacy rows. */
function toStringArray(value: unknown): string[] {
  const keepStrings = (entries: unknown[]): string[] =>
    entries.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);

  if (Array.isArray(value)) return keepStrings(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return keepStrings(parsed);
    } catch {
      return [trimmed];
    }
    return [trimmed];
  }
  return [];
}

/** optPhases legitimately carries numbers as well as phase names. */
function toPhaseArray(value: unknown): Array<number | string> {
  const keepPhases = (entries: unknown[]): Array<number | string> =>
    entries.filter((entry): entry is number | string =>
      (typeof entry === 'number' && Number.isFinite(entry)) ||
      (typeof entry === 'string' && entry.length > 0));

  if (Array.isArray(value)) return keepPhases(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return keepPhases(parsed);
    } catch {
      return [trimmed];
    }
    return [trimmed];
  }
  return [];
}

function toCatalogVideoSample(value: unknown): ExerciseSlim['catalogVideoSample'] {
  if (!isRecord(value)) return null;
  return {
    title: toOptionalString(value.title) ?? null,
    source: toOptionalString(value.source) ?? null,
    videoUrl: toOptionalString(value.videoUrl) ?? null,
    thumbnailUrl: toOptionalString(value.thumbnailUrl) ?? null,
    durationSeconds: toOptionalNumber(value.durationSeconds) ?? null,
  };
}

/**
 * Normalize one row. Returns null for anything that is not a plain object so
 * the caller can drop it instead of inventing a placeholder exercise.
 */
function toExerciseSlim(row: unknown): ExerciseSlim | null {
  if (!isRecord(row)) return null;
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? 'Unknown Exercise'),
    exerciseKey: String(row.exerciseKey ?? row.id ?? ''),
    exerciseType: String(row.exerciseType ?? 'exercise'),
    bodyPartCategory: String(row.bodyPartCategory ?? 'Full Body'),
    primaryMuscles: toStringArray(row.primaryMuscles),
    secondaryMuscles: toStringArray(row.secondaryMuscles),
    difficulty: Number(row.difficulty) || 1,
    equipment: toStringArray(row.equipment),
    equipmentNeeded: toStringArray(row.equipmentNeeded),
    source: String(row.source ?? 'swanstudios'),
    description: toOptionalString(row.description),
    videoUrl: toOptionalString(row.videoUrl),
    previewVideoUrl: toOptionalString(row.previewVideoUrl),
    imageUrl: toOptionalString(row.imageUrl),
    thumbnailUrl: toOptionalString(row.thumbnailUrl),
    catalogVideoSample: toCatalogVideoSample(row.catalogVideoSample),
    defaultTempo: toOptionalString(row.defaultTempo),
    defaultRestSeconds: toOptionalNumber(row.defaultRestSeconds),
    recommendedSets: toOptionalNumber(row.recommendedSets),
    recommendedReps: toOptionalNumber(row.recommendedReps),
    recommendedDuration: toOptionalNumber(row.recommendedDuration),
    restInterval: toOptionalNumber(row.restInterval),
    optPhases: toPhaseArray(row.optPhases),
    nasmMovementPattern: toOptionalString(row.nasmMovementPattern),
    canBePerformedAtHome: Boolean(row.canBePerformedAtHome),
    easyVariation: toOptionalString(row.easyVariation),
    hardVariation: toOptionalString(row.hardVariation),
    kneeMod: toOptionalString(row.kneeMod),
    shoulderMod: toOptionalString(row.shoulderMod),
    ankleMod: toOptionalString(row.ankleMod),
    wristMod: toOptionalString(row.wristMod),
    backMod: toOptionalString(row.backMod),
    elbowMod: toOptionalString(row.elbowMod),
    footMod: toOptionalString(row.footMod),
    hipMod: toOptionalString(row.hipMod),
  };
}

/** Normalize a whole catalog, dropping malformed members. */
export function normalizeExerciseCatalog(rows: unknown): ExerciseSlim[] {
  if (!Array.isArray(rows)) return [];
  const exercises: ExerciseSlim[] = [];
  for (const row of rows) {
    const exercise = toExerciseSlim(row);
    if (exercise) exercises.push(exercise);
  }
  return exercises;
}
