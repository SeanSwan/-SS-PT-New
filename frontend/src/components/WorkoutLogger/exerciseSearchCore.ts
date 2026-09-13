/**
 * exerciseSearchCore.ts — one pure exercise-search scorer (S03 / R-H13)
 * ─────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE DOES:
 *   Owns the ONLY matching/ranking implementation for the exercise library.
 *   The Vite module Worker (exerciseSearch.worker.ts) and the main-thread
 *   fallback (searchExercisesSync in exerciseSearchWorker.ts) both call
 *   searchExercises() from here — there is no second copy of the rules.
 *
 * MESSAGE PROTOCOL (revision + sequence aware):
 *   CACHE   { type:'CACHE', exercises, catalogRevision }
 *   SEARCH  { type:'SEARCH', query, category, catalogRevision, searchSequence }
 *   RESULTS { type:'RESULTS', exercises, query, category,
 *             catalogRevision, searchSequence }
 *   The hook accepts a RESULTS message only when BOTH the catalogRevision and
 *   the searchSequence still match its current pair, so a reply computed from
 *   an old catalog, an old query, an old category, or a terminated worker can
 *   never settle current state.
 *
 * KEY DECISIONS:
 *   - Blank query preserves catalog order. This is NOT alphabetical sorting;
 *     the caller's catalog order is the contract.
 *   - Ties keep stable catalog order (Array.prototype.sort is stable in the
 *     ES2020 target).
 *   - Every payload value is treated as unknown. Optional token fields are
 *     type-checked before any string method is used, so a malformed catalog
 *     member cannot throw inside a search.
 *
 * HOW IT FITS IN THE APP:
 *   exerciseSearch.worker.ts ─┐
 *   exerciseSearchWorker.ts ──┴─→ exerciseSearchCore.searchExercises()
 */

import type { ExerciseSlim } from './exerciseSearchWorker';

/** Existing cap for non-blank queries. Blank queries keep the whole category. */
export const EXERCISE_SEARCH_RESULT_CAP = 100;

export interface ExerciseSearchCacheMessage {
  type: 'CACHE';
  exercises: ExerciseSlim[];
  catalogRevision: number;
}

export interface ExerciseSearchRequestMessage {
  type: 'SEARCH';
  query: string;
  category: string | null;
  catalogRevision: number;
  searchSequence: number;
}

export interface ExerciseSearchResultsMessage {
  type: 'RESULTS';
  exercises: ExerciseSlim[];
  query: string;
  category: string | null;
  catalogRevision: number;
  searchSequence: number;
}

export type ExerciseSearchInboundMessage =
  | ExerciseSearchCacheMessage
  | ExerciseSearchRequestMessage;

/**
 * Normalize a category chip/payload value to the DB comparison form.
 * "Full Body" → "full_body"; "All" / blank / non-string → null (no filter).
 */
export function normalizeCategory(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
  if (!normalized || normalized === 'all') return null;
  return normalized;
}

/**
 * Fuzzy score for one target string:
 *   exact substring (highest) → word-initials → in-order character walk.
 * Returns 0 when the query does not match at all.
 */
export function fuzzyScore(query: string, target: unknown): number {
  if (typeof target !== 'string' || !target || !query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t.includes(q)) return 1000 - t.indexOf(q);

  const words = t.split(/[\s\-_/]+/);
  const initials = words.map(word => word[0] || '').join('');
  if (initials.includes(q)) return 500;

  let queryIndex = 0;
  let score = 0;
  let previousMatch = -1;
  for (let targetIndex = 0; targetIndex < t.length && queryIndex < q.length; targetIndex++) {
    if (t[targetIndex] === q[queryIndex]) {
      score += previousMatch === targetIndex - 1 ? 10 : 1;
      previousMatch = targetIndex;
      queryIndex++;
    }
  }
  return queryIndex === q.length ? score : 0;
}

/** Category membership using the same normalization on both sides. */
export function matchesCategory(exercise: ExerciseSlim, normalizedCategory: string | null): boolean {
  if (!normalizedCategory) return true;
  return normalizeCategory(exercise?.bodyPartCategory) === normalizedCategory;
}

/** name → weighted exerciseType → weighted primary muscle. */
function scoreExercise(exercise: ExerciseSlim, query: string): number {
  let best = fuzzyScore(query, exercise?.name);
  if (best === 0) best = fuzzyScore(query, exercise?.exerciseType) * 0.5;
  if (best === 0 && Array.isArray(exercise?.primaryMuscles)) {
    for (const muscle of exercise.primaryMuscles) {
      const muscleScore = fuzzyScore(query, muscle);
      if (muscleScore > best) best = muscleScore * 0.7;
    }
  }
  return best;
}

/**
 * The single shared search implementation.
 * Blank query → every category-matching row in catalog order (no cap).
 * Non-blank query → scored rows, stable on ties, capped at 100.
 */
export function searchExercises(
  rows: ExerciseSlim[] | null | undefined,
  query: string | null | undefined,
  category: string | null | undefined,
): ExerciseSlim[] {
  const source = Array.isArray(rows) ? rows : [];
  const normalizedCategory = normalizeCategory(category);
  const pool = source.filter(
    row => Boolean(row) && typeof row === 'object' && matchesCategory(row, normalizedCategory),
  );

  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (!trimmed) return pool;

  const scored: Array<{ exercise: ExerciseSlim; score: number }> = [];
  for (const exercise of pool) {
    const score = scoreExercise(exercise, trimmed);
    if (score > 0) scored.push({ exercise, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, EXERCISE_SEARCH_RESULT_CAP).map(entry => entry.exercise);
}

export interface ExerciseSearchWorkerState {
  /** Returns the reply to post back, or null when the message needs no reply. */
  handle: (message: unknown) => ExerciseSearchResultsMessage | null;
}

/** Worker-side catalog holder. Every reply echoes the request's revision pair. */
export function createExerciseSearchWorkerState(): ExerciseSearchWorkerState {
  let catalog: ExerciseSlim[] = [];

  return {
    handle(message: unknown): ExerciseSearchResultsMessage | null {
      if (!message || typeof message !== 'object') return null;
      const inbound = message as Partial<ExerciseSearchInboundMessage>;

      if (inbound.type === 'CACHE') {
        const next = (inbound as ExerciseSearchCacheMessage).exercises;
        catalog = Array.isArray(next) ? next : [];
        return null;
      }

      if (inbound.type === 'SEARCH') {
        const request = inbound as ExerciseSearchRequestMessage;
        return {
          type: 'RESULTS',
          exercises: searchExercises(catalog, request.query, request.category),
          query: typeof request.query === 'string' ? request.query : '',
          category: request.category ?? null,
          catalogRevision: request.catalogRevision,
          searchSequence: request.searchSequence,
        };
      }

      return null;
    },
  };
}
