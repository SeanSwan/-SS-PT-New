/**
 * exerciseSearchLibraryState.ts — shared library-state decision (S04 / R-H13)
 * ==========================================================================
 * ONE implementation of "what should the user be told about the exercise
 * library right now", consumed by every surface that renders search results:
 * the NASM logger rolodex, the Planner V1/V2 rolodex and the Bootcamp library.
 *
 * Keeping it out of the hook file is deliberate: the hook returns raw state
 * (`loadState`, `loadError`, `refreshError`, counts) and each consumer maps it
 * to its own chrome. Putting the mapping here means the four consumers cannot
 * drift into four different answers for the same underlying condition.
 *
 * STATES
 *   loading        initial fetch, nothing to show yet
 *   error          initial fetch failed and there is no catalog
 *   empty-catalog  catalog loaded successfully and is genuinely empty
 *   filter-empty   catalog has rows, the current filters match none
 *   refreshing     cached catalog visible, refetch in flight (rows preserved)
 *   stale          cached catalog visible, last refresh failed (rows preserved)
 *   ready          rows visible
 *
 * KEY DECISIONS
 *   - `ready` and `refreshing` render no notice: a usable cache is never
 *     replaced by a skeleton.
 *   - `stale` is decided BEFORE `refreshing`, so a failed refresh stays visible
 *     while a retry is running.
 *   - `loadState` is optional. Boundary fixtures that predate S03 (and any
 *     caller that only knows isLoading + counts) derive the same answer.
 */

import type { ExerciseSearchLoadState } from './useExerciseSearch';

export type ExerciseLibraryState =
  | 'loading'
  | 'error'
  | 'empty-catalog'
  | 'filter-empty'
  | 'refreshing'
  | 'stale'
  | 'ready';

export interface ResolveLibraryStateInput {
  loadState?: ExerciseSearchLoadState;
  isLoading: boolean;
  /** Rows in the accepted catalog, after any section/context filter. */
  catalogCount: number;
  /** Rows currently visible after every filter. */
  resultCount: number;
}

export function resolveLibraryState({
  loadState,
  isLoading,
  catalogCount,
  resultCount,
}: ResolveLibraryStateInput): ExerciseLibraryState {
  const hasCatalog = loadState
    ? loadState === 'ready' || loadState === 'empty' || loadState === 'stale'
    : !isLoading;

  if (!hasCatalog) {
    if (loadState === 'error') return 'error';
    return isLoading ? 'loading' : 'error';
  }

  // `stale` takes precedence again (round-2 review finding 3). Round 46 moved
  // `catalogCount === 0` above this and that was a REGRESSION: the logger passes
  // a SECTION-FILTERED count (NASMExerciseRolodex.tsx passes
  // filteredAllExercises.length), so a section that matches nothing made
  // catalogCount 0 with a NON-empty library — which (a) rendered `refreshError`
  // nowhere, because only 'stale' renders it, and (b) printed "The library
  // returned no exercises", which is false. The count cannot distinguish "no
  // library" from "nothing in this section", so it must not outrank a known
  // refresh failure.
  if (loadState === 'stale') return 'stale';
  // MUST precede `refreshing`: with no rows there is nothing to preserve, and
  // 'refreshing' renders NO notice — the Retry button lives inside that notice,
  // so returning it blanked the pane on the empty-catalog retry.
  if (catalogCount === 0) return 'empty-catalog';
  if (isLoading) return 'refreshing';
  if (resultCount === 0) return 'filter-empty';
  return 'ready';
}

/**
 * Shared, single-source copy so tests assert against the real strings.
 *
 * CORRECTED (hostile review). This block previously claimed `refreshing` was
 * "deliberately UNREACHABLE, not dead by accident". **That was false.** The state
 * is reachable whenever a catalog is on screen and a refetch is in flight — this
 * file's own test asserts `resolveLibraryState({loadState:'ready', isLoading:true,
 * catalogCount:3, resultCount:3}) === 'refreshing'`.
 *
 * The true statement is narrower: the `refreshing` STATE is reachable, but the
 * `refreshing` COPY has no consumer, because that state renders no notice — a
 * usable cache must not be replaced by a "please wait". The string is kept as the
 * wording for that notice if it is ever shown.
 */
export const LIBRARY_COPY = {
  loading: 'Loading exercise library…',
  errorTitle: 'Exercise library unavailable',
  emptyCatalogTitle: 'No exercises available yet',
  emptyCatalogBody: 'The library returned no exercises. Try again to reload it.',
  filterEmptyTitle: 'No exercises match current filters',
  filterEmptyBody: 'Adjust or clear the active filters to see more exercises.',
  refreshing: 'Updating library…',
  staleTitle: 'Library may be out of date',
  staleBody: 'Showing the exercises already loaded. Try again to refresh them.',
  searchPending: 'Searching…',
  retry: 'Try again',
  retryBusy: 'Retrying…',
  clearFilters: 'Clear filters',
} as const;
