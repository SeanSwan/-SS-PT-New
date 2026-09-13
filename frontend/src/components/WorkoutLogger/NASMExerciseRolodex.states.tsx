/**
 * COMPONENT: NASMExerciseRolodex library recovery states
 * OWNER: WorkoutLogger / NASM Exercise Rolodex (S04 / R-H13 consumer portion)
 * PURPOSE: Turn the S03 hook's honest load state into visible, actionable
 *          states for the logger's exercise library, so a failed or empty
 *          library never masquerades as "no matches".
 *
 * WHY THIS IS ITS OWN MODULE:
 *   NASMExerciseRolodex.tsx is at the 300-line maintainability cap. The state
 *   decision is a pure function so it can be unit-tested without a DOM.
 *
 * STATES (s04-architecture.md §"All four consumers distinguish these states"):
 *   loading       initial fetch, nothing to show yet
 *   error         initial fetch failed and there is no catalog
 *   empty-catalog catalog loaded successfully and is genuinely empty
 *   filter-empty  catalog has rows, the current filters match none
 *   refreshing    cached catalog visible, refetch in flight (rows preserved)
 *   stale         cached catalog visible, last refresh failed (rows preserved)
 *   ready         rows visible
 *
 * KEY DECISIONS:
 *   - `ready` and `refreshing` render NO notice: cached rows stay on screen and
 *     are never replaced by a skeleton.
 *   - Only the initial actionable failure uses role="alert". Everything else is
 *     a polite live region, so typing never re-announces an error.
 *   - Retry is disabled while a fetch is in flight.
 *   - `loadState` is optional: the component tolerates hook boundary fixtures
 *     that predate S03 and derives the same answer from isLoading + counts.
 */

import React from 'react';
import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';
import { RetryButton } from './ExerciseSetRowControls.styles';
import {
  LIBRARY_COPY,
  resolveLibraryState,
  type ExerciseLibraryState,
} from './exerciseSearchLibraryState';

// The state decision and its copy live in one shared module so the logger, the
// Planner V1/V2 rolodex and the Bootcamp library cannot drift apart.
export { LIBRARY_COPY, resolveLibraryState };
export type RolodexLibraryState = ExerciseLibraryState;

// ── styles ───────────────────────────────────────────────────────────────────

const NoticeShell = styled.div`
  display: grid;
  gap: 8px;
  justify-items: center;
  width: 100%;
  padding: 18px 14px;
  text-align: center;
  color: ${CS.text};
`;

const NoticeTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  line-height: 1.25;
`;

const NoticeBody = styled.p`
  max-width: 320px;
  margin: 0;
  color: ${CS.textSecondary};
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.4;
  overflow-wrap: anywhere;
`;

const NoticeActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
`;

const SkeletonStack = styled.div`
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 14px;
`;

const SkeletonBar = styled.div<{ $width: string }>`
  height: 10px;
  width: ${({ $width }) => $width};
  border-radius: 999px;
  background: ${withAlpha(CS.text, 0.1)};
`;

// ── notice ───────────────────────────────────────────────────────────────────

export interface RolodexLibraryNoticeProps {
  state: RolodexLibraryState;
  loadError?: string | null;
  refreshError?: string | null;
  hasActiveFilters: boolean;
  isBusy: boolean;
  onRetry: () => void;
  onClearFilters?: () => void;
}

export const RolodexLibraryNotice: React.FC<RolodexLibraryNoticeProps> = ({
  state,
  loadError,
  refreshError,
  hasActiveFilters,
  isBusy,
  onRetry,
  onClearFilters,
}) => {
  if (state === 'ready' || state === 'refreshing') return null;

  if (state === 'loading') {
    return (
      <NoticeShell role="status" aria-live="polite" data-testid="rolodex-library-loading">
        <SkeletonStack aria-hidden="true">
          <SkeletonBar $width="72%" />
          <SkeletonBar $width="56%" />
          <SkeletonBar $width="64%" />
        </SkeletonStack>
        <NoticeBody>{LIBRARY_COPY.loading}</NoticeBody>
      </NoticeShell>
    );
  }

  // Only the initial actionable failure interrupts; a stale-cache refresh
  // failure stays polite because rows are still usable on screen.
  const isBlockingError = state === 'error';

  return (
    <NoticeShell
      role={isBlockingError ? 'alert' : 'status'}
      aria-live={isBlockingError ? 'assertive' : 'polite'}
      data-testid={`rolodex-library-${state}`}
    >
      <NoticeTitle>
        {state === 'error' && LIBRARY_COPY.errorTitle}
        {state === 'empty-catalog' && LIBRARY_COPY.emptyCatalogTitle}
        {state === 'filter-empty' && LIBRARY_COPY.filterEmptyTitle}
        {state === 'stale' && LIBRARY_COPY.staleTitle}
      </NoticeTitle>

      <NoticeBody>
        {state === 'error' && (loadError || 'The exercise library failed to load.')}
        {state === 'empty-catalog' && LIBRARY_COPY.emptyCatalogBody}
        {state === 'filter-empty' && LIBRARY_COPY.filterEmptyBody}
        {state === 'stale' && (refreshError || LIBRARY_COPY.staleBody)}
      </NoticeBody>

      <NoticeActions>
        {state !== 'filter-empty' && (
          <RetryButton
            type="button"
            onClick={onRetry}
            disabled={isBusy}
            aria-busy={isBusy}
            data-testid="rolodex-library-retry"
          >
            {isBusy ? LIBRARY_COPY.retryBusy : LIBRARY_COPY.retry}
          </RetryButton>
        )}
        {state === 'filter-empty' && hasActiveFilters && onClearFilters && (
          <RetryButton type="button" onClick={onClearFilters} data-testid="rolodex-library-clear">
            {LIBRARY_COPY.clearFilters}
          </RetryButton>
        )}
      </NoticeActions>
    </NoticeShell>
  );
};

// ── status line ──────────────────────────────────────────────────────────────

export interface RolodexStatusTextProps {
  catalogCount: number;
  resultCount: number;
  query: string;
  isSearching: boolean;
  /** A previous count must not be announced as final while a search runs. */
  hasPendingSearch: boolean;
}

export const RolodexStatusText: React.FC<RolodexStatusTextProps> = ({
  catalogCount,
  resultCount,
  query,
  isSearching,
  hasPendingSearch,
}) => (
  <span data-testid="rolodex-status" aria-busy={isSearching}>
    {catalogCount} exercises
    {query && !hasPendingSearch && ` - ${resultCount} matching`}
    {query && hasPendingSearch && ' - searching…'}
    {isSearching && ` - ${LIBRARY_COPY.searchPending}`}
  </span>
);

export default RolodexLibraryNotice;
