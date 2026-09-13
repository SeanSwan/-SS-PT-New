/**
 * exerciseSearchWorker.ts
 * ─────────────────────────────────────────────────────────────
 * Worker boundary for client-side exercise search.
 *
 * WHAT THIS FILE DOES:
 *   Owns the ExerciseSlim wire type, constructs the Vite module Worker, and
 *   exposes the synchronous fallback used when a Worker cannot be created or
 *   when an owned Worker fails at runtime. The matching rules themselves live
 *   in exactly one place: exerciseSearchCore.ts.
 *
 * HOW IT FITS IN THE APP:
 *   useExerciseSearch hook → createExerciseSearchWorker() → module Worker
 *                          ↘ searchExercisesSync()       → shared core scorer
 *
 * MESSAGE PROTOCOL (owned by exerciseSearchCore.ts):
 *   Main → Worker: { type:'CACHE', exercises, catalogRevision }
 *   Main → Worker: { type:'SEARCH', query, category, catalogRevision,
 *                    searchSequence }
 *   Worker → Main: { type:'RESULTS', exercises, query, category,
 *                    catalogRevision, searchSequence }
 */

import { searchExercises } from './exerciseSearchCore';

export interface ExerciseSlim {
  id: string;
  name: string;
  exerciseKey: string;
  exerciseType: string;
  bodyPartCategory: string;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  difficulty: number;
  equipment?: string[];
  equipmentNeeded?: string[];
  source?: string;
  description?: string;
  videoUrl?: string | null;
  previewVideoUrl?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  catalogVideoSample?: {
    title?: string | null;
    source?: string | null;
    videoUrl?: string | null;
    thumbnailUrl?: string | null;
    durationSeconds?: number | null;
  } | null;
  defaultTempo?: string | null;
  defaultRestSeconds?: number | null;
  recommendedSets?: number | null;
  recommendedReps?: number | null;
  recommendedDuration?: number | null;
  restInterval?: number | null;
  optPhases?: Array<number | string>;
  nasmMovementPattern?: string | null;
  canBePerformedAtHome?: boolean;
  easyVariation?: string;
  hardVariation?: string;
  kneeMod?: string;
  shoulderMod?: string;
  ankleMod?: string;
  wristMod?: string;
  backMod?: string;
  elbowMod?: string;
  footMod?: string;
  hipMod?: string;
}

/**
 * Create and return the exercise-search module Worker.
 * Returns null when Workers are unavailable (SSR, CSP, jsdom without a
 * constructor) so the caller keeps the synchronous fallback path.
 *
 * A Worker created here is OWNED by the caller and must be terminated by it.
 * No Blob URL is created, so there is nothing to revoke.
 */
export function createExerciseSearchWorker(): Worker | null {
  try {
    return new Worker(new URL('./exerciseSearch.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
}

/**
 * Main-thread fallback: the SAME shared scorer the Worker uses, so worker and
 * fallback results cannot diverge.
 */
export function searchExercisesSync(
  exercises: ExerciseSlim[],
  query: string,
  category: string | null,
): ExerciseSlim[] {
  return searchExercises(exercises, query, category);
}

export type {
  ExerciseSearchCacheMessage,
  ExerciseSearchRequestMessage,
  ExerciseSearchResultsMessage,
  ExerciseSearchInboundMessage,
} from './exerciseSearchCore';
